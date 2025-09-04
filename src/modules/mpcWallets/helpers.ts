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

  /**
   * Fetches all MPC wallets for a user, updates their balances, and returns the result.
   * - Fetches all wallets in one query.
   * - Updates balances in parallel.
   * - Adds clear comments for maintainability.
   */
  public async getMpcWallets(userId: number, reqBody: any) {
    try {

      const { addresses } = reqBody;

      let whereClause: any = { user_id: userId };

      if(addresses && addresses?.length > 0){
        whereClause.wallet_address = { [Op.in]: addresses.map((address: any) => address.address) };
      }

      // Fetch all MPC wallets for the user
      const mpcWallets: any[] = await Models.MpcWalletsModel.findAll({
        attributes: ["wallet_id", "coin_family", "wallet_address", "balance"],
        where: whereClause,
        raw: true
      });

      // If no wallets found, return early
      if (!mpcWallets?.length) {
        return {
          status: true,
          message: "No mpc wallets found",
          mpcWallets: []
        };
      }

      // Helper to get coin symbol by family
      const getCoinSymbol = (coinFamily: number) =>
        coinFamily == config.STATIC_COIN_FAMILY.BTC ? "btc" : "tics";

      // Prepare all balance update promises in parallel for speed
      const updatedMpcWallets = await Promise.all(
        mpcWallets.map(async (mpcWallet) => {
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
              coin_symbol: getCoinSymbol(mpcWallet.coin_family)
            }
          );

          if (!coinData) {
            // If coin data not found, return wallet as is
            return mpcWallet;
          }

          // Get wallet balance from blockchain/helper
          const balDetails = await global_helper.get_wallet_balance(
            coinData,
            mpcWallet.wallet_address
          );

          // Use fetched balance if available, else default to "0"
          const balance = balDetails?.status ? balDetails.balance : "0";

          // Update balance in DB (do not await for speed, but can be awaited if consistency is critical)
          Models.MpcWalletsModel.update(
            { balance },
            {
              where: {
                wallet_id: mpcWallet.wallet_id,
                coin_family: mpcWallet.coin_family,
                wallet_address: mpcWallet.wallet_address
              }
            }
          ).catch((err: any) => {
            // Log but don't block on update error
            console.error("Failed to update MPC wallet balance", err);
          });

          // Return wallet with updated balance
          return { ...mpcWallet, balance };
        })
      );

      // Return all updated wallets
      return {
        mpcWallets: updatedMpcWallets
      };

    } catch (error: any) {
      // Log and return error
      console.error("Error in getMpcWallets>>>>", error);
      await commonHelper.save_error_logs("getMpcWallets", error?.message);
      return {
        status: false,
        message: "Error in getMpcWallets",
        error: error?.message
      };
    }
  }
}
export const mpcWalletsHelper = new MpcWalletsHelpers();
