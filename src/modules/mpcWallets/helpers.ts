import * as Models from "../../models/model/index";
import commonHelper from "../../helpers/common/common.helpers";
import { global_helper } from "../../helpers/common/global_helper";
import { coin_queries } from "../../helpers/dbHelper";
import { config } from "../../config/config";

class MpcWalletsHelpers {

  public async saveMpcWallets(mpcWalletData: any, userId: number) {
    try {
      const { wallet_address, btc_wallet_address, tics_wallet_address } = mpcWalletData;

      const [isValidBtc, isValidTics]: [boolean, boolean] = await Promise.all([
        global_helper.validate_address(btc_wallet_address, config.STATIC_COIN_FAMILY.BTC),
        global_helper.validate_address(tics_wallet_address, config.STATIC_COIN_FAMILY.TICS)
      ]);

      if (!isValidBtc || !isValidTics) {
        return {
          status: false,
          message: "Invalid wallet addresses",
        };
      }

      const wallet = await Models.WalletModel.findOne({
        attributes: ["wallet_id"],
        where: {
          user_id: userId,
          wallet_address: wallet_address
        },
        raw: true
      });

      if (!wallet) {
        return {
          status: false,
          message: "Wallet not found",
        };
      }

      // Prepare MPC wallet creation data for both BTC and TICS
      const mpcWalletsToCreate = [
        {
          wallet_id: wallet.wallet_id,
          user_id: userId,
          coin_family: config.STATIC_COIN_FAMILY.BTC,
          wallet_address: btc_wallet_address,
          balance: 0
        },
        {
          wallet_id: wallet.wallet_id,
          user_id: userId,
          coin_family: config.STATIC_COIN_FAMILY.TICS,
          wallet_address: tics_wallet_address,
          balance: 0
        }
      ];

      const [btcMpcWallet, ticsMpcWallet] = await Promise.all(
        mpcWalletsToCreate.map(data => Models.MpcWalletsModel.create(data))
      );

        return {
          status: true,
          message: "saved",
          btcMpcWallet,
          ticsMpcWallet
        };

    } catch (error: any) {
      console.error("Error in saveMpcWallets>>>>", error);
      await commonHelper.save_error_logs("saveMpcWallets", error?.message);
      return {
        status: false,
        message: "failed",
        error: error?.message
      };
    }
  }


private getCoinSymbol(coinFamily: number) {
  return coinFamily == config.STATIC_COIN_FAMILY.BTC ? "btc" : "tics";
}

private async fetchWalletBalanceWithTimeout(coinData: any, walletAddress: string) {
  let balance = "0";
  let rpcError = false;
  let rpcErrorMessage = "";

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("RPC_TIMEOUT")), 15000)
  );

  try {
    const balDetails: any = await Promise.race([
      global_helper.get_wallet_balance(coinData, walletAddress),
      timeoutPromise,
    ]);
    balance = balDetails?.status ? balDetails.balance : "0";
  } catch (err: any) {
    if (err && err.message === "RPC_TIMEOUT") {
      rpcError = true;
      rpcErrorMessage = "RPC not working";
      balance = "0";
    } else if (
      err.info &&
      typeof err.info.responseStatus === "string" &&
      err.info.responseStatus.includes("502 Bad Gateway")
    ) {
      rpcError = true;
      rpcErrorMessage = "RPC not working";
      balance = "0";
    } else {
      console.error("Error fetching balance for MPC wallet:", err);
      balance = "0";
    }
  }

  return { balance, rpcError, rpcErrorMessage };
}

// Helper to update balance in DB
private async updateMpcWalletBalance(walletId: number, coinFamily: number, walletAddress: string, balance: string) {
  Models.MpcWalletsModel.update(
    { balance },
    {
      where: {
        wallet_id: walletId,
        coin_family: coinFamily,
        wallet_address: walletAddress
      }
    }
  ).catch((err: any) => {
    console.error("Failed to update MPC wallet balance", err);
  });
}

// Main function
public async getMpcWallets(userId: number, wallet_address: string, coin_family: number ) {
  try {
    const walletData: any = await Models.WalletModel.findOne({
      where: {
        user_id: userId,
        wallet_address: wallet_address,
        coin_family: coin_family
      },
      attributes: [ "user_id", "coin_family", "wallet_address", "balance" ],
      include: [
        {
          model: Models.MpcWalletsModel,
          as: "mpcWallets"
        }
      ]
    });

    if (!walletData || !walletData.mpcWallets) {
      return {
        status: true,
        code: 200,
        data: []
      };
    }

    const updatedMpcWallets = await Promise.all(
      walletData.mpcWallets.map(async (mpcWallet: any) => {
        // Fetch coin data for this wallet
        const coinData = await coin_queries.coin_find_one(
          [
            "coin_id",
            "coin_family",
            "coin_symbol",
            "is_token",
            "token_address",
            "token_type",
          ],
          {
            coin_family: mpcWallet.coin_family,
            coin_symbol: this.getCoinSymbol(mpcWallet.coin_family)
          }
        );

        if (!coinData) {
          return {
            wallet_address: mpcWallet.wallet_address,
            coin_family: mpcWallet.coin_family,
            balance: mpcWallet.balance
          };
        }

        // Get wallet balance using helper with 10s timeout
        const { balance, rpcError, rpcErrorMessage } = await this.fetchWalletBalanceWithTimeout(
          coinData,
          mpcWallet.wallet_address
        );

        // Update balance in DB
        this.updateMpcWalletBalance(
          mpcWallet.wallet_id,
          mpcWallet.coin_family,
          mpcWallet.wallet_address,
          balance
        );

        // Prepare result
        const result: any = {
          wallet_address: mpcWallet.wallet_address,
          coin_family: mpcWallet.coin_family,
          balance: balance
        };
        if (rpcError) {
          result.message = rpcErrorMessage;
        }
        return result;
      })
    );

    // If any wallet had an RPC error, return with status true, code 200, message, and data (no nested data object)
    const anyRpcError = updatedMpcWallets.some((w: any) => w.message === "RPC not working");
    if (anyRpcError) {
      return {
         data : updatedMpcWallets
      };
    }

    // Normal success
    return {
     data : updatedMpcWallets
    };

  } catch (error: any) {
    if (
      error &&
      error.code === "SERVER_ERROR" &&
      error.info &&
      typeof error.info.responseStatus === "string" &&
      error.info.responseStatus.includes("502 Bad Gateway")
    ) {
      return {
        status: true,
        code: 200,
        message: "RPC not working",
        data: []
      };
    }
    if (error && error.message === "RPC_TIMEOUT") {
      return {
        status: true,
        code: 200,
        message: "RPC not working",
        data: []
      };
    }
    console.log("error", error);
    return {
      status: false,
      code: 500,
      message: "Error fetching MPC wallets",
      error: error?.message
    };
  }
}


}

export const mpcWalletsHelper = new MpcWalletsHelpers()
