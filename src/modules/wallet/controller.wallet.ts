import { Request, Response } from "express";
import { Op, Sequelize } from "sequelize";
import response from "../../helpers/response/response.helpers";
import { OnlyControllerInterface } from "../../interfaces/controller.interface";
import { config } from "../../config";
import moment from "moment";
import { WalletHelper } from "./wallet.helpers";
import { Parser } from "json2csv";
import * as Models from "../../models/model/index";
import * as Interfaces from "../../models/interface/index.interface";
import {
  GlblBooleanEnum,
  GlblCode,
  GlblMessages,
  Fiat_Currency,
  GlblBlockchainTxStatusEnum,
  TxTypesEnum,
  Status,
  TokenType,
} from "../../constants/global_enum";
import { global_helper } from "../../helpers/common/global_helper";
import { language } from "../../constants";
import commonHelper from "../../helpers/common/common.helpers";
import { coin_queries, wallet_queries } from "../../helpers/dbHelper/index";
const crypto = require("crypto");
import userhelper from "../user/helper";
import redisClient from "../../helpers/common/redis";
import kafka_helper from "../../helpers/common/kafka_helper";
import { CoinInterface } from "../../models";
import { SolanaHelper } from "../../helpers/common/solana.helper";

class WalletController implements OnlyControllerInterface {
  constructor() {
    this.initialize();
  }
  public initialize() {}

  /** Used in front end */
  public async addToken(req: Request, res: Response) {
    let lang: any = req.headers["content-language"] || "en";
    try {
      console.log("req body addToken >>>", req.body);
      let currentUTCDate: string = new Date()
        .toISOString()
        .replace(/T/, " ")
        .replace(/\..+/, "");

      let {
        coin_family,
        coin_gicko_id,
        token_type,
        token_address,
        name,
        symbol,
        coin_gicko_alias,
        decimals,
        wallet_address,
        wallet_name,
        isSwapList,
      }: {
        coin_family: number;
        coin_gicko_id: string;
        token_type: string;
        token_address: string;
        name: string;
        symbol: string;
        coin_gicko_alias: string;
        decimals: string;
        wallet_address: string;
        wallet_name: string;
        isSwapList: any;
      } = req.body;

      let coinDataExist: any = await coin_queries.coin_find_one(
        [
          "coin_id",
          "coin_name",
          "coin_symbol",
          "coin_image",
          "cmc_id",
          "coin_gicko_alias",
          "coin_family",
          "coin_status",
          "is_token",
          "is_on_cmc",
          "for_swap",
          "added_by",
          "token_type",
          "decimals",
          "token_address",
          "coin_gicko_id",
        ],
        { coin_family: coin_family, token_address: token_address }
      );

      if (coinDataExist) {
        if (coinDataExist.coin_status == 0) {
          await coin_queries.coin_update(
            { coin_status: 1 },
            { coin_id: coinDataExist.coin_id }
          );
          await WalletHelper.update_token_in_redis(
            { coin_family: coin_family },
            coinDataExist.coin_id
          );
        } else {
          console.log("coin status is active");
        }

        if (coinDataExist.added_by == "user") {
          await WalletHelper.insert_entry_in_custom_token_table(
            coinDataExist.coin_id,
            req.userId
          );
        }
      } else {
        let response: any = await WalletHelper.add_coin_to_table(
          token_address,
          symbol,
          name,
          coin_family,
          token_type,
          decimals,
          lang,
          currentUTCDate,
          req.userId
        );
        coinDataExist = response.coinData;
      }

      let message: string = await WalletHelper.create_wallet_for_coin(
        wallet_address,
        coinDataExist.coin_id,
        wallet_name,
        req.userId,
        coin_family,
        lang,
        currentUTCDate,
        token_address,
        1,
        token_type
      );

      return response.success(res, {
        data: { message: message },
      });
    } catch (err: any) {
      console.error("Error in wallet > addToken.", err);
      await commonHelper.save_error_logs("wallet_addToken", err.message);
      throw language[lang].CATCH_MSG;
    }
  }
  public async portfolio(req: Request, res: Response) {
    let lang: any = req.headers["content-language"] || "en";
    try {
      console.log("req body portfolio >>>", req.body);
      let {
        page,
        limit,
        fiat_type,
      }: { page: number | string; limit: number | string; fiat_type: string } =
        req.body;
      fiat_type =
        req.body.fiat_type == undefined
          ? Fiat_Currency.USD
          : req.body.fiat_type;
      let search: any =
        req.body.search == undefined
          ? (req.body.search = "%%")
          : (req.body.search = "%" + req.body.search + "%");
      let pageNo: any = parseInt(page as string) || GlblBooleanEnum.true;
      let limitNo: any = parseInt(limit as string) || 10;
      let offset: number = GlblBooleanEnum.false;
      if (pageNo != GlblBooleanEnum.true) {
        offset = (pageNo - GlblBooleanEnum.true) * limitNo;
      }
      let user_id: number = req.userId;
      // let user_id: number = 5;

      let wallets: any = await Models.WalletModel.findAndCountAll({
        attributes: [
          "wallet_id",
          "wallet_name",
          "user_id",
          "wallet_address",
          "balance",
          "status",
          "sort_order",
        ],
        where: {
          wallet_address: { [Op.in]: req.body.addressListKeys },
          status: GlblBooleanEnum.true,
        },
        include: [
          {
            model: Models.CoinsModel,
            attributes: [
              "coin_id",
              "coin_image",
              "coin_name",
              "coin_symbol",
              "coin_family",
              "decimals",
              "is_token",
              "token_address",
              "for_swap",
              "graph_source",
              "graph_pair",
              "cmc_id",
            ],
            required: true,
            where: {
              coin_status: GlblBooleanEnum.true,
              coin_family: { [Op.in]: req.body.coin_family },
              [Op.or]: [
                { coin_name: { [Op.like]: search } },
                { coin_symbol: { [Op.like]: search } },
              ],
              [Op.and]: Sequelize.literal(
                `(token_type is null or token_type NOT IN('BEP721', 'ERC721')) AND (IF(added_by='admin',1=1,coin.coin_id IN(select coin_id FROM custom_tokens WHERE user_id=${user_id})))`
              ),
            },
            include: [
              {
                model: Models.CoinPriceInFiatModel,
                as: "fiat_price_data",
                attributes: [
                  "value",
                  "price_change_24h",
                  "fiat_type",
                  "price_change_percentage_24h",
                ],
                where: {
                  fiat_type: fiat_type,
                  // coin_family:"$coins.coin_family$"
                },
                required: false,
              },
              {
                model: Models.WatchlistsModel,
                attributes: ["user_id", "coin_id", "wallet_address", "status"],
                as: "watchlist_data",
                where: {
                  user_id: user_id,
                  wallet_address: { [Op.in]: req.body.addressListKeys },
                  status: "1",
                },
                required: false,
              },
            ],
          },
        ],
        // order: [["sort_order", "ASC"]],
        order: Sequelize.literal(
          `(CASE WHEN (\`coin.fiat_price_data.value\` * wallets.balance) > 0 && sort_order IS NULL THEN (\`coin.fiat_price_data.value\` * wallets.balance) END) DESC,(CASE WHEN sort_order IS NULL THEN wallets.created_at END) ASC,(CASE WHEN sort_order IS NOT NULL THEN wallets.sort_order END) ASC`
        ),
        limit: limitNo,
        offset: offset,
      });
      response.success(res, {
        data: {
          status: true,
          data: wallets.rows,
          meta: {
            page: page,
            pages: Math.ceil(wallets.count / limitNo),
            perPage: limitNo,
            total: wallets.count,
          },
        },
      });
    } catch (err: any) {
      console.error("Error in wallet > portfolio.", err);
      await commonHelper.save_error_logs("wallet_portfolio", err.message);
      response.error(res, {
        data: {
          status: false,
          message: language[lang].CATCH_MSG,
        },
      });
    }
  }
  public async activeInactiveWallet(req: Request, res: Response) {
    let lang: any = req.headers["content-language"] || "en";
    try {
      console.log("req body activeInactiveWallet >>>", req.body);
      let currentUTCDate: string = new Date()
        .toISOString()
        .replace(/T/, " ")
        .replace(/\..+/, "");
      let {
        coinId,
        walletAddress,
        isActive,
      }: { coinId: number; walletAddress: string; isActive: any } = req.body;
      let userId: number = req.userId;
      let message: string;
      let coin_data: any = await coin_queries.coin_find_one([], {
        coin_id: coinId,
      });

      if (!coin_data) {
        let err: string = language[lang].COIN_NOT_FOUND;
        throw new Error(err);
      }

      let balDetails: any = await global_helper.get_wallet_balance(
        coin_data,
        walletAddress
      );
      let wallet_exist: any = await wallet_queries.wallet_find_one(
        ["wallet_id"],
        { wallet_address: walletAddress, coin_id: coinId }
      );
      if (!wallet_exist) {
        let wallet_data: any = await wallet_queries.wallet_find_one(
          ["wallet_id", "wallet_name"],
          { wallet_address: walletAddress }
        );
        console.log("wallet_name >>>", wallet_data);
        let obj: any = {
          user_id: userId,
          coin_family: coin_data.coin_family,
          wallet_name: wallet_data?.wallet_name
            ? wallet_data.wallet_name
            : null,
          wallet_address: walletAddress,
          coin_id: coinId,
          balance: balDetails.status ? balDetails.balance : "0",
          default_wallet: GlblBooleanEnum.true,
          is_verified: GlblBooleanEnum.true,
          status: GlblBooleanEnum.true,
          created_at: currentUTCDate,
          updated_at: currentUTCDate,
        };
        await wallet_queries.wallet_create(obj);
      } else {
        let update_wallet_data: any = { status: isActive };
        if (balDetails.status) {
          update_wallet_data.balance = balDetails.balance;
        }
        await wallet_queries.wallet_update(update_wallet_data, {
          user_id: userId,
          wallet_address: walletAddress,
          coin_id: coinId,
        });
      }
      if (isActive == GlblBooleanEnum.true) {
        message = language[lang].TOKEN_WALLET_ACTIVE;
      } else {
        message = language[lang].TOKEN_WALLET_INACTIVE;
      }
      if (balDetails.status == false) {
        console.log("bal is not updated");
        // adding_coins_to_queue
        await kafka_helper.produceMessage(config.BACKEND_WALLET_ADDRESSES, {
          coin_data: {
            coin_id: coin_data.coin_id,
            coin_family: coin_data.coin_family,
            is_token: coin_data.is_token,
            token_address: coin_data.token_address,
            token_type: coin_data.token_type,
          },
          wallet_address: walletAddress,
          queue_count: 0,
        });
        // await userhelper.adding_coins_to_queue(
        //   config.BACKEND_WALLET_ADDRESSES,
        //   {
        //     coin_data: {
        //       coin_id: coin_data.coin_id,
        //       coin_family: coin_data.coin_family,
        //       is_token: coin_data.is_token,
        //       token_address: coin_data.token_address,
        //       token_type: coin_data.token_type,
        //     },
        //     wallet_address: walletAddress,
        //     queue_count: 0,
        //   }
        // );
      }
      return response.success(res, {
        data: {
          message: message,
        },
      });
    } catch (err: any) {
      console.error("Error in wallet > activeInactiveWallet.", err);
      await commonHelper.save_error_logs(
        "wallet_activeInactiveWallet",
        err.message
      );
      response.error(res, {
        data: { message: language[lang].CATCH_MSG, data: {} },
      });
    }
  }
  public async toggleCoinList(req: Request, res: Response) {
    let lang: any = req.headers["content-language"] || "en";
    try {
      console.log("req body toggleCoinList >>>", req.body);
      const {
        page,
        limit,
        currency_code,
      }: {
        page: number | string;
        limit: number | string;
        currency_code: string;
      } = req.body;
      const addresses: [] = req.body.addrsListKeys;
      const coinfamiles: [] = req.body.coinFamilyKeys;
      let search: any =
        req.body.search == undefined
          ? (req.body.search = "%%")
          : (req.body.search = "%" + req.body.search + "%");
      let pageNo: any = parseInt(page as string) || GlblBooleanEnum.true;
      let limitNo: any = parseInt(limit as string) || 10;
      let offset: number = GlblBooleanEnum.false;
      if (pageNo != GlblBooleanEnum.true) {
        offset = (pageNo - GlblBooleanEnum.true) * limitNo;
      }
      let data: any = await Models.CoinsModel.findAndCountAll({
        attributes: [
          "coin_id",
          "coin_image",
          "coin_name",
          "coin_symbol",
          "coin_family",
          "is_token",
          "token_address",
          "token_type",
          "coin_status",
        ],
        where: {
          coin_status: GlblBooleanEnum.true,
          coin_family: { [Op.in]: coinfamiles },
          [Op.or]: [
            { coin_name: { [Op.like]: search } },
            { coin_symbol: { [Op.like]: search } },
          ],
          [Op.and]: Sequelize.literal(
            `(coins.token_type IS NULL OR coins.token_type NOT IN('BEP721', 'ERC721')) AND (IF(added_by='admin',1=1,coins.coin_id IN(select coin_id FROM custom_tokens WHERE user_id=${req.userId})))`
          ),
        },
        include: [
          {
            model: Models.WalletModel,
            attributes: [
              "wallet_address",
              [Sequelize.literal(`(IF (status= null,0,status))`), `status`],
            ],
            where: {
              wallet_address: { [Op.in]: addresses },
            },
            required: false,
            as: "wallet_data",
          },
          {
            model: Models.CoinPriceInFiatModel,
            as: "fiat_price_data",
            attributes: [
              "price_change_24h",
              "value",
              "price_change_percentage_24h",
            ],
            where: {
              fiat_type: currency_code,
            },
            required: false,
          },
        ],
        order: [
          Sequelize.literal(
            "(CASE WHEN  wallet_data.status=1 THEN wallet_data.status END)  DESC, coins.coin_id ASC,(CASE WHEN  wallet_data.status=0 THEN coins.coin_id END)  ASC"
          ),
        ],
        limit: limitNo,
        offset: offset,
      });
      let objData: any = {
        status: true,
        data: data.rows,
        meta: {
          page: pageNo,
          pages: Math.ceil(data.count / limitNo),
          perPage: limitNo,
          total: data.count,
        },
      };
      response.success(res, {
        data: objData,
      });
    } catch (err: any) {
      console.error("Error in wallet > toggleCoinList.", err);
      await commonHelper.save_error_logs("wallet_toggleCoinList", err.message);
      response.error(res, {
        data: {
          status: false,
          message: language[lang].CATCH_MSG,
        },
      });
    }
  }
  public async transactions(req: Request, res: Response) {
    let lang: any = req.headers["content-language"] || "en";
    try {
      console.log("req body transactions >>>", req.body);
      let address_list: any = req.body.addrsListKeys
        ? req.body.addrsListKeys
        : [];
      let fiat_currency: string = String(
        req.body.fiat_currency ? req.body.fiat_currency : Fiat_Currency.USD
      );
      let search: any =
        req.body.search == undefined
          ? (req.body.search = "%%")
          : (req.body.search = "%" + req.body.search + "%");
      let limit: number = Number(
        req.body.limit == undefined ? (req.body.limit = "25") : req.body.limit
      );
      let page: number = Number(
        req.body.page == undefined ? (req.body.page = "1") : req.body.page
      );
      let offset: number = (page - GlblBooleanEnum.true) * limit;
      let coin_id: number =
        req.body.coin_id == undefined
          ? (req.body.coin_id = GlblBooleanEnum.false)
          : req.body.coin_id;
      let status: GlblBlockchainTxStatusEnum =
        req.body.status == undefined
          ? (req.body.status = null)
          : req.body.status;
      let date_from: number = req.body.date_from ? req.body.date_from : null;
      let date_to: number = req.body.date_to ? req.body.date_to : null;
      let type: any = req.body.trnx_type ? req.body.trnx_type : "all";
      let coin_family: any = req.body.coin_family ? req.body.coin_family : [];
      let userId: number = req.userId;

      let where_clause: any = {
        [Op.or]: [
          {
            [Op.and]: [
              { from_adrs: { [Op.in]: address_list } },
              { user_id: userId },

              {
                [Op.or]: [
                  { blockchain_status: GlblBlockchainTxStatusEnum.PENDING },
                  { blockchain_status: GlblBlockchainTxStatusEnum.FAILED },
                  { blockchain_status: GlblBlockchainTxStatusEnum.CONFIRMED },
                  { blockchain_status: null },
                ],
              },
            ],
          },
          {
            [Op.and]: [
              { to_adrs: { [Op.in]: address_list } },
              { to_user_id: userId },

              Sequelize.literal(
                `IF(merchant_id IS NOT null, 1 = 1, trnx_history.blockchain_status = "${GlblBlockchainTxStatusEnum.CONFIRMED}")`
              ),
            ],
          },
        ],
      };

      // let attr: any = ['id',
      //   [Sequelize.literal(`IF(type ='withdraw' OR type = 'deposit',(IF(FIND_IN_SET(from_adrs, "${address_list.toString()}"),'withdraw','deposit')),type)`), 'type']
      //   , 'tx_fee', 'tx_id', 'user_id', 'req_type', 'from_adrs', 'to_adrs', 'coin_family', 'tx_raw', 'order_id', 'status', 'blockchain_status', 'coin_id', 'amount', 'fiat_price', 'fiat_type', 'created_at', 'updated_at', 'referral_upgrade_level'];

      let attr: any = [
        "id",
        [
          Sequelize.literal(
            `IF(type ='withdraw' OR type = 'deposit',(IF(FIND_IN_SET(user_id, "${userId}"),'withdraw','deposit')),type)`
          ),
          "type",
        ],
        "tx_fee",
        "tx_id",
        "user_id",
        "req_type",
        "from_adrs",
        "to_adrs",
        "coin_family",
        "tx_raw",
        "order_id",
        "status",
        "blockchain_status",
        "coin_id",
        "amount",
        "fiat_price",
        "fiat_type",
        "created_at",
        "updated_at",
        "referral_upgrade_level",
      ];

      if (type == TxTypesEnum.DEPOSIT) {
        // attr = ['id',
        // [Sequelize.literal(`IF(type ='withdraw' OR type = 'deposit',(IF(FIND_IN_SET(to_adrs, "${address_list.toString()}"),'deposit','withdraw')),type)`), 'type']
        // , 'tx_fee', 'tx_id', 'user_id', 'req_type', 'from_adrs', 'to_adrs', 'coin_family', 'tx_raw', 'order_id', 'status', 'blockchain_status', 'coin_id', 'amount', 'fiat_price', 'fiat_type', 'created_at', 'updated_at', 'referral_upgrade_level'];

        attr = [
          "id",
          [
            Sequelize.literal(
              `IF(type ='withdraw' OR type = 'deposit',(IF(FIND_IN_SET(to_user_id, "${userId}"),'deposit','withdraw')),type)`
            ),
            "type",
          ],
          "tx_fee",
          "tx_id",
          "user_id",
          "req_type",
          "from_adrs",
          "to_adrs",
          "coin_family",
          "tx_raw",
          "order_id",
          "status",
          "blockchain_status",
          "coin_id",
          "amount",
          "fiat_price",
          "fiat_type",
          "created_at",
          "updated_at",
          "referral_upgrade_level",
        ];

        where_clause = {
          to_adrs: {
            [Op.in]: address_list,
          },
          to_user_id: userId,
          blockchain_status: GlblBlockchainTxStatusEnum.CONFIRMED,
          [Op.or]: [
            { type: TxTypesEnum.WITHDRAW },
            { type: TxTypesEnum.DEPOSIT },
          ],
        };
      } else if (type == TxTypesEnum.WITHDRAW) {
        where_clause = {
          from_adrs: {
            [Op.in]: address_list,
          },
          type: TxTypesEnum.WITHDRAW,
          user_id: userId,
          [Op.or]: [
            { blockchain_status: GlblBlockchainTxStatusEnum.PENDING },
            { blockchain_status: GlblBlockchainTxStatusEnum.FAILED },
            { blockchain_status: GlblBlockchainTxStatusEnum.CONFIRMED },
            { blockchain_status: null },
          ],
        };
      } else if (type == TxTypesEnum.DAPP) {
        where_clause = {
          type: TxTypesEnum.DAPP,
          from_adrs: {
            [Op.in]: address_list,
          },
          user_id: userId,
        };
      } else if (type?.toUpperCase() == TxTypesEnum.SWAP?.toUpperCase()) {
        console.log("dddddddddddddddddddddd", type);
        where_clause = {
          [Op.or]: [
            { type: TxTypesEnum.APPROVE },
            { type: TxTypesEnum.SWAP },
            { type: TxTypesEnum.CROSS_CHAIN },
          ],
          from_adrs: {
            [Op.in]: address_list,
          },
          user_id: userId,
        };
      } else if (type == TxTypesEnum.BUY) {
        where_clause = {
          to_adrs: {
            [Op.in]: address_list,
          },
          to_user_id: userId,
          type: TxTypesEnum.BUY,
        };
      } else if (type == TxTypesEnum.SELL) {
        where_clause = {
          to_adrs: {
            [Op.in]: address_list,
          },
          to_user_id: userId,
          type: TxTypesEnum.SELL,
        };
      } else if (type == TxTypesEnum.CARDS) {
        where_clause = {
          [Op.or]: [
            { type: TxTypesEnum.CARD_FEES },
            { type: TxTypesEnum.CARD_RECHARGE },
          ],
          from_adrs: {
            [Op.in]: address_list,
          },
          user_id: userId,
        };
      }

      if (status) {
        where_clause = {
          ...where_clause,
          blockchain_status: status,
        };
      }

      if (coin_family) {
        where_clause = {
          ...where_clause,
          coin_family: { [Op.in]: coin_family },
        };
      }
      if (date_from && date_to) {
        const fromDate = new Date(`${date_from}T00:00:00Z`);
        const toDate = new Date(`${date_to}T23:59:59Z`);
        where_clause = {
          ...where_clause,
          created_at: {
            [Op.between]: [fromDate, toDate],
          },
        };
        // where_clause = {
        //   ...where_clause,
        //   created_at: { [Op.between]: [new Date(date_from), new Date(date_to)] }
        //   // [Op.and]: Sequelize.literal(
        //   //   `DATE(trnx_history.created_at) BETWEEN '${date_from}' and '${date_to}'`
        //   // ),
        // };
      }
      let coin_where: any = "";
      if (coin_id > GlblBooleanEnum.false) {
        coin_where = { id: coin_id };
        where_clause = {
          ...where_clause,
          coin_id: coin_id,
        };
      }
      if (search) {
        coin_where = {
          ...coin_where,
          [Op.and]: {
            [Op.or]: {
              coin_name: {
                [Op.like]: search,
              },
              coin_symbol: {
                [Op.like]: search,
              },
            },
          },
        };
      }
      let query: any = {
        attributes: attr,
        where: where_clause,
        include: [
          {
            model: Models.CoinsModel,
            attributes: ["coin_symbol", "coin_name"],
            as: "coin_data",
            where: Sequelize.literal(coin_where),
            include: [
              {
                model: Models.CoinPriceInFiatModel,
                as: "fiat_price_data",
                attributes: [
                  "fiat_type",
                  "value",
                  "price_change_24h",
                  "price_change_percentage_24h",
                ],
                where: { fiat_type: fiat_currency },
                required: false,
              },
            ],
          },
        ],
        order: [["id", "DESC"]],
        limit: limit,
        offset: offset,
      };
      let transaction_data: any = await Models.TrnxHistoryModel.findAndCountAll(
        query
      );
      return response.success(res, {
        data: {
          success: true,
          message: GlblMessages.SUCCESS,
          data: transaction_data.rows,
          meta: {
            page: page,
            pages: Math.ceil(transaction_data.count / limit),
            perPage: limit,
            total: transaction_data.count,
          },
        },
      });
    } catch (err: any) {
      console.error("Error in wallet > transactions.", err);
      await commonHelper.save_error_logs("wallet_transactions", err.message);
      response.error(res, {
        data: {
          status: false,
          message: language[lang].CATCH_MSG,
        },
      });
    }
  }
  public async updateWalletOrder(req: Request, res: Response) {
    let lang: any = req.headers["content-language"] || "en";
    try {
      console.log("req body updateWalletOrder >>>", req.body);
      const { wallets }: any = req.body;
      for await (let wallet of wallets) {
        await wallet_queries.wallet_update(
          { sort_order: wallet.order },
          {
            coin_id: wallet.coin_id,
            wallet_address: wallet.wallet_address,
          }
        );
      }
      return response.success(res, { data: { status: true } });
    } catch (err: any) {
      console.error("Error in wallet > updateWalletOrder.", err);
      await commonHelper.save_error_logs(
        "wallet_updateWalletOrder",
        err.message
      );
      return response.error(res, { data: language[lang].CATCH_MSG });
    }
  }
  public async searchToken(req: Request, res: Response) {
    let lang: any = req.headers["content-language"] || "en";
    try {
      console.log("req body searchToken >>>", req.body);
      let {
        tokenAddress,
        coinFamily,
      }: { tokenAddress: string; coinFamily: number } = req.body;
      let tokenDetails: { decimals: any; name: any; symbol: any } = {
        decimals: "0",
        name: "",
        symbol: "",
      };
      console.log("Entered into searchToken request data", req.body);
      tokenDetails = await global_helper.return_decimals_name_symbol(
        coinFamily,
        tokenAddress,
        lang
      );
      console.log("tokenDetails >> tokenDetails ", tokenDetails);

      if (!tokenDetails || tokenDetails == null) {
        return response.error(res, {
          data: { message: language[lang].INVALID_TOKEN, data: {} },
        });
      }

      tokenDetails.decimals = tokenDetails.decimals.toString();

      if (
        Object.keys(tokenDetails).length !== GlblBooleanEnum.false &&
        tokenDetails.constructor === Object
      ) {
        return response.success(res, {
          data: {
            message: language[lang].TOKENS_SEARCH,
            data: tokenDetails,
          },
        });
      }
      return response.error(res, {
        data: { message: language[lang].TOKENS_NOT_FOUND, data: {} },
      });
    } catch (err: any) {
      console.error("Error in wallet > searchToken.", err);
      await commonHelper.save_error_logs("wallet_searchToken", err.message);
      return response.error(res, {
        data: {
          data: { message: language[lang].CATCH_MSG, data: {} },
        },
      });
    }
  }
  public async swapList(req: Request, res: Response) {
    let lang: any = req.headers["content-language"] || "en";
    try {
      console.log("req body swapList >>>", req.body);
      const coin_family: [] = req.body.coin_family;
      const addresses: [] = req.body.addrsListKeys;
      let fiat_type: string = req.body.fiat_type;
      const coin_id: number = req.body.coin_id || null;
      let where_clause: any = {
        for_swap: 1,
        coin_family: { [Op.in]: coin_family },
        coin_status: GlblBooleanEnum.true,
        [Op.and]: Sequelize.literal(
          `(IF((added_by='admin' OR added_by='swap'),1=1,coins.coin_id IN(select coin_id FROM custom_tokens WHERE user_id=${req.userId})))`
        ),
      };
      if (coin_id) {
        where_clause.coin_id = coin_id;
      }
      let isFav = false;
      let swap_list_data: any = await Models.CoinsModel.findAll({
        attributes: [
          "coin_id",
          "mainnet_token_address",
          "is_token",
          "coin_name",
          "coin_symbol",
          "coin_image",
          "coin_family",
          "decimals",
          "coin_status",
          "token_address",
          "for_swap",
          "added_by",
        ],
        where: where_clause,
        include: [
          {
            model: Models.CoinPriceInFiatModel,
            as: "fiat_price_data",
            attributes: ["value", "price_change_percentage_24h"],
            where: {
              fiat_type: fiat_type,
            },
            required: false,
          },
          {
            model: Models.WalletModel,
            attributes: ["user_id", "balance"],
            where: {
              wallet_address: { [Op.in]: addresses },
              status: GlblBooleanEnum.true,
              user_id: req.userId,
            },
            required: isFav,
          },
          {
            model: Models.WalletModel,
            attributes: ["coin_family", "balance"],
            as: "native_wallet_data",
            where: {
              wallet_address: { [Op.in]: addresses },
              user_id: req.userId,
              status: GlblBooleanEnum.true,
            },
            limit: GlblBooleanEnum.true,
          },
        ],
        order: [
          ["coin_family", "asc"],
          ["is_token", "asc"],
        ],
      });
      return response.success(res, {
        data: {
          message: language[lang].SWAP_LIST,
          data: swap_list_data,
          status: true,
          code: GlblCode.SUCCESS,
        },
      });
    } catch (err: any) {
      console.error("Error in wallet > swap_list.", err);
      await commonHelper.save_error_logs("wallet_swap_list", err.message);
      response.error(res, {
        data: {
          status: false,
          message: language[lang].CATCH_MSG,
        },
      });
    }
  }
  public async getRpcUrl(req: Request, res: Response) {
    let lang: any = req.headers["content-language"] || "en";
    try {
      let data: any = {
        ETH_RPC_URL: config.NODE.ETH_RPC_URL,
        BTC_RPC_URL: config.NODE.BTC_RPC_URL,
        TRON_NODE: config.NODE.TRX_RPC_URL,
        BNB_RPC_URL: config.NODE.BNB_RPC_URL,
        ETH_DAPP_RPC_URL: config.NODE.ETH_DAPP_RPC_URL,
        POL_RPC_URL: config.NODE.POL_RPC_URL,
        TICS_RPC_URL: config.NODE.TICS_RPC_URL,
        // SOL_RPC_URL: config.NODE.SOL_RPC_URL
        SOL_RPC_URL:
          "https://mainnet.helius-rpc.com/?api-key=REDACTED",
      };

      return res.status(GlblCode.SUCCESS).send(data);
    } catch (err: any) {
      console.error("Error in wallet > getRpcUrl.", err);
      await commonHelper.save_error_logs("wallet_getRpcUrl", err.message);
      let data = {
        code: GlblCode.ERROR_CODE,
        status: false,
        message: language[lang].CATCH_MSG,
      };
      return res.status(data.code).send(data);
    }
  }
  public async updateWatchlist(req: Request, res: Response) {
    let lang: any = req.headers["content-language"] || "en";
    try {
      console.log("req body updateWatchlist >>>", req.body);
      let user_id: number = req.userId;
      let data: any = req.body.data;
      for (let i = GlblBooleanEnum.false; i < data.length; i++) {
        const result: any = await Models.WatchlistsModel.findOne({
          where: {
            user_id: user_id,
            coin_id: data[i].coin_id,
            wallet_address: data[i].address,
          },
        });
        if (data[i].status == GlblBooleanEnum.false) {
          if (result) {
            await Models.WatchlistsModel.update(
              {
                status: "0",
              },
              {
                where: {
                  user_id: user_id,
                  coin_id: data[i].coin_id,
                  wallet_address: data[i].address,
                },
              }
            );
          } else {
            await Models.WatchlistsModel.create({
              status: "0",
              user_id: user_id,
              coin_id: data[i].coin_id,
              wallet_address: data[i].address,
            });
          }
        } else if (data[i].status == GlblBooleanEnum.true) {
          if (result) {
            await Models.WatchlistsModel.update(
              {
                status: "1",
              },
              {
                where: {
                  user_id: user_id,
                  coin_id: data[i].coin_id,
                  wallet_address: data[i].address,
                },
              }
            );
          } else {
            await Models.WatchlistsModel.create({
              status: "1",
              user_id: user_id,
              coin_id: data[i].coin_id,
              wallet_address: data[i].address,
            });
          }
        }
      }
      return res.status(GlblCode.SUCCESS).send({
        status: true,
        code: GlblCode.SUCCESS,
        message: language[lang].UPDATED,
      });
    } catch (err: any) {
      console.error("Error in wallet > updateWatchlist.", err);
      await commonHelper.save_error_logs("wallet_updateWatchlist", err.message);
      let data = {
        code: GlblCode.ERROR_CODE,
        status: false,
        message: language[lang].CATCH_MSG,
      };
      return res.status(data.code).send(data);
    }
  }
  public async getWatchlist(req: Request, res: Response) {
    let lang: any = req.headers["content-language"] || "en";
    try {
      console.log("req body getWatchlist >>>", req.body);
      let user_id: any = req.userId;
      const { page, limit }: { page: number | string; limit: number | string } =
        req.body;
      let is_fav: number = req.body.is_fav;
      let fiat_type: string = req.body.fiat_type;
      let search: any =
        req.body.search == undefined
          ? (req.body.search = "%%")
          : (req.body.search = "%" + req.body.search + "%");
      let wallet_address: string = req.body.wallet_address;
      let pageNo: any = parseInt(page as string) || GlblBooleanEnum.true;
      let limitNo: any = parseInt(limit as string) || 10;
      let offset: number = GlblBooleanEnum.false;
      if (pageNo != GlblBooleanEnum.true) {
        offset = (pageNo - GlblBooleanEnum.true) * limitNo;
      }
      let isFav = false;
      let orderBy: string = "coins.created_at";
      let orderType: string = "ASC";
      if (is_fav == GlblBooleanEnum.true) {
        isFav = true;
        orderBy = `watchlist_data.created_at`;
        orderType = "DESC";
      }
      let result: any = await Models.CoinsModel.findAndCountAll({
        attributes: [
          "coin_id",
          "coin_name",
          "coin_symbol",
          "coin_image",
          "coin_family",
          "is_token",
          "token_type",
        ],
        where: {
          coin_status: GlblBooleanEnum.true,
          coin_family: { [Op.in]: req.body.coin_family },
          [Op.and]: Sequelize.literal(
            `(coins.token_type IS NULL OR coins.token_type NOT IN('BEP721', 'ERC721')) AND (IF(added_by='admin',1=1,coins.coin_id IN(select coin_id FROM custom_tokens WHERE user_id=${req.userId})))`
          ),
          [Op.or]: [
            { coin_name: { [Op.like]: search } },
            { coin_symbol: { [Op.like]: search } },
          ],
        },
        include: [
          {
            model: Models.CoinPriceInFiatModel,
            attributes: ["price_change_percentage_24h", "value"],
            as: "fiat_price_data",
            where: {
              fiat_type: fiat_type,
            },
            required: false,
          },
          {
            model: Models.WalletModel,
            attributes: ["wallet_name", "balance", "wallet_address"],
            where: {
              user_id: user_id,
            },
            required: false,
          },
          {
            model: Models.WatchlistsModel,
            attributes: ["user_id", "coin_id", "wallet_address", "status"],
            as: "watchlist_data",
            where: {
              user_id: user_id,
              wallet_address: wallet_address,
              status: "1",
            },
            required: isFav,
          },
        ],
        // order: [
        //   [Sequelize.col('coins.created_at'), 'DESC']  // Correct ordering
        // ],
        // order: [[orderBy, orderType]],
        order: [[Sequelize.literal(orderBy), orderType]],
        offset: offset,
        limit: limitNo,
        // logging: true,
        subQuery: false,
      });
      return res.status(GlblCode.SUCCESS).send({
        status: true,
        code: GlblCode.SUCCESS,
        data: result.rows,
        meta: {
          page: page,
          pages: Math.ceil(result.count / limitNo),
          perPage: limitNo,
          total: result.count,
        },
      });
    } catch (err: any) {
      console.error("Error in wallet > getWatchlist.", err);
      await commonHelper.save_error_logs("wallet_getWatchlist", err.message);
      let data = {
        code: GlblCode.ERROR_CODE,
        status: false,
        message: language[lang].CATCH_MSG,
      };
      return res.status(data.code).send(data);
    }
  }
  public async getCurrencyFiat(req: Request, res: Response) {
    let lang: any = req.headers["content-language"] || "en";
    try {
      let data: any = await Models.CurrencyFiatModel.findAll({
        where: { status: GlblBooleanEnum.true },
        order: [["currency_name", "ASC"]],
      });
      response.success(res, {
        data: { message: language[lang].SUCCESS, data: data },
      });
    } catch (err: any) {
      console.error("Error in wallet > getCurrencyFiat.", err);
      await commonHelper.save_error_logs("wallet_getCurrencyFiat", err.message);
      response.error(res, {
        data: { message: language[lang].CATCH_MSG },
      });
    }
  }
  public async getFee(req: Request, res: Response) {
    let lang: any = req.headers["content-language"] || "en";
    try {
      return res.status(GlblCode.SUCCESS).send({
        status: true,
        code: GlblCode.SUCCESS,
        message: language[lang].REQUEST_EXECUTED,
        fee: 40,
      });
    } catch (err: any) {
      console.error("Error in wallet > getFee.", err);
      await commonHelper.save_error_logs("wallet_getFee", err.message);
      let data = {
        code: GlblCode.ERROR_CODE,
        status: false,
        message: language[lang].CATCH_MSG,
      };
      return res.status(data.code).send(data);
    }
  }
  public async NativeCoinFiatPrice(req: Request, res: Response) {
    let lang: any = req.headers["content-language"] || "en";
    try {
      console.log("req body NativeCoinFiatPrice >>>", req.body);
      let {
        coin_family,
        fiat_currency,
      }: { coin_family: number; fiat_currency: string } = req.body;

      let nativeCoin: any = await Models.CoinsModel.findOne({
        attributes: ["cmc_id"],
        where: {
          coin_family: coin_family,
          is_token: GlblBooleanEnum.false,
          coin_status: GlblBooleanEnum.true,
        },
        raw: true,
      });

      let fiatCoinPrice: any;
      if (nativeCoin) {
        console.log(
          "Entered into if of nativeCoin",
          nativeCoin?.cmc_id,
          ">>>>>",
          fiat_currency
        );

        fiatCoinPrice = await Models.CoinPriceInFiatModel.findOne({
          attributes: ["value"],
          where: {
            cmc_id: nativeCoin?.cmc_id,
            fiat_type: fiat_currency,
          },
          raw: true,
        });
      } else {
        console.log("Entered into else of nativeCoin");
        fiatCoinPrice = {
          value: 0,
        };
      }

      return res.status(GlblCode.SUCCESS).send({
        status: true,
        code: GlblCode.SUCCESS,
        message: language[lang].REQUEST_EXECUTED,
        data: { fiatCoinPrice: fiatCoinPrice },
      });
    } catch (err: any) {
      console.error("Error in wallet > NativeCoinFiatPrice.", err);
      await commonHelper.save_error_logs(
        "wallet_NativeCoinFiatPrice",
        err.message
      );
      let data = {
        code: GlblCode.ERROR_CODE,
        status: false,
        message: language[lang].CATCH_MSG,
      };
      return res.status(data.code).send(data);
    }
  }
  public async fetchValue(req: Request, res: Response) {
    let lang: any = req.headers["content-language"] || "en";
    try {
      res.status(GlblCode.SUCCESS).send({
        message: language[lang].VALUE_FETCHED,
        data: {
          value: 80,
          crosschain: 80,
        },
      });
    } catch (err: any) {
      console.error("Error in wallet > fetchValue", err);
      await commonHelper.save_error_logs("wallet_fetchValue", err.message);
      res.status(GlblCode.ERROR_CODE).send({
        message: language[lang].ERROR_FETCHING_DATA,
        data: {
          value: 80,
          crosschain: 80,
        },
      });
    }
  }
  public async checkFiatBalance(req: Request, res: Response) {
    let lang: any = req.headers["content-language"] || "en";
    try {
      console.log("req body checkFiatBalance >>>", req.body);
      let {
        coin_family,
        fiat_currency,
        coin_symbol,
      }: { coin_family: number; fiat_currency: string; coin_symbol: string } =
        req.body;

      let wallet_data: any = await Models.WalletModel.findOne({
        attributes: ["coin_id", "balance"],
        where: { coin_family: coin_family, user_id: req.userId },
        include: [
          {
            model: Models.CoinsModel,
            attributes: ["coin_id"],
            required: true,
            where: { is_token: GlblBooleanEnum.false },
            include: [
              {
                model: Models.CoinPriceInFiatModel,
                as: "fiat_price_data",
                attributes: ["value"],
                where: {
                  fiat_type: Fiat_Currency.USD,
                },
                required: true,
              },
            ],
          },
        ],
        order: [["wallet_id", "ASC"]],
      });
      let usd_value: any =
        wallet_data.coin.fiat_price_data.value == null
          ? "0.00"
          : wallet_data.coin.fiat_price_data.value;
      let bal_in_usd: number = usd_value * wallet_data.balance;
      bal_in_usd =
        bal_in_usd < 0.000001
          ? await WalletHelper.toFixedExp(bal_in_usd, 8)
          : bal_in_usd < 0.0001
          ? await WalletHelper.toFixedExp(bal_in_usd, 6)
          : await WalletHelper.toFixedExp(bal_in_usd, 2);
      console.log("bal_in_usd", bal_in_usd);
      if (bal_in_usd >= 10) {
        return res.status(GlblCode.SUCCESS).send({
          status: true,
          code: GlblCode.SUCCESS,
          message: "Going Fine",
        });
      } else {
        let min_balance = await WalletHelper.min_coin_balance(
          wallet_data,
          fiat_currency,
          usd_value
        );
        let coin: string =
          coin_family == 2
            ? "ETH"
            : coin_family == 6
            ? "TRON"
            : coin_family == 1
            ? "BNB"
            : "null";
        let token_type: string =
          coin_family == 2
            ? "ERC20"
            : coin_family == 6
            ? "TRC20"
            : coin_family == 1
            ? "BEP20"
            : "null";
        console.log("coin in wallet_checkFiatsBalance >>>", coin);
        return res.status(GlblCode.SUCCESS).send({
          status: true,
          code: GlblCode.SUCCESS,
          message: language[lang].MIN_BALANCE(
            min_balance.min_bal_in_fiat,
            fiat_currency,
            coin_symbol,
            coin,
            token_type
          ),
        });
      }
    } catch (err: any) {
      console.error("Error in wallet > checkFiatsBalance.", err);
      await commonHelper.save_error_logs(
        "wallet_checkFiatsBalance",
        err.message
      );
      return response.error(res, {
        data: {
          status: false,
          message: language[lang].CATCH_MSG,
        },
      });
    }
  }
  public async allBalances(req: Request, res: Response) {
    let lang: any = req.headers["content-language"] || "en";
    try {
      console.log("req body allBalances >>>", req.body);
      let {
        userIds,
        fiatType,
        fetchFrom,
      }: { userIds: Array<number>; fiatType: string; fetchFrom: string } =
        req.body;

      let checkerWalletData: any = [];
      // let makerWalletData: any = [];
      let where: {
        status: GlblBooleanEnum;
        coin_family?: { [Op.notIn]: number[] };
      } = { status: GlblBooleanEnum.true };
      if (fetchFrom !== undefined && fetchFrom === "extension") {
        where.coin_family = { [Op.notIn]: [config.STATIC_COIN_FAMILY.TRX] };
      }

      let commonPart: any = [
        {
          model: Models.WalletModel,
          attributes: ["wallet_id", "balance", ["user_id", "checker_user_id"]],
          where: where,
          include: [
            {
              model: Models.CoinsModel,
              attributes: ["coin_id"],
              required: true,
              where: { coin_status: GlblBooleanEnum.true },
              include: [
                {
                  model: Models.CoinPriceInFiatModel,
                  as: "fiat_price_data",
                  attributes: ["id", "value"],
                  where: { fiat_type: fiatType },
                  required: false,
                },
              ],
            },
          ],
        },
      ];

      if (userIds.length > 0) {
        commonPart[0].as = "user_wallet_relation";
        checkerWalletData = await Models.UsersModel.findAll({
          attributes: ["user_id"],
          where: { user_id: { [Op.in]: userIds } },
          include: commonPart,
          // logging: true,
          order: [["user_id", "ASC"]],
        });
      }

      return response.success(res, {
        data: {
          status: true,
          // makerUserData: makerWalletData,
          data: checkerWalletData,
        },
      });
    } catch (err: any) {
      console.error("Error in wallet > allBalances", err);
      await commonHelper.save_error_logs("wallet_allBalances", err.message);
      return response.error(res, {
        data: {
          status: false,
          message: language[lang].CATCH_MSG,
        },
      });
    }
  }

  public async nativeCoinBalance(req: Request, res: Response) {
    let lang: any = req.headers["content-language"] || "en";
    try {
      console.log("req body updateBalance >>>", req.body);
      let {
        wallet_address,
        coin_family,
      }: { wallet_address: string; coin_family: number } = req.body;

      const nativeCoinBalance = await Models.CoinsModel.findOne({
        attributes: ["coin_id"],
        where: { coin_family: coin_family, is_token: 0 },
        include: [
          {
            model: Models.WalletModel,
            attributes: ["balance"],
            where: {
              wallet_address: wallet_address,
              coin_family: coin_family,
            },
            as: "wallet_data",
          },
        ],
      });
      return res.status(GlblCode.SUCCESS).send({
        status: true,
        code: GlblCode.SUCCESS,
        message: language[lang].REQUEST_EXECUTED,
        data: nativeCoinBalance,
      });
    } catch (err: any) {
      console.error("Error in wallet > updateBalance.", err);
      await commonHelper.save_error_logs("wallet_updateBalance", err.message);
      let data = {
        code: GlblCode.ERROR_CODE,
        status: false,
        message: language[lang].CATCH_MSG,
      };
      return res.status(data.code).send(data);
    }
  }

  public async coinWalletDetail(req: Request, res: Response) {
    let lang: any = req.headers["content-language"] || "en";
    try {
      let user_id: number = req.userId;
      const {
        wallet_address,
        coin_id,
        cmc_id,
        fiat_currency,
      }: {
        wallet_address: string;
        coin_family: number;
        coin_id: number;
        cmc_id: number;
        fiat_currency: string;
      } = req.body;

      const coinWalletdata = await Models.WalletModel.findOne({
        attributes: ["balance"],
        where: {
          wallet_address: wallet_address,
          coin_id: coin_id,
        },
        include: [
          {
            model: Models.CoinsModel,
            attributes: [
              "token_address",
              "is_token",
              "for_swap",
              "graph_source",
              "graph_pair",
              "pair_address",
            ],
            required: true,
            include: [
              {
                model: Models.SWFTCCoinsDataModel,
                attributes: ["id"],
                as: "cross_chain_data",
                required: false,
              },
              {
                model: Models.WatchlistsModel,
                attributes: ["user_id", "coin_id", "wallet_address", "status"],
                as: "watchlist_data",
                where: {
                  user_id: user_id,
                  wallet_address: wallet_address,
                  status: "1",
                },
                required: false,
              },
            ],
          },
        ],
        // raw: true,
      });
      let graphData: any = [];
      if (cmc_id && fiat_currency) {
        const findGraph = await Models.CoinPriceInFiatGraphModel.findOne({
          where: { cmc_id: cmc_id, fiat_type: fiat_currency, type: "1d" },
        });
        if (findGraph && findGraph?.sparkline) {
          const graphArray = findGraph?.sparkline;
          if (graphArray && graphArray) {
            graphData = await WalletHelper.filterByAgeRange(graphArray, "1d");
            // console.log("graphData :>> ", graphData);
          }
        }
      }
      let ResObj = {
        coinWalletdata,
        graph: graphData,
      };

      return res.status(GlblCode.SUCCESS).send({
        status: true,
        code: GlblCode.SUCCESS,
        message: language[lang].REQUEST_EXECUTED,
        data: ResObj,
      });
    } catch (err: any) {
      console.error("Error in wallet > updateBalance.", err);
      await commonHelper.save_error_logs("coinWalletDetail", err.message);
      let data = {
        code: GlblCode.ERROR_CODE,
        status: false,
        message: language[lang].CATCH_MSG,
      };
      return res.status(data.code).send(data);
    }
  }

  public async downloadCsv(req: Request, res: Response) {
    let lang: any = req.headers["content-language"] || "en";
    try {
      // let id: any = req.params.id;
      let userId: any = req.params.id;
      console.log("req body downloadCsv >>>", req.params);

      let last_month_date: any = moment()
        .subtract(GlblBooleanEnum.true, "months")
        .format("YYYY-MM-DD");
      let wallet_addresses: any = await Models.WalletModel.findAll({
        attributes: ["wallet_address"],
        where: {
          user_id: userId,
        },
        raw: true,
        group: ["wallet_address"],
      });
      let addresses: string[] = [];
      if (wallet_addresses) {
        addresses = wallet_addresses.map(
          (el: { wallet_address: string }) => el.wallet_address
        );
      }
      if (addresses.length == GlblBooleanEnum.false) {
        let data = {
          code: GlblCode.ERROR_CODE,
          status: false,
          message: language[lang].NO_ADDRESS_FOUND,
        };
        return response.error(res, {
          data: data,
        });
      }
      let where_clause: any = {
        [Op.and]: [
          {
            [Op.or]: [
              {
                [Op.and]: [
                  { from_adrs: { [Op.in]: addresses } },
                  { user_id: userId },
                  {
                    [Op.or]: [
                      { blockchain_status: GlblBlockchainTxStatusEnum.PENDING },
                      { blockchain_status: GlblBlockchainTxStatusEnum.FAILED },
                      {
                        blockchain_status: GlblBlockchainTxStatusEnum.CONFIRMED,
                      },
                      { blockchain_status: null },
                    ],
                  },
                ],
              },
              {
                [Op.and]: [
                  { to_adrs: { [Op.in]: addresses } },
                  { to_user_id: userId },
                  { blockchain_status: GlblBlockchainTxStatusEnum.CONFIRMED },
                ],
              },
            ],
          },
          {
            created_at: {
              [Op.gt]: last_month_date,
            },
          },
        ],
      };

      //     let atr: any = [[
      //       Sequelize.literal(`IF(type ='withdraw' OR type = 'deposit',
      //     (IF(FIND_IN_SET(from_adrs, "${addresses.toString()}"),
      //         CONCAT(UCASE(SUBSTRING('withdraw', 1, 1)), SUBSTRING('withdraw', 2)),
      //         CONCAT(UCASE(SUBSTRING('deposit', 1, 1)), SUBSTRING('deposit', 2))
      //     )),
      //     CONCAT(UCASE(SUBSTRING(type, 1, 1)), SUBSTRING(type, 2))
      // )`), 'type'
      //     ], "from_adrs", "to_adrs", "tx_id", "status", "blockchain_status", "amount", "tx_fee", "created_at"];

      let atr: any = [
        [
          Sequelize.literal(`IF(type ='withdraw' OR type = 'deposit',
          (IF(FIND_IN_SET(user_id, "${userId}"),
              CONCAT(UCASE(SUBSTRING('withdraw', 1, 1)), SUBSTRING('withdraw', 2)),
              CONCAT(UCASE(SUBSTRING('deposit', 1, 1)), SUBSTRING('deposit', 2))
          )),CONCAT(UCASE(SUBSTRING(type, 1, 1)), SUBSTRING(type, 2)))`),
          "type",
        ],
        "from_adrs",
        "to_adrs",
        "tx_id",
        "status",
        "blockchain_status",
        "amount",
        "tx_fee",
        "created_at",
      ];

      await Models.TrnxHistoryModel.findAll({
        attributes: atr,
        where: where_clause,
        order: [["created_at", "DESC"]],
      }).then((objs) => {
        let data: any = [];
        objs.forEach((obj) => {
          obj.type =
            obj.type == "Cross_chain"
              ? language[lang].CROSS_CHAIN
              : obj.type == "Dapp"
              ? language[lang].DAPP
              : obj.type == "Deposit"
              ? language[lang].DEPOSIT
              : obj.type == "Swap"
              ? language[lang].SWAP
              : obj.type == "Withdraw"
              ? language[lang].WITHDRAW
              : obj.type == "Approve"
              ? language[lang].APPROVE
              : obj.type == "Buy"
              ? language[lang].BUY
              : obj.type == "Card_fees"
              ? language[lang].CARD_FEES
              : obj.type == "Level_upgradation_fee"
              ? language[lang].LEVEL_UPGRADE
              : language[lang].CARD_RECHARGE;
          obj.status =
            obj.status == "completed"
              ? language[lang].COMPLETED
              : language[lang].FAILED_STATUS;
          obj.blockchain_status =
            obj.blockchain_status == "confirmed"
              ? language[lang].CONFIRMED
              : obj.blockchain_status == "failed"
              ? language[lang].FAILED_STATUS
              : language[lang].PENDING_STATUS;
          const {
            type,
            from_adrs,
            to_adrs,
            tx_id,
            status,
            blockchain_status,
            amount,
            tx_fee,
            created_at,
          }: any = obj;
          data.push({
            type,
            from_adrs,
            to_adrs,
            tx_id,
            status,
            blockchain_status,
            amount,
            tx_fee,
            created_at,
          });
        });
        const opts = {
          fields: [
            { label: `${language[lang].TYPE}`, value: "type" },
            { label: `${language[lang].FROM_ADRS}`, value: "from_adrs" },
            { label: `${language[lang].TO_ADRS}`, value: "to_adrs" },
            { label: `${language[lang].TX_ID}`, value: "tx_id" },
            { label: `${language[lang].STATUS}`, value: "status" },
            {
              label: `${language[lang].BLOCKCHAIN_STATUS}`,
              value: "blockchain_status",
            },
            { label: `${language[lang].AMOUNT}`, value: "amount" },
            { label: `${language[lang].TRNX_FEE}`, value: "tx_fee" },
            { label: `${language[lang].CREATED}`, value: "created_at" },
          ],
        };
        const parser = new Parser(opts);
        const csvData = parser.parse(data);
        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
          "Content-Disposition",
          "attachment; filename=transaction_history.csv"
        );
        res.status(GlblCode.SUCCESS).end(csvData);
      });
    } catch (err: any) {
      console.error("Error in wallet > downloadCsv.", err);
      await commonHelper.save_error_logs("wallet_downloadCsv", err.message);
      let data = {
        code: GlblCode.ERROR_CODE,
        status: false,
        message: language[lang].CATCH_MSG,
      };
      return res.status(data.code).send(data);
    }
  }

  public async rpcBalance(req: Request, res: Response) {
    const lang: string = req.headers["content-language"] || "en";
    try {
      const {
        wallet_address,
        coin_id,
      }: { wallet_address: string; coin_id: number } = req.body;
      const coinData: any = await Models.CoinsModel.findOne({
        attributes: ["token_address", "is_token", "coin_family"],
        where: { coin_id },
      });
      if (!coinData) {
        return res.status(GlblCode.ERROR_CODE).send({
          status: false,
          code: GlblCode.ERROR_CODE,
          message: language[lang].COIN_NOT_FOUND,
        });
      }
      const addressValidity: any = await global_helper.validate_address(
        wallet_address,
        coinData.coin_family
      );
      // console.log('addressValidity >>>', addressValidity);
      if (!addressValidity)
        throw new Error(`${language[lang].INVALID_ADDRESS}`);

      // Get wallet balance from global helper
      let balDetails: any = await global_helper.getWalletBalance(
        coinData,
        wallet_address
      );
      console.log("balDetails >>>", balDetails);
      let balance: string = "0";
      if (balDetails.status) {
        balance = balDetails.balance;
      } else {
        const walletData: any = await Models.WalletModel.findOne({
          attributes: ["balance"],
          where: {
            wallet_address,
            coin_id,
          },
        });
        balance = walletData ? walletData.balance : "0";
      }

      return res.status(GlblCode.SUCCESS).send({
        status: true,
        code: GlblCode.SUCCESS,
        message: language[lang].REQUEST_EXECUTED,
        data: balance,
      });
    } catch (err: any) {
      console.error("Error in wallet > rpcBalance:", err);

      // Log the error to the error logs
      await commonHelper.save_error_logs("rpcBalance", err.message);
      let message = err.message ? err.message : language[lang].CATCH_MSG;
      return res.status(GlblCode.ERROR_CODE).send({
        code: GlblCode.ERROR_CODE,
        status: false,
        message: message,
      });
    }
  }

  /**
   * nft list api
   */
  public nfts_from_moralis = async (req: Request, res: Response) => {
    try {
      let address_list = req.body.address_list ? req.body.address_list : [];
      // let chains = [{ 'chain': 'ethereum', 'type': 'goerli', 'symbol': 'eth' }, { 'chain': 'binance', 'type': 'bsc testnet', 'symbol': 'bnb' }];
      // // let chains = [
      // //     { 'chain': 'ethereum', 'type': 'testnet', 'symbol': 'eth' },
      // //     { 'chain': 'binance', 'type': 'testnet', 'symbol': 'bnb' },
      // // ];
      // if (config.SERVER == 'dev' || config.SERVER == 'prod') {
      //let chains = [{ 'chain': 'ethereum', 'type': 'eth', 'symbol': 'eth' }, { 'chain': 'binance', 'type': 'bsc', 'symbol': 'bnb' }]
      let chains = [{ chain: "ethereum", type: "eth", symbol: "eth" }];
      // chains = [
      //     { 'chain': 'ethereum', 'type': 'mainnet', 'symbol': 'eth' },
      //     { 'chain': 'binance', 'type': 'mainnet', 'symbol': 'bnb' },
      // ]
      // }
      if (address_list?.length > 0) {
        let nfts: any = [];
        for await (let data of address_list) {
          let symbol = data.coin_symbol;
          let address = data.wallet_address;
          let coin_family = data?.coin_family;
          let chain_data = chains.filter((chain) => chain.symbol == symbol)[0];
          // if (symbol.toUpperCase() == 'ETH' || symbol.toUpperCase() == 'BNB') {
          if (symbol.toUpperCase() == "ETH") {
            try {
              let method = "get";
              let url = `https://deep-index.moralis.io/api/v2/${address}/nft?chain=${chain_data.type}&format=decimal&media_items=true`;
              let headers = { "X-API-Key": config.KEYS.MORALIS };
              // let url = `https://app.zeeve.io/shared-api/blockchain-data/${chain_data.chain}/${chain_data.type}/api/v1/walletNFT/${address}`;
              // let headers = { 'Authorization': config.KEYS.ZEEVE }
              let result: any = await global_helper.get_nft_data(
                method,
                url,
                headers
              );
              if (result && result?.result?.length) {
                for await (let nft of result.result) {
                  if (nft?.possible_spam == true) {
                    continue;
                  }
                  let metadata: any = "";
                  if (nft?.metadata) {
                    metadata = await JSON.parse(nft.metadata);
                  }

                  let nftImage = null;
                  if (nft?.media?.status == "success") {
                    nftImage =
                      nft?.media?.media_collection?.medium?.url ||
                      nft?.media?.original_media_url;
                  }
                  let nftObj: any = {
                    token_address: nft.token_address,
                    token_type: nft.contract_type,
                    token_id: nft.token_id,
                    amount: nft.amount,
                    owner_of: nft.owner_of,
                    token_uri: nft.token_uri || "",
                    coin_family: coin_family
                      ? coin_family
                      : config.STATIC_COIN_FAMILY[symbol.toLowerCase()],
                    name:
                      nft.name !== undefined && nft.name !== null
                        ? nft.name
                        : metadata != "" && metadata.name
                        ? metadata.name
                        : null,
                    symbol:
                      nft.symbol !== undefined && nft.symbol !== null
                        ? nft.symbol
                        : metadata != "" && metadata?.symbol
                        ? metadata.symbol
                        : null,
                    // image: metadata != '' && metadata.image ? metadata.image : null,
                    image:
                      nftImage !== null
                        ? nftImage
                        : metadata != "" && metadata.image
                        ? metadata.image
                        : null,
                    description:
                      metadata != "" && metadata.description
                        ? metadata.description
                        : null,
                    attributes:
                      metadata != "" && metadata.attributes
                        ? metadata.attributes
                        : null,
                  };
                  let findNft: any = await Models.NFTModelModel.findOne({
                    attributes: ["image", "image_extension", "text_data"],
                    where: {
                      wallet_address: { [Op.like]: address },
                      token_id: nftObj.token_id.toString(),
                      token_address: { [Op.like]: nftObj.token_address },
                    },
                    raw: true,
                  });

                  if (nftObj?.image && findNft?.image_extension == null) {
                    let tokenImage: any = nftObj?.image;
                    let image_data: any = await global_helper.check_nft_image(
                      tokenImage
                    );
                    let image_extension: string | null = null;
                    let text_data: string | null = null;
                    if (
                      !image_data.status &&
                      nftObj?.image.indexOf("ipfs") > -1
                    ) {
                      let imageHash = nftObj?.image?.substring(
                        nftObj?.image.lastIndexOf("/") + 1,
                        nftObj?.image?.length
                      );
                      tokenImage = `https://gateway.ipfs.io/ipfs/${imageHash}`;
                      image_data = await global_helper.check_nft_image(
                        tokenImage
                      );
                      if (!image_data.status) {
                        let ipfs_image = await global_helper.get_ipfs_image(
                          nftObj?.image
                        );
                        tokenImage = ipfs_image !== "" ? ipfs_image : null; //nftObj.token_uri;
                        image_data = await global_helper.check_nft_image(
                          tokenImage
                        );
                        if (!image_data.status) {
                          tokenImage = null;
                          image_extension = null;
                          text_data = null;
                        } else {
                          image_extension = image_data.imgExtension;
                          text_data =
                            image_data.text_data !== ""
                              ? image_data.text_data
                              : null;
                        }
                      } else {
                        image_extension = image_data.imgExtension;
                        text_data =
                          image_data.text_data !== ""
                            ? image_data.text_data
                            : null;
                      }
                    } else {
                      let ipfs_image = await global_helper.get_ipfs_image(
                        tokenImage
                      );
                      tokenImage = ipfs_image !== "" ? ipfs_image : tokenImage;
                      image_extension = image_data.imgExtension;
                      text_data =
                        image_data.text_data !== ""
                          ? image_data.text_data
                          : null;
                    }
                    nftObj.image = tokenImage;
                    nftObj.image_extension = image_extension;
                    nftObj.text_data = text_data;
                  } else if (
                    nftObj?.token_uri &&
                    findNft?.image_extension == null
                  ) {
                    let token_uri_fetch: any =
                      await global_helper.check_nft_token_uri(
                        nftObj?.token_uri
                      );
                    let image_data: any | null = null;
                    if (token_uri_fetch) {
                      image_data = await global_helper.check_nft_image(
                        token_uri_fetch?.image
                      );
                    }
                    nftObj.image = token_uri_fetch?.image || null;
                    nftObj.image_extension =
                      (image_data && image_data?.imgExtension) || null;
                    nftObj.text_data =
                      image_data && image_data.text_data !== ""
                        ? image_data.text_data
                        : null;
                  } else {
                    nftObj.image =
                      findNft && findNft?.image ? findNft.image : null;
                    nftObj.image_extension =
                      findNft && findNft?.image_extension
                        ? findNft?.image_extension
                        : null;
                    nftObj.text_data =
                      findNft && findNft?.text_data ? findNft?.text_data : null;
                  }
                  let findCoin = await Models.CoinsModel.findOne({
                    attributes: ["coin_id", "coin_symbol", "coin_name"],
                    where: {
                      token_address: { [Op.like]: nftObj.token_address },
                      token_type: nftObj.token_type,
                    },
                    raw: true,
                  });
                  let coin_data: any = {};
                  /** save token if not exist */
                  if (!findCoin) {
                    let save_coin_data = await Models.CoinsModel.create({
                      coin_name: nftObj.name,
                      coin_symbol: nftObj.symbol
                        ? nftObj.symbol.toLowerCase()
                        : null,
                      coin_image: null,
                      coin_family: coin_family
                        ? coin_family
                        : config.STATIC_COIN_FAMILY[symbol.toLowerCase()],
                      coin_status: 1,
                      is_token: 1,
                      token_type:
                        nft.contract_type == "ERC1155"
                          ? TokenType.ERC1155
                          : TokenType.ERC721,
                      decimals: 0,
                      token_address: nftObj.token_address,
                      is_on_trading_view: 0,
                    });
                    /** update into redis*/
                    await WalletHelper.update_nft_token_in_redis(
                      save_coin_data
                    );
                    coin_data = {
                      coin_id: save_coin_data.coin_id,
                      coin_symbol: nftObj.symbol
                        ? nftObj.symbol.toLowerCase()
                        : null,
                      coin_name: nftObj.name,
                    };
                  } else {
                    coin_data = findCoin;
                  }
                  nftObj.nft_coin_data = coin_data;

                  /** save nft if not exist in wallet */
                  if (!findNft) {
                    let user_id = req.userId;
                    const nftTokenData: Interfaces.NFTInterface = {
                      user_id: user_id,
                      wallet_address: address,
                      token_id: nftObj.token_id.toString(),
                      token_address: nftObj.token_address,
                      coin_family: coin_family
                        ? coin_family
                        : config.STATIC_COIN_FAMILY[symbol.toLowerCase()],
                      image: nftObj?.image,
                      description: nftObj.description,
                      attributes: nftObj.attributes,
                      token_uri: nftObj.token_uri,
                      name: nftObj.name,
                      available: 1,
                      image_extension: nftObj.image_extension,
                      text_data: nftObj.text_data,
                      balance:
                        nft.contract_type == "ERC1155" ? nftObj.amount : null,
                      token_type:
                        nft.contract_type == "ERC1155"
                          ? TokenType.ERC1155
                          : TokenType.ERC721,
                    };
                    await Models.NFTModelModel.create(nftTokenData);
                  } else {
                    /** update nft if not exist */
                    let nftTokenData: any = {
                      description: nftObj.description,
                      attributes: nftObj.attributes,
                      token_uri: nftObj.token_uri,
                      name: nftObj.name,
                      balance:
                        nft.contract_type == "ERC1155" ? nftObj.amount : null,
                    };
                    if (
                      findNft.image == null ||
                      findNft.image_extension == null
                    ) {
                      nftTokenData.image = nftObj?.image;
                      nftTokenData.image_extension = nftObj.image_extension;
                      nftTokenData.text_data = nftObj.text_data;
                    }
                    await Models.NFTModelModel.update(nftTokenData, {
                      where: {
                        wallet_address: address,
                        token_id: nftObj.token_id.toString(),
                        token_address: nftObj.token_address,
                      },
                    });
                  }
                  nfts.push(nftObj);
                }
              } else {
                console.log("🔥 ~ ~ NFT not found.", symbol.toUpperCase());
                await Models.NFTModelModel.destroy({
                  where: { wallet_address: address, coin_family: coin_family },
                });
              }
            } catch (error) {
              console.log("🔥 ~ ~ nfts_from_moralis axios error", error);
            }
          }
        }
        return response.success(res, {
          data: {
            success: true,
            data: nfts,
            message: "Success",
          },
        });
      }
    } catch (err) {
      console.log("🔥 ~ ~ nfts_from_moralis error", err);
      let data = {
        code: GlblCode.ERROR_CODE,
        status: false,
        data: err,
      };
      return res.status(data.code).send(data);
    }
  };

  public async tradingView(req: Request, res: Response) {
    try {
      const symbol: any = req.query.symbol;
      const tradingData = await global_helper.getTradingSource(symbol);
      console.log("tradingData >>>", tradingData);
      return res.status(GlblCode.SUCCESS).send({
        status: true,
        code: GlblCode.SUCCESS,
        message: "Source has been fetch successfully",
        data: tradingData,
      });
    } catch (error) {
      let data = {
        code: GlblCode.ERROR_CODE,
        status: false,
        data: error,
      };
      return res.status(data.code).send(data);
    }
  }
  public async solBalance(req: Request, res: Response) {
    try {
      const address: any = req.query.address;
      const is_token: any = req.query.is_token;
      let tradingData: any = "";
      if (is_token) {
        console.log("token >>>");
        const token_address: any = req.query.token_address;
        tradingData = await SolanaHelper.getUserCRC20TokenBalance(
          token_address,
          address,
          false
        );
      } else {
        tradingData = await SolanaHelper.getUserSolanaBalance(
          address,
          true,
          true
        );
        console.log("tradingData >>>", tradingData);
      }

      return res.status(GlblCode.SUCCESS).send({
        status: true,
        code: GlblCode.SUCCESS,
        message: "Source has been fetch successfully",
        data: tradingData,
      });
    } catch (error) {
      let data = {
        code: GlblCode.ERROR_CODE,
        status: false,
        data: error,
      };
      return res.status(data.code).send(data);
    }
  }

  public async getCoinGraphData(req: Request, res: Response) {
    try {
      const cmcId: number = req.body.cmc_id;
      const fiat_currency: string = req.body.fiat_currency || "USD";
      const duration: string = req.body.duration || "1d";

      let graphData = await Models.CoinPriceInFiatGraphModel.findAll({
        where: {
          cmc_id: cmcId,
          fiat_type: fiat_currency,
          type: duration,
        },
      });

      return res.status(GlblCode.SUCCESS).send({
        status: true,
        code: GlblCode.SUCCESS,
        message: "Graph data has been fetch successfully",
        data: graphData,
      });
    } catch (error) {
      let data = {
        code: GlblCode.ERROR_CODE,
        status: false,
        data: error,
      };
      return res.status(data.code).send(data);
    }
  }

  public async saveDeviceToken(req: Request, res: Response) {
    try {
      let lang: string = req.headers["content-language"] || "en";

      let {
        addressList,
        device_token,
        device_id,
      }: {
        addressList: any;
        device_token: string;
        device_id: string;
      } = req.body;

      if (!addressList && !addressList.length) {
        let data = {
          code: GlblCode.ERROR_CODE,
          status: false,
        };
        return res.status(data.code).send(data);
      }

      for await (const wallet of addressList) {
        if (device_token !== "chrome" && device_token !== "abc") {
          let address: string = wallet.address;
          let coin_family: number = wallet.coin_family;
          await userhelper.device_token_helper(
            device_token,
            req.userId,
            lang,
            address,
            coin_family,
            device_id
          );
        }
      }

      return res.status(GlblCode.SUCCESS).send({
        status: true,
        code: GlblCode.SUCCESS,
        message: "Device token has been saved successfully",
      });
    } catch (error) {
      let data = {
        code: GlblCode.ERROR_CODE,
        status: false,
        data: error,
      };
      return res.status(data.code).send(data);
    }
  }
}

export const walletController = new WalletController();
