import { Request } from "express";
import { config } from "../../config";
import * as Models from '../../models/model/index'
import redisClient from "../common/redis";
import { GlblBlockchainTxStatusEnum, TxReqTypesEnum } from "../../constants/enum";
import walletQueries from "./wallets";
import userQueries from "./users";
import coinQueries from './coins';
import deviceTokenQueries from "./device_tokens";
import catchErrMsgQueries from "./catch_err_msgs";
import notificationQueries from "./notifications";
import address_book_wallet_queries from './address_book_wallet';
import addressBookQueries from './address_books';
import gasPricesQueries from './gas_prices';
import customTokenQueries from './custom_tokens';
import coinPriceInFiatQueries from "./coin_price_in_fiat";
import trnxHistoryQueries from './trnx_history';
import adminErrQueries from './admin_err_logs';
import adminQueries from './admins';
import swapSettingQueries from './swap_settings';
import settingsQueries from './settings';
import { Op } from "sequelize";
export {
  walletQueries,
  userQueries,
  coinQueries,
  deviceTokenQueries,
  catchErrMsgQueries,
  notificationQueries,
  address_book_wallet_queries,
  addressBookQueries,
  gasPricesQueries,
  customTokenQueries,
  coinPriceInFiatQueries,
  trnxHistoryQueries,
  adminErrQueries,
  adminQueries,
  swapSettingQueries,
  settingsQueries
};

class DbHelper {

  public async saveWithdrawTxDetails(
    req: Request
  ) {
    try {

      let checkTxHistory: any = await Models.TrnxHistoryModel.findOne({
        attributes: ['id', 'tx_id'],
        where: {
          tx_id: { [Op.like]: req.body.tx_hash },
          from_adrs: { [Op.like]: req.body.from },
          to_adrs: { [Op.like]: req.body.to },
        },
        raw: true
      });
      if (checkTxHistory) {
        await Models.TrnxHistoryModel.update(
          {
            type: req.body.tx_type,
            req_type: req.body.req_type || TxReqTypesEnum.APP,
          },
          {
            where: {
              tx_id: { [Op.like]: req.body.tx_hash },
              from_adrs: { [Op.like]: req.body.from },
              to_adrs: { [Op.like]: req.body.to },
            }
          }
        );
        return { status: true, data: checkTxHistory };
      }

      let to_user_id: number = 0;
      let user_data: any = '';
      if (req.coininfo.coin_family == config.STATIC_COIN_FAMILY.ETH) {
        user_data = await redisClient.getKeyValuePair(config.ETH_WALLET_ADDRESS, req.body.to.toUpperCase())
      } else if (req.coininfo.coin_family == config.STATIC_COIN_FAMILY.TICS) {
        user_data = await redisClient.getKeyValuePair(config.TICS_WALLET_ADDRESS, req.body.to.toUpperCase())
      } else if (req.coininfo.coin_family == config.STATIC_COIN_FAMILY.BTC) {
        user_data = await redisClient.getKeyValuePair(config.BTC_WALLET_ADDRESS, req.body.to.toUpperCase())
      } else if (req.coininfo.coin_family == config.STATIC_COIN_FAMILY.TRX) {
        user_data = await redisClient.getKeyValuePair(config.TRON_WALLET_ADDRESS, req.body.to.toUpperCase())
      } else if (req.coininfo.coin_family == config.STATIC_COIN_FAMILY.BNB) {
        user_data = await redisClient.getKeyValuePair(config.BNB_WALLET_ADDRESS, req.body.to.toUpperCase())
      } else if (req.coininfo.coin_family == config.STATIC_COIN_FAMILY.POL) {
        user_data = await redisClient.getKeyValuePair(config.POL_WALLET_ADDRESS, req.body.to.toUpperCase())
      } else if (req.coininfo.coin_family == config.STATIC_COIN_FAMILY.SOL) {
        user_data = await redisClient.getKeyValuePair(config.SOL_WALLET_ADDRESS, req.body.to.toUpperCase())
      }
      user_data = JSON.parse(user_data);
      to_user_id = user_data ? user_data?.user_id : 0;

      let updateWallet: any = await trnxHistoryQueries.trnxHistoryCreate({
        user_id: req.userId,
        to_user_id: to_user_id,
        coin_id: req.coininfo.coin_id,
        coin_family: req.coininfo.coin_family,
        type: req.body.tx_type,
        req_type: req.body.req_type || TxReqTypesEnum.APP,
        from_adrs: req.body.from,
        to_adrs: req.body.to,
        tx_id: req.body.tx_hash,
        merchant_id: null,
        order_id: req.body.order_id ? req.body.order_id : null,
        tx_raw: req.body.tx_raw || null,
        status: req.body.tx_status,
        blockchain_status: req.body.blockchain_status || GlblBlockchainTxStatusEnum.PENDING,
        amount: req.body.amount,
        block_id: null,
        nonce: req.body.nonce || null,
        tx_fee: req.body.tx_fee || null,
        swap_fee: req.body.swap_fee || null,
        gas_limit: req.body.gas_estimate || null,
        gas_price: req.body.gas_price || null,
        gas_reverted: null,
        fiat_type: 'USD',
        order_status: req.body.order_id ? GlblBlockchainTxStatusEnum.PENDING : null
      });

      if (updateWallet) {
        return { status: true, data: updateWallet };
      } else {
        return { status: false, data: null };
      }
    } catch (err: any) {
      console.error("ERROR in  save tx>>>>>>>>>>>>>>>", err)
      return { status: false, data: null };
    }
  }

  public async find_one_wallet_table(attributes: any, where_clause: any) {
    try {
      let user_wallet_data: any = await Models.WalletModel.findOne({
        attributes: attributes,
        where: where_clause,
        raw: true
      })
      return user_wallet_data;
    } catch (err: any) {
      console.error("Error in find_one_wallet_table>>", err)
      throw err;
    }
  }
  public async get_referrer_from_data(referral_code: string) {
    try {
      const user_data: any = await this.get_user_data({ referral_code: referral_code })
      return user_data;
    } catch (err: any) {
      console.error("Error in get_referre_id>>", err)
      throw err;
    }
  }
  public async get_user_data(obj: any) {
    try {
      const user_data: any = await Models.UsersModel.findOne({
        attributes: ["user_id", "referral_code"],
        where: obj,
        raw: true
      })
      return user_data;
    } catch (err: any) {
      console.error("Error in get_user_data>>>", err)
      throw err;
    }
  }
  public async checkIfuserReferred(obj: any) {
    try {
      const user_data: any = await Models.ReferralModel.findOne({
        attributes: ["id", "referrer_to", "referrer_from", "used_referral_code", "to_device_id"],
        where: obj,
        raw: true
      })
      return user_data;
    } catch (err: any) {
      console.error("Error in checkIfuserReferred", err)
      throw err;
    }
  }

  public async save_referral_data(data: any) {
    try {
      const save_referral_data: any = await Models.ReferralModel.create(data);
      return save_referral_data;
    } catch (err: any) {
      console.error("Error in save_referral_data", err)
      throw err;
    }
  }

}

const dbHelper = new DbHelper();
export default dbHelper;
