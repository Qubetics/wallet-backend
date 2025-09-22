import * as Models from "../../models/model/index";
import commonHelper from "../../helpers/common/common.helpers";
import { global_helper } from "../../helpers/common/global_helper";
import { coin_queries } from "../../helpers/dbHelper";
import { config } from "../../config/config";
import { Op } from "sequelize";

class MpcWalletsHelpers {

  /**
   * Saves MPC wallets (BTC and TICS) for a user.
   * - Validates both BTC and TICS wallet addresses in parallel.
   * - Checks if the main wallet exists for the user.
   * - Creates both BTC and TICS MPC wallets in parallel for efficiency.
   * - Returns status and created wallet objects.
   * - Handles and logs errors.
   */
  public async saveMpcWallets(mpcWalletData: any, userId: number) {
    try {
      // Destructure wallet addresses from input data
      const { wallet_address, btc_wallet_address, tics_wallet_address } = mpcWalletData;

      // Validate BTC and TICS wallet addresses in parallel for speed
      const [isValidBtc, isValidTics]: [boolean, boolean] = await Promise.all([
        global_helper.validate_address(btc_wallet_address, config.STATIC_COIN_FAMILY.BTC),
        global_helper.validate_address(tics_wallet_address, config.STATIC_COIN_FAMILY.TICS)
      ]);

      // If either address is invalid, return early with error
      if (!isValidBtc || !isValidTics) {
        return {
          status: false,
          message: "Invalid wallet addresses",
        };
      }

      // Find the main wallet for the user by wallet_address
      const wallet = await Models.WalletModel.findOne({
        attributes: ["wallet_id"],
        where: {
          user_id: userId,
          wallet_address: wallet_address
        },
        raw: true
      });

      // If wallet not found, return error
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

      // Create both MPC wallets in parallel for efficiency
      const [btcMpcWallet, ticsMpcWallet] = await Promise.all(
        mpcWalletsToCreate.map(data => Models.MpcWalletsModel.create(data))
      );

      // Return success with created wallet objects
        return {
          status: true,
          message: "Mpc wallets have been saved successfully",
          btcMpcWallet,
          ticsMpcWallet
        };

    } catch (error: any) {
      // Log error and return error response
      console.error("Error in saveMpcWallets>>>>", error);
      await commonHelper.save_error_logs("saveMpcWallets", error?.message);
      return {
        status: false,
        message: "Error in saveMpcWallets",
        error: error?.message
      };
    }
  }



//   public async getMpcWallets(userId: number, wallet_address: string, coin_family: number ) {
//      try {
      

//       const  walletData: any  = await Models.WalletModel.findOne({
//         where: {
//           user_id: userId,
//           wallet_address:  wallet_address,
//           coin_family: coin_family
//         },
//         attributes: [ "user_id", "coin_family", "wallet_address", "balance"],
//         include: [
//           {
//             model: Models.MpcWalletsModel,
//             as: "mpcWallets"
//           }
//         ]
//       })

//       console.log("this is walletData", walletData)




//       // Helper to get coin symbol by family
//       const getCoinSymbol = (coinFamily: number) =>
//         coinFamily == config.STATIC_COIN_FAMILY.BTC ? "btc" : "tics";

//       // Prepare all balance update promises in parallel for speed
//       const updatedMpcWallets = await Promise.all(
//         walletData?.mpcWallets?.map(async (mpcWallet: any) => {
//           // Fetch coin data for this wallet
//           const coinData = await coin_queries.coin_find_one(
//             [
//               "coin_id",
//               "coin_family",
//               "coin_symbol",
//               "is_token",
//               "token_address",
//               "token_type",
//             ],
//             {
//               coin_family: mpcWallet.coin_family,
//               coin_symbol: getCoinSymbol(mpcWallet.coin_family)
//             }
//           );

//           if (!coinData) {
//             // If coin data not found, return wallet as is
//             return mpcWallet;
//           }

//           // Get wallet balance from blockchain/helper
//           const balDetails = await global_helper.get_wallet_balance(
//             coinData,
//             mpcWallet.wallet_address
//           );

//           console.log("this is balDetails", balDetails)

//           // Use fetched balance if available, else default to "0"
//           const balance = balDetails?.status ? balDetails.balance : "0";

//           // Update balance in DB (do not await for speed, but can be awaited if consistency is critical)
//           Models.MpcWalletsModel.update(
//             { balance },
//             {
//               where: {
//                 wallet_id: mpcWallet.wallet_id,
//                 coin_family: mpcWallet.coin_family,
//                 wallet_address: mpcWallet.wallet_address
//               }
//             }
//           ).catch((err: any) => {
//             // Log but don't block on update error
//             console.error("Failed to update MPC wallet balance", err);
//           });

//           // Return wallet with updated balance
//           return { ...mpcWallet, balance };
//         })
//       );

//       return updatedMpcWallets

//      } catch (error) {
//       console.log("error", error)
//      }
// }

//oldcode 
// public async getMpcWallets(userId: number, wallet_address: string, coin_family: number ) {
//   try {
//     const walletData: any = await Models.WalletModel.findOne({
//       where: {
//         user_id: userId,
//         wallet_address: wallet_address,
//         coin_family: coin_family
//       },
//       attributes: [ "user_id", "coin_family", "wallet_address", "balance" ],
//       include: [
//         {
//           model: Models.MpcWalletsModel,
//           as: "mpcWallets"
//         }
//       ]
//     });

//     // Helper to get coin symbol by family
//     const getCoinSymbol = (coinFamily: number) =>
//       coinFamily == config.STATIC_COIN_FAMILY.BTC ? "btc" : "tics";

//     // If no walletData or no mpcWallets, return empty array
//     if (!walletData || !walletData.mpcWallets) {
//       return {
//         status: true,
//         code: 200,
//         data: []
//       };
//     }

//     // Prepare all balance update promises in parallel for speed
//     const updatedMpcWallets = await Promise.all(
//       walletData.mpcWallets.map(async (mpcWallet: any) => {
//         // Fetch coin data for this wallet
//         const coinData = await coin_queries.coin_find_one(
//           [
//             "coin_id",
//             "coin_family",
//             "coin_symbol",
//             "is_token",
//             "token_address",
//             "token_type",
//           ],
//           {
//             coin_family: mpcWallet.coin_family,
//             coin_symbol: getCoinSymbol(mpcWallet.coin_family)
//           }
//         );

//         // If coin data not found, just return wallet with current balance
//         if (!coinData) {
//           return {
//             wallet_address: mpcWallet.wallet_address,
//             coin_family: mpcWallet.coin_family,
//             balance: mpcWallet.balance
//           };
//         }

//         // Get wallet balance from blockchain/helper
//         const balDetails = await global_helper.get_wallet_balance(
//           coinData,
//           mpcWallet.wallet_address
//         );

//         // Use fetched balance if available, else default to "0"
//         const balance = balDetails?.status ? balDetails.balance : "0";

//         // Update balance in DB (do not await for speed, but can be awaited if consistency is critical)
//         Models.MpcWalletsModel.update(
//           { balance },
//           {
//             where: {
//               wallet_id: mpcWallet.wallet_id,
//               coin_family: mpcWallet.coin_family,
//               wallet_address: mpcWallet.wallet_address
//             }
//           }
//         ).catch((err: any) => {
//           // Log but don't block on update error
//           console.error("Failed to update MPC wallet balance", err);
//         });

//         // Return only wallet_address, coin_family, and balance
//         return {
//           wallet_address: mpcWallet.wallet_address,
//           coin_family: mpcWallet.coin_family,
//           balance: balance
//         };
//       })
//     );

//     return {
//       data: updatedMpcWallets
//     };

//   } catch (error: any) {
//     console.log("error", error);
//     return {
//       status: false,
//       code: 500,
//       message: "Error fetching MPC wallets",
//       error: error?.message
//     };
//   }
// }

// Helper to get coin symbol by family
private getCoinSymbol(coinFamily: number) {
  return coinFamily == config.STATIC_COIN_FAMILY.BTC ? "btc" : "tics";
}

// Helper to get balance from blockchain/helper with 10s timeout
private async fetchWalletBalanceWithTimeout(coinData: any, walletAddress: string) {
  let balance = "0";
  let rpcError = false;
  let rpcErrorMessage = "";

  // Promise that rejects after 10 seconds
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("RPC_TIMEOUT")), 15000)
  );

  try {
    // Race the balance fetch against the timeout
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
         updatedMpcWallets
      };
    }

    // Normal success
    return {
     updatedMpcWallets
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
