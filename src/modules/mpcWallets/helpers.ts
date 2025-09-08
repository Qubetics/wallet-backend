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



  public async getMpcWallets(userId: number, wallet_address: string, coin_family: number ) {
     try {
      

      const  walletData  = await Models.WalletModel.findOne({
        where: {
          user_id: userId,
          wallet_address:  wallet_address,
          coin_family: coin_family
        },
        attributes: [ "user_id", "coin_family", "wallet_address", "balance"],
        include: [
          {
            model: Models.MpcWalletsModel,
            as: "mpcWallets"
          }
        ]
      })

      return walletData

     } catch (error) {
      console.log("error", error)
     }
}

}

export const mpcWalletsHelper = new MpcWalletsHelpers()
