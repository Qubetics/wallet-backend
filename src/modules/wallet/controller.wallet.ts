import { Request, Response } from "express";
import { Op, Sequelize } from "sequelize";
import response from "../../helpers/response/response.helpers";
import { OnlyControllerInterface } from "../../interfaces/controller.interface";
import { config } from "../../config";
import { WalletHelper } from "./wallet.helpers";
import * as Models from "../../models/model/index";
import * as Interfaces from "../../models/interface/index.interface";
import {
  GlblBooleanEnum,
  GlblCode,
  GlblMessages,
  Fiat_Currency,
  GlblBlockchainTxStatusEnum,
  TxTypesEnum,
  TokenType,
  NFTObject,
  PopulateNFTContext,
} from "../../constants/global_enum";
import { global_helper } from "../../helpers/common/global_helper";
import { language } from "../../constants";
import commonHelper from "../../helpers/common/common.helpers";
import { coin_queries, wallet_queries } from "../../helpers/dbHelper/index";
import userhelper from "../user/helper";
import kafka_helper from "../../helpers/common/kafka_helper";
import redisClient from "../../helpers/common/redis";

class WalletController implements OnlyControllerInterface {
  constructor() {
    this.initialize();
  }
  public initialize() {
    setTimeout(async () => {
      try {
        const consumer = await kafka_helper.kafka.consumer({ groupId: "wallet-balance-sync-group" });
        await consumer.subscribe({ topic: config.BALANCE_SYNC_TOPIC, fromBeginning: false });
        await consumer.run({
          eachMessage: async ({ message }: { message: any }) => {
            try {
              const data = JSON.parse(message.value.toString());
              const balDetails: any = await global_helper.get_wallet_balance(data.coin_data, data.wallet_address);
              if (balDetails.status) {
                await wallet_queries.wallet_update(
                  { balance: Number(balDetails.balance) },
                  { wallet_id: data.wallet_id }
                );
              }
              console.log(`Balance sync consumer: wallet_id=${data.wallet_id} balance=${balDetails.balance} status=${balDetails.status}`);
            } catch (err: any) {
              console.error("Balance sync consumer error:", err.message);
            }
          },
        });
      } catch (err: any) {
        console.error("Failed to start balance sync Kafka consumer:", err.message);
      }
    }, 10000);
  }

  /** Used in front end */
  public async addToken(req: Request, res: Response) {
    let lang: any = req.headers["content-language"] || "en";
    try {
      console.log("req body addToken >>>", req.body);
      const currentUTCDate: string = new Date()
        .toISOString()
        .replace(/T/, " ")
        .replace(/\..+/, "");

      const {
        coin_family,
        token_type,
        token_address,
        name,
        symbol,
        decimals,
        wallet_address,
        wallet_name
      }: {
        coin_family: number;
        token_type: string;
        token_address: string;
        name: string;
        symbol: string;
        decimals: string;
        wallet_address: string;
        wallet_name: string;
      } = req.body;

      let parseDecimals = await WalletHelper.parsePossiblyQuotedNumber(decimals);
      console.log('parseDecimals >>>', parseDecimals);

      let coinDataExist: any = await coin_queries.coin_find_one(
        [
          "coin_id",
          "coin_status",
          "added_by",
          "coin_family",
          "token_address",
          "is_token",
          "token_type",
          "decimals",
          "coin_symbol",
          "for_swap",
          "added_by",
        ],
        { coin_family: coin_family, token_address: token_address }
      );

      if (coinDataExist) {
        if (coinDataExist.coin_status == 0) {
          await coin_queries.coin_update(
            { coin_status: 1 },
            { coin_id: coinDataExist.coin_id }
          );

          const redisCoinData = {
            coin_id: coinDataExist.coin_id,
            is_token: coinDataExist.is_token,
            token_address: coinDataExist.token_address,
            coin_family: coinDataExist.coin_family,
            decimals: coinDataExist.decimals,
            token_type: coinDataExist.token_type,
            coin_symbol: coinDataExist.coin_symbol,
            added_by: coinDataExist.added_by,
            for_swap: coinDataExist.for_swap
          }

          await WalletHelper.update_token_in_redis_hash(redisCoinData);
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
        const response: any = await WalletHelper.add_coin_to_table(
          token_address,
          symbol,
          name,
          coin_family,
          token_type,
          parseDecimals,
          lang,
          currentUTCDate,
          req.userId
        );
        coinDataExist = response.coinData;
      }

      if (
        coin_family == config.STATIC_COIN_FAMILY.ETH ||
        coin_family == config.STATIC_COIN_FAMILY.BNB ||
        coin_family == config.STATIC_COIN_FAMILY.SOL ||
        coin_family == config.STATIC_COIN_FAMILY.POL
      ) {
        const redis_token_data: any = {
          coin_family: coin_family,
          token_address: token_address,
        };

        await kafka_helper.produceMessage(
          config.MORALIS_TRADINGVIEW_TOPIC,
          redis_token_data
        );
      }

      const message: string = await WalletHelper.create_wallet_for_coin(
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
        data: { status: true, message: message },
      });

    } catch (err: any) {
      console.error("Error in wallet > addToken.", err);
      await commonHelper.save_error_logs("wallet_addToken", err.message);
      throw language[lang].CATCH_MSG;
    }
  }
  public async portfolio(req: Request, res: Response) {
    const lang: any = req.headers["content-language"] || "en";
    try {
      const {
        page,
        limit
      }: { page: number | string; limit: number | string } = req.body;

      const fiat_type: string = req.body.fiat_type == undefined ? Fiat_Currency.USD : req.body.fiat_type;

      const search = req.body.search?.trim();
      const pageNo: any = parseInt(page as string) || GlblBooleanEnum.true;
      const limitNo: any = parseInt(limit as string) || 10;
      const isBalanced: boolean = req.body.is_balanced ? req.body.is_balanced : false;
      let offset: number = GlblBooleanEnum.false;
      if (pageNo != GlblBooleanEnum.true) {
        offset = (pageNo - GlblBooleanEnum.true) * limitNo;
      }
      const user_id: number = req.userId;
      const customTokenCoinIds = await Models.CustomTokennModel.findAll({
        attributes: ['coin_id'],
        where: { user_id },
        raw: true
      });

      const coinIds = customTokenCoinIds.map(token => token.coin_id);
      let coinfamiles: any[] = req.body.coin_family || [];
      if (!coinfamiles.includes(7)) {
        coinfamiles.push(7);
      }
      const whereClause: any = {
        coin_status: GlblBooleanEnum.true,
        coin_family: { [Op.in]: coinfamiles },
        [Op.and]: [
          {
            [Op.or]: [
              { token_type: null },
              {
                token_type: {
                  [Op.notIn]: ['BEP721', 'ERC721']
                }
              }
            ]
          },
          {
            [Op.or]: [
              { added_by: 'admin' },
              {
                coin_id: {
                  [Op.in]: coinIds
                }
              }
            ]
          }
        ],
      };

      if (search) {
        whereClause[Op.or] = [
          { coin_name: { [Op.like]: `%${search}%` } },
          { coin_symbol: { [Op.like]: `%${search}%` } }
        ];
      }

      const wallets: any = await Models.WalletModel.findAndCountAll({
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
          user_id: user_id,
          wallet_address: { [Op.in]: req.body.addressListKeys },
          status: GlblBooleanEnum.true,
          [Op.and]: isBalanced ? { balance: { [Op.gt]: 0 } } : {}
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
              "is_on_moralis_inactive",
              "cmc_id",
            ],
            required: true,
            where: whereClause,
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
        order: [
          [Sequelize.col('sort_order'), 'ASC'],
          [
            Sequelize.fn('COALESCE',
              Sequelize.literal("`coin->fiat_price_data`.`value` * `wallets`.`balance`"),
              0
            ),
            'DESC'
          ],
          [Sequelize.col('wallets.created_at'), 'ASC']
        ],
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
      const currentUTCDate: string = new Date().toISOString().replace(/T/, " ").replace(/\..+/, "");

      const {
        coinId,
        walletAddress,
        isActive,
      }: { coinId: number; walletAddress: string; isActive: any } = req.body;

      const userId: number = req.userId;
      let message: string;


      const coin_data: any = await coin_queries.coin_find_one(["coin_id", "coin_family", "is_token", "token_address", "token_type"], {
        coin_id: coinId,
      });

      if (!coin_data) {
        const err: string = language[lang].COIN_NOT_FOUND;
        throw new Error(err);
      }
      let balDetails: any = { status: false, balance: 0 };
      if (isActive == GlblBooleanEnum.true) {
        balDetails = await global_helper.get_wallet_balance(
          coin_data,
          walletAddress
        );
      }
      const wallet_exist: any = await wallet_queries.wallet_find_one(
        ["wallet_id"],
        { wallet_address: walletAddress, coin_id: coinId }
      );
      if (!wallet_exist) {
        const wallet_data: any = await wallet_queries.wallet_find_one(
          ["wallet_id", "wallet_name"],
          { wallet_address: walletAddress }
        );

        if (!wallet_data) {
          const wallet_ex: any = await wallet_queries.wallet_find_one(
            ["wallet_id", "wallet_name"],
            { user_id: userId }
          );

          console.log("wallet_ex__wallet_name >>>wallet_exwallet_exwallet_ex", wallet_ex);
          const obj: any = {
            user_id: userId,
            coin_family: coin_data.coin_family,
            wallet_name: wallet_ex?.wallet_name
              ? wallet_ex.wallet_name
              : null,
            wallet_address: walletAddress,
            coin_id: coinId,
            balance: balDetails.status ? balDetails.balance : "0",
            default_wallet: GlblBooleanEnum.true,
            status: GlblBooleanEnum.true,
            created_at: currentUTCDate,
            updated_at: currentUTCDate,
          };
          await wallet_queries.wallet_create(obj);
          await userhelper.update_wallet_address_list(
            coin_data.coin_family,
            walletAddress,
            userId,
            wallet_ex?.wallet_name
              ? wallet_ex.wallet_name
              : null
          );
        }
        else {
          console.log("wallet_name >>>", wallet_data);
          const obj: any = {
            user_id: userId,
            coin_family: coin_data.coin_family,
            wallet_name: wallet_data?.wallet_name
              ? wallet_data.wallet_name
              : null,
            wallet_address: walletAddress,
            coin_id: coinId,
            balance: balDetails.status ? balDetails.balance : "0",
            default_wallet: GlblBooleanEnum.true,
            status: GlblBooleanEnum.true,
            created_at: currentUTCDate,
            updated_at: currentUTCDate,
          };
          await wallet_queries.wallet_create(obj);
          await userhelper.update_wallet_address_list(
            coin_data.coin_family,
            walletAddress,
            userId,
            wallet_data?.wallet_name
              ? wallet_data.wallet_name
              : null
          );
        }
      } else {
        const update_wallet_data: any = { status: isActive };
        if (isActive == GlblBooleanEnum.true && balDetails.status) {
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
      if (isActive == GlblBooleanEnum.true && balDetails.status == false) {
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
      }
      return response.success(res, {
        data: {
          status: true,
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
        data: { status: false, message: language[lang].CATCH_MSG, data: {} },
      });
    }
  }

  public async toggleCoinList(req: Request, res: Response) {
    let lang: any = req.headers["content-language"] || "en";
    try {
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
      let coinfamiles: any[] = req.body.coinFamilyKeys || [];
      if (!coinfamiles.includes(7)) {
        coinfamiles.push(7);
      }
      const search = req.body.search?.trim();

      const pageNo: any = parseInt(page as string) || GlblBooleanEnum.true;
      const limitNo: any = parseInt(limit as string) || 10;
      let offset: number = GlblBooleanEnum.false;
      if (pageNo != GlblBooleanEnum.true) {
        offset = (pageNo - GlblBooleanEnum.true) * limitNo;
      }
      const customTokenCoinIds = await Models.CustomTokennModel.findAll({
        attributes: ['coin_id'],
        where: { user_id: req.userId },
        raw: true
      });

      const coinIds = customTokenCoinIds.map(token => token.coin_id);
      const whereClause: any = {
        coin_status: GlblBooleanEnum.true,
        coin_family: { [Op.in]: coinfamiles },
        [Op.and]: [
          {
            [Op.or]: [
              { token_type: null },
              {
                token_type: {
                  [Op.notIn]: ['BEP721', 'ERC721']
                }
              }
            ]
          },
          {
            [Op.or]: [
              { added_by: 'admin' },
              {
                coin_id: {
                  [Op.in]: coinIds
                }
              }
            ]
          }
        ]
      };

      if (search) {
        whereClause[Op.or] = [
          { coin_name: { [Op.like]: `%${search}%` } },
          { coin_symbol: { [Op.like]: `%${search}%` } }
        ];
      }

      const data: any = await Models.CoinsModel.findAndCountAll({
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
        where: whereClause,
        include: [
          {
            model: Models.WalletModel,
            attributes: [
              "wallet_address",
              [Sequelize.fn('COALESCE',
                Sequelize.col('status'),
                0
              ), 'status']
            ],
            where: {
              user_id: req.userId,
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
          // First prioritize active wallets (status = 1)
          [Sequelize.col('wallet_data.status'), 'DESC'],
          // Then sort by coin_id
          [Sequelize.col('coins.coin_id'), 'ASC']
        ],
        limit: limitNo,
        offset: offset,
      });
      const objData: any = {
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
      const address_list: any = req.body.addrsListKeys ? req.body.addrsListKeys : [];
      const fiat_currency: string = String(
        req.body.fiat_currency ? req.body.fiat_currency : Fiat_Currency.USD
      );
      const search = req.body.search?.trim();
      const limit: number = Number(
        req.body.limit == undefined ? (req.body.limit = "25") : req.body.limit
      );
      const page: number = Number(
        req.body.page == undefined ? (req.body.page = "1") : req.body.page
      );
      const offset: number = (page - GlblBooleanEnum.true) * limit;
      const coin_id: number = req.body.coin_id == undefined ? (req.body.coin_id = GlblBooleanEnum.false) : req.body.coin_id;
      const status: GlblBlockchainTxStatusEnum = req.body.status == undefined ? (req.body.status = null) : req.body.status;
      const date_from: number = req.body.date_from ? req.body.date_from : null;
      const date_to: number = req.body.date_to ? req.body.date_to : null;
      const type: any = req.body.trnx_type ? req.body.trnx_type : "all";
      const coin_family: any = req.body.coin_family ? req.body.coin_family : [];

      if (coin_family.length > 1 && !coin_family.includes(7)) {
        coin_family.push(7);
      }


      const userId: number = req.userId;

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
              {
                [Op.or]: [
                  { merchant_id: { [Op.not]: null } },
                  { blockchain_status: GlblBlockchainTxStatusEnum.CONFIRMED }
                ]
              }
            ],
          },
        ],
      };

      const replacements = { userId: userId }
      const attr: any = [
        "id",
        [
          Sequelize.literal(`(
            CASE 
              WHEN type IN ('withdraw', 'deposit') AND user_id = :userId THEN 'withdraw'
              WHEN type IN ('withdraw', 'deposit') AND to_user_id = :userId THEN 'deposit'
              ELSE type
            END
          )`),
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
      ];

      if (type == TxTypesEnum.DEPOSIT) {

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
      }
      let coin_where: any = "";
      if (coin_id > GlblBooleanEnum.false) {
        coin_where = { coin_id: coin_id };
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
                [Op.like]: `%${search}%`
              },
              coin_symbol: {
                [Op.like]: `%${search}%`
              },
            },
          },
        };
      }
        
      if (type == TxTypesEnum.CHAIN_ABSTRACTION) {
        where_clause = {
          ...where_clause,
          type: TxTypesEnum.CHAIN_ABSTRACTION,
        };
      }

      if(type == "all") {
        where_clause = {
          ...where_clause,
          type: { [Op.not]: TxTypesEnum.CHAIN_ABSTRACTION },
        };
      }

      const query: any = {
        attributes: attr,
        where: where_clause,
        include: [
          {
            model: Models.CoinsModel,
            attributes: ["coin_symbol", "coin_name"],
            as: "coin_data",
            where: coin_where || {},
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
      const transaction_data: any = await Models.TrnxHistoryModel.findAndCountAll(
        { ...query, replacements }
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
    const lang: any = req.headers["content-language"] || "en";
    try {
      console.log("req body updateWalletOrder >>>", req.body);
      const { wallets }: any = req.body;

      if (wallets.length == 0) {
        return response.error(res, {
          data: {
            status: false,
            message: language[lang].NO_WALLETS_PROVIDED,
          },
        });
      }

      const walletAddress = wallets[0].wallet_address;
      const checkAddress = await wallet_queries.wallet_find_one(
        ["wallet_id", "user_id"],
        { wallet_address: walletAddress }
      );

      if (!checkAddress || checkAddress.user_id !== req.userId) {
        return response.error(res, {
          data: {
            code: GlblCode.ERROR_CODE,
            status: false,
            message: language[lang].UNAUTHORIZED_ACCESS,
          },
        });
      }

      for await (let wallet of wallets) {
        await wallet_queries.wallet_update(
          { sort_order: wallet.order },
          {
            coin_id: wallet.coin_id,
            wallet_address: wallet.wallet_address,
          }
        );
      }
      return response.success(res, { data: { status: true, message: language[lang].UPDATED } });
    } catch (err: any) {
      console.error("Error in wallet > updateWalletOrder.", err);
      await commonHelper.save_error_logs(
        "wallet_updateWalletOrder",
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
  public async searchToken(req: Request, res: Response) {
    const lang: string = (req.headers["content-language"] as string) || "en";

    try {
      console.log("req body searchToken >>>", req.body);

      const {
        tokenAddress,
        coinFamily,
      }: { tokenAddress: string; coinFamily: number } = req.body;

      if (!tokenAddress || !coinFamily) {
        return response.error(res, {
          data: { status: false, message: language[lang].INVALID_TOKEN, data: {} },
        });
      }

      const redisKey = `${config.SEARCH_TOKEN}_${coinFamily}`;
      const tokenDetailsStr = await redisClient.getKeyValuePair(redisKey, tokenAddress.toUpperCase());

      let tokenDetails: { decimals: string; name: string; symbol: string };

      if (tokenDetailsStr) {
        tokenDetails = JSON.parse(tokenDetailsStr);
      } else {
        tokenDetails = await global_helper.return_decimals_name_symbol(
          coinFamily,
          tokenAddress,
          lang
        );

        if (!tokenDetails) {
          return response.error(res, {
            data: { status: false, message: language[lang].INVALID_TOKEN, data: {} },
          });
        }

        tokenDetails.decimals = tokenDetails.decimals.toString();
        await redisClient.set_hash_table(redisKey, tokenAddress, JSON.stringify(tokenDetails), 3600);
      }

      if (
        Object.keys(tokenDetails).length !== 0 &&
        tokenDetails.constructor === Object
      ) {

        return response.success(res, {
          data: {
            status: true,
            message: language[lang].TOKENS_SEARCH,
            data: tokenDetails,
          },
        });
      }

      return response.error(res, {
        data: { status: false, message: language[lang].TOKENS_NOT_FOUND, data: {} },
      });
    } catch (err: any) {
      console.error("Error in wallet > searchToken.", err);
      await commonHelper.save_error_logs("wallet_searchToken", err.message);
      return response.error(res, {
        data: {
          status: false,
          message: language[lang].CATCH_MSG
        },
      });
    }
  }

  public async swapList(req: Request, res: Response) {
    let lang: any = req.headers["content-language"] || "en";
    try {
      const coin_family: [] = req.body.coin_family;
      const addresses: [] = req.body.addrsListKeys;
      const fiat_type: string = req.body.fiat_type;
      const coin_id: number = req.body.coin_id || null;
      const customTokenCoinIds = await Models.CustomTokennModel.findAll({
        attributes: ['coin_id'],
        where: { user_id: req.userId },
        raw: true
      });
      const coinIds = customTokenCoinIds.map(token => token.coin_id);

      let where_clause: any = {
        for_swap: 1,
        coin_family: { [Op.in]: coin_family },
        coin_status: GlblBooleanEnum.true,
        [Op.and]: [
          {
            [Op.or]: [
              { added_by: 'admin' },
              { added_by: 'swap' },
              {
                coin_id: {
                  [Op.in]: coinIds
                }
              }
            ]
          },
        ]
      };
      if (coin_id) {
        where_clause.coin_id = coin_id;
      }
      const isFav = false;
      const swap_list_data: any = await Models.CoinsModel.findAll({
        attributes: [
          "coin_id",
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
      const data: any = {
        ETH_RPC_URL: config.NODE.ETH_RPC_URL,
        BTC_RPC_URL: config.NODE.BTC_RPC_URL,
        TRON_NODE: config.NODE.TRX_RPC_URL,
        BNB_RPC_URL: config.NODE.BNB_RPC_URL,
        ETH_DAPP_RPC_URL: config.NODE.ETH_DAPP_RPC_URL,
        POL_RPC_URL: config.NODE.POL_RPC_URL,
        TICS_RPC_URL: config.NODE.TICS_RPC_URL,
        SOL_RPC_URL: config.NODE.SOL_RPC_URL,
        TICS_NATIVE_RPC_URL: config.NODE.TICS_NATIVE_RPC_URL,
      };

      return res.status(GlblCode.SUCCESS).send(data);
    } catch (err: any) {
      console.error("Error in wallet > getRpcUrl.", err);
      await commonHelper.save_error_logs("wallet_getRpcUrl", err.message);
      const data = {
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
      const user_id: number = req.userId;
      const data: any = req.body.data;
      for (let i = GlblBooleanEnum.false; i < data.length; i++) {
        const coin_family = (await coin_queries.coin_find_one(["coin_family"], { coin_id: data[i].coin_id }))?.coin_family;
        const addressValidity: any = await global_helper.validate_address(
          data[i].address,
          coin_family
        );
        if (!addressValidity) {
          return res.status(GlblCode.ERROR_CODE).send({
            status: false,
            code: GlblCode.ERROR_CODE,
            message: `${language[lang].INVALID_ADDRESS} Address: ${data[i].address}`,
          });
        }

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
      const user_id: any = req.userId;
      const { page, limit }: { page: number | string; limit: number | string } =
        req.body;
      let is_fav: number = req.body.is_fav;
      const fiat_type: string = req.body.fiat_type;
      const search = req.body.search?.trim();

      const wallet_address: string = req.body.wallet_address;
      const pageNo: any = parseInt(page as string) || GlblBooleanEnum.true;
      const limitNo: any = parseInt(limit as string) || 10;
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
      const customTokenCoinIds = await Models.CustomTokennModel.findAll({
        attributes: ['coin_id'],
        where: { user_id: req.userId },
        raw: true
      });

      const coinIds = customTokenCoinIds.map(token => token.coin_id);
      const whereClause: any = {
        coin_status: GlblBooleanEnum.true,
        coin_family: { [Op.in]: req.body.coin_family },
        [Op.and]: [
          {
            [Op.or]: [
              { token_type: null },
              {
                token_type: {
                  [Op.notIn]: ['BEP721', 'ERC721']
                }
              }
            ]
          },
          {
            [Op.or]: [
              { added_by: 'admin' },
              {
                coin_id: {
                  [Op.in]: coinIds
                }
              }
            ]
          }
        ]
      };

      if (search) {
        whereClause[Op.or] = [
          { coin_name: { [Op.like]: `%${search.trim()}%` } },
          { coin_symbol: { [Op.like]: `%${search.trim()}%` } },
        ];
      }

      const result: any = await Models.CoinsModel.findAndCountAll({
        attributes: [
          "coin_id",
          "coin_name",
          "coin_symbol",
          "coin_image",
          "coin_family",
          "is_token",
          "token_type",
        ],
        where: whereClause,
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
        order: [[Sequelize.col(orderBy), orderType]],
        offset: offset,
        limit: limitNo,
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
      const data: any = await Models.CurrencyFiatModel.findAll({
        where: { status: GlblBooleanEnum.true },
        order: [["currency_name", "ASC"]],
      });
      response.success(res, {
        data: { status: true, message: language[lang].SUCCESS, data: data },
      });
    } catch (err: any) {
      console.error("Error in wallet > getCurrencyFiat.", err);
      await commonHelper.save_error_logs("wallet_getCurrencyFiat", err.message);
      response.error(res, {
        data: { status: false, message: language[lang].CATCH_MSG },
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
    const lang: any = req.headers["content-language"] || "en";
    try {
      const {
        coin_family,
        fiat_currency,
      }: { coin_family: number; fiat_currency: string } = req.body;

      if (coin_family == undefined) {
        return response.error(res, {
          data: {
            status: false,
          },
        });
      }

      const nativeCoin: any = await Models.CoinsModel.findOne({
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
      const data = {
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
      const {
        coin_family,
        fiat_currency,
        coin_symbol,
      }: { coin_family: number; fiat_currency: string; coin_symbol: string } = req.body;

      const wallet_data: any = await Models.WalletModel.findOne({
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
      const usd_value: any = wallet_data.coin.fiat_price_data.value == null
        ? "0.00" : wallet_data.coin.fiat_price_data.value;

      let bal_in_usd: number = usd_value * wallet_data.balance;
      bal_in_usd = bal_in_usd < 0.000001
        ? await WalletHelper.toFixedExp(bal_in_usd, 8)
        : bal_in_usd < 0.0001
          ? await WalletHelper.toFixedExp(bal_in_usd, 6)
          : await WalletHelper.toFixedExp(bal_in_usd, 2);
      if (bal_in_usd >= 10) {
        return res.status(GlblCode.SUCCESS).send({
          status: true,
          code: GlblCode.SUCCESS,
          message: "Going Fine",
        });
      } else {
        const min_balance = await WalletHelper.min_coin_balance(
          wallet_data,
          fiat_currency,
          usd_value
        );
        const coin: string = coin_family == 2 ? "ETH" : coin_family == 6 ? "TRON"
          : coin_family == 1 ? "BNB" : "null";
        const token_type: string = coin_family == 2 ? "ERC20" : coin_family == 6 ? "TRC20" : coin_family == 1 ? "BEP20" : "null";
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
      const {
        userIds,
        fiatType,
        fetchFrom,
      }: { userIds: Array<number>; fiatType: string; fetchFrom: string } =
        req.body;

      let checkerWalletData: any = [];
      const where: {
        status: GlblBooleanEnum;
        coin_family?: { [Op.notIn]: number[] };
      } = { status: GlblBooleanEnum.true };

      if (fetchFrom !== undefined && fetchFrom === "extension") {
        where.coin_family = { [Op.notIn]: [config.STATIC_COIN_FAMILY.TRX] };
      }

      const commonPart: any = [
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
          order: [["user_id", "ASC"]],
        });
      }

      return response.success(res, {
        data: {
          status: true,
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
      const {
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
      const user_id: number = req.userId;
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

      let coinWalletdata: any = await Models.WalletModel.findOne({
        attributes: ["balance"],
        where: {
          user_id: req.userId,
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
              "is_on_moralis_inactive",
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
      });
      let graphData: any = [];
      if (cmc_id && fiat_currency) {
        const findGraph = await Models.CoinPriceInFiatGraphModel.findOne({
          where: { cmc_id: cmc_id, fiat_type: fiat_currency, type: "1d" },
        });
        if (findGraph && findGraph?.sparkline) {
          const graphArray = findGraph?.sparkline;
          graphData = await WalletHelper.filterByAgeRange(graphArray, "1d");
        }
      }
      const appVersion = req.headers["app-version"];
      const requiredVersion = "1.1";
      if (appVersion !== requiredVersion) {
        if (
          coin_id === 161 &&
          coinWalletdata?.dataValues?.coin?.dataValues?.cross_chain_data
        ) {
          coinWalletdata.dataValues.coin.dataValues.cross_chain_data = null;
        }
      }
      const moralis = {
        scriptId: config.MORALIS_SCRIPT_ID,
        scriptSrc: config.MORALIS_SCRIPT_SRC
      }

      return res.status(GlblCode.SUCCESS).send({
        status: true,
        code: GlblCode.SUCCESS,
        message: language[lang].REQUEST_EXECUTED,
        data: coinWalletdata,
        graph: graphData,
        moralis: moralis
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
      if (!addressValidity)
        throw new Error(`${language[lang].INVALID_ADDRESS}`);

      // Get wallet balance from global helper
      const balDetails: any = await global_helper.getWalletBalance(
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
      const address_list = req.body.address_list ? req.body.address_list : [];
      const chains = [{ chain: "ethereum", type: "eth", symbol: "eth" }];
      if (address_list?.length > 0) {
        let nfts: any = [];
        for await (let data of address_list) {
          const symbol = data.coin_symbol;
          const address = data.wallet_address;
          const coin_family = data?.coin_family;
          const chain_data = chains.filter((chain) => chain.symbol == symbol)[0];
          if (symbol.toUpperCase() == "ETH") {
            try {
              const method = "get";
              const url = `https://deep-index.moralis.io/api/v2/${address}/nft?chain=${chain_data.type}&format=decimal&media_items=true`;
              const headers = { "X-API-Key": config.KEYS.MORALIS };
              const result: any = await global_helper.get_nft_data(
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
                  const nftObj: any = {
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
                        : metadata != "" && metadata.name !== undefined && metadata.name !== null
                          ? metadata?.name
                          : null,
                    symbol:
                      nft.symbol !== undefined && nft.symbol !== null
                        ? nft.symbol
                        : metadata != "" && metadata?.symbol !== undefined && metadata?.symbol !== null
                          ? metadata?.symbol
                          : null,
                    image:
                      nftImage !== null
                        ? nftImage
                        : metadata != "" && metadata?.image !== undefined && metadata?.image !== null
                          ? metadata?.image
                          : null,
                    description:
                      metadata != "" && metadata?.description !== undefined && metadata?.description !== null
                        ? metadata?.description
                        : null,
                    attributes:
                      metadata != "" && metadata?.attributes !== undefined && metadata?.attributes !== null
                        ? metadata?.attributes
                        : null,
                  };
                  const findNft: any = await Models.NFTModelModel.findOne({
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
                      tokenImage,
                      nftObj.coin_family
                    );
                    let image_extension: string | null = null;
                    let text_data: string | null = null;
                    if (
                      !image_data.status &&
                      nftObj?.image.indexOf("ipfs") > -1
                    ) {
                      console.log('console.log first');
                      let imageHash = nftObj?.image?.substring(
                        nftObj?.image.lastIndexOf("/") + 1,
                        nftObj?.image?.length
                      );
                      tokenImage = `https://gateway.ipfs.io/ipfs/${imageHash}`;
                      image_data = await global_helper.check_nft_image(
                        tokenImage,
                        nftObj.coin_family
                      );
                      if (!image_data.status) {
                        let ipfs_image = await global_helper.get_ipfs_image(
                          nftObj?.image,
                          nftObj.coin_family
                        );
                        tokenImage = ipfs_image !== "" ? ipfs_image : null; //nftObj.token_uri;
                        image_data = await global_helper.check_nft_image(
                          tokenImage,
                          nftObj.coin_family
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
                        tokenImage,
                        nftObj.coin_family
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
                    const token_uri_fetch: any =
                      await global_helper.check_nft_token_uri(
                        nftObj?.token_uri
                      );
                    let image_data: any | null = null;
                    if (token_uri_fetch) {
                      image_data = await global_helper.check_nft_image(
                        token_uri_fetch?.image,
                        nftObj.coin_family
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
                  const findCoin = await Models.CoinsModel.findOne({
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
                    const save_coin_data = await Models.CoinsModel.create({
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
                    await WalletHelper.updateNftTokenInRedis(
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
                    const user_id = req.userId;
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
                    const nftTokenData: any = {
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

  public nfts = async (req: Request, res: Response) => {
    try {
      const address_list = req.body.address_list ? req.body.address_list : [];
      const cursor = req.body.cursor ? req.body.cursor : null;
      const limit = req.body.limit ? req.body.limit : null;
      const chains = [{ chain: "ethereum", type: "eth", symbol: "eth" }, { chain: "qubetics", type: "tics", symbol: "tics" }];
      const user_id = req.userId;     
      if (address_list?.length > 0) {
        const nfts: any = [];

        let nextCursor = null;
        for await (let data of address_list) {
          const symbol = data.coin_symbol;
          const address = data.wallet_address;
          const coinFamily = data?.coin_family;
          const chainData = chains.filter((chain) => chain.symbol == symbol)[0];

          try {
            let fetchNftData = null;

            if (symbol.toUpperCase() == "ETH") {
              let params: string = `?format=decimal&media_items=true&chain=${chainData.type}`;
              if (cursor) {
                params = `${params}&cursor=${cursor}`;
              }
              if (limit) {
                params = `${params}&limit=${limit}`;
              }

              const method = "get";
              const url = `https://deep-index.moralis.io/api/v2/${address}/nft${params}`;
              const headers = { "X-API-Key": config.KEYS.MORALIS };
              const result: any = await global_helper.get_nft_data(
                method,
                url,
                headers
              );
              if (result && result?.result?.length) {
                fetchNftData = result.result;
              }
              nextCursor = result?.cursor;
            } else if (symbol.toUpperCase() == "TICS") {
              let paramsQuery: string = '';
              if (cursor) {
                const params: any = new URLSearchParams();

                for (const [key, value] of Object.entries(cursor)) {
                  params.append(key, value === null ? "null" : value); // keep null as string
                }

                paramsQuery = params.toString();
              }
              const url = `https://v2.ticsscan.com/api/v2/addresses/${address}/nft/collections${paramsQuery}`
              const result: any = await global_helper.get_nft_data(
                "get",
                url,
                {}
              );
              if (result && result?.items?.length) {
                fetchNftData = result.items;
              }
              nextCursor = result.next_page_params;

            }
            if (fetchNftData) {
              let existedAddress = [];
              for await (const nft of fetchNftData) {
                let nftObj: any = null;

                if (symbol.toUpperCase() == "ETH") {
                  existedAddress.push({ token_address: nft.token_address, token_id: nft.token_id });
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
                  nftObj = {
                    token_address: nft.token_address,
                    token_type: nft.contract_type,
                    token_id: nft.token_id,
                    amount: nft.amount,
                    owner_of: nft.owner_of,
                    token_uri: nft.token_uri || "",
                    coin_family: coinFamily
                      ? coinFamily
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
                    image:
                      nftImage !== null
                        ? nftImage
                        : metadata != "" && metadata?.image
                          ? metadata?.image
                          : null,
                    description:
                      metadata != "" && metadata?.description
                        ? metadata?.description
                        : null,
                    attributes:
                      metadata != "" && metadata?.attributes
                        ? metadata?.attributes
                        : null,
                  };
                  nftObj = await this.populateNftData(nftObj, { user_id, address, symbol, nft });
                  nfts.push(nftObj);
                } else {
                  const tokenInstances = nft?.token_instances;
                  if (tokenInstances.length > 0) {
                    for (const tokenInstance of tokenInstances) {
                      existedAddress.push({ token_address: nft.token.address_hash, token_id: tokenInstance?.id });

                      const nftImage = tokenInstance.media_url !== null ? tokenInstance.media_url
                        : tokenInstance.metadata != "" && tokenInstance.metadata?.image ? tokenInstance.metadata?.image : null;

                      const KNOWN_NFT_IMAGE_DOMAINS = [
                        "dweb.link",
                        "arweave.net",
                        "gateway.pinata.cloud",
                        "images.blazpay.com"
                      ];

                      const domainExist = KNOWN_NFT_IMAGE_DOMAINS.some(domain =>
                        nftImage?.includes(domain)
                      );
                      console.log('domainExist >>>', domainExist);

                      let nftImageUrl = nftImage;
                      console.log('nftImageUrl >>>', nftImageUrl);

                      if (!domainExist && nftImage) {
                        console.log('nftImageUrl 222 >>>', nftImageUrl);
                        nftImageUrl = nftImage.indexOf("ipfs") > -1 ? nftImage : `https://gateway.lighthouse.storage/ipfs/${nftImage}`;
                      }


                      nftObj = {
                        token_address: nft.token.address_hash,
                        token_type: nft.token.type == "ERC-721" ? TokenType.ERC721 : TokenType.ERC1155,
                        token_id: tokenInstance?.id,
                        amount: tokenInstance.value,
                        owner_of: tokenInstance?.owner,
                        token_uri: null,
                        coin_family: coinFamily
                          ? coinFamily
                          : config.STATIC_COIN_FAMILY[symbol.toLowerCase()],
                        name:
                          tokenInstance.metadata != "" && tokenInstance.metadata?.name
                            ? tokenInstance.metadata?.name
                            : nft.token.name !== undefined && nft.token.name !== null
                              ? nft.token.name
                              : null,
                        symbol:
                          nft.token.symbol !== undefined && nft.token.symbol !== null
                            ? nft.token.symbol
                            : tokenInstance.metadata != "" && tokenInstance.metadata?.symbol
                              ? tokenInstance.metadata?.symbol
                              : null,
                        image: nftImageUrl,
                        description:
                          tokenInstance.metadata != "" && tokenInstance.metadata?.description
                            ? tokenInstance.metadata?.description
                            : null,
                        attributes:
                          tokenInstance.metadata != "" && tokenInstance.metadata?.attributes
                            ? tokenInstance.metadata?.attributes
                            : null,
                      };
                      nftObj = await this.populateNftData(nftObj, { user_id, address, symbol, nft });
                      nfts.push(nftObj);
                    }
                  }
                }
              }
              if (existedAddress.length) {
                // Build allowed pairs (OR condition)
                const allowedPairs = existedAddress.map(a => ({
                  token_address: a.token_address,
                  token_id: a.token_id,
                }));

                await Models.NFTModelModel.destroy({
                  where: {
                    wallet_address: address,
                    coin_family: coinFamily,
                    [Op.not]: {
                      [Op.or]: allowedPairs
                    }
                  },
                  logging: true
                });
              }
            } else {
              await Models.NFTModelModel.destroy({
                where: { wallet_address: address, coin_family: coinFamily },
                logging: true
              });
            }
          } catch (error) {
            console.log("🔥 ~ ~ nfts_from_moralis axios error", error);
          }

        }
        return response.success(res, {
          data: {
            success: true,
            data: nfts,
            nextCursor: nextCursor,
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

  private async populateNftData(nftObj: NFTObject, nftData: PopulateNFTContext) {
    const findNft: any = await Models.NFTModelModel.findOne({
      attributes: ["image", "image_extension", "text_data"],
      where: {
        wallet_address: { [Op.like]: nftData.address },
        token_id: nftObj.token_id.toString(),
        token_address: { [Op.like]: nftObj.token_address },
      },
      raw: true,
    });

    if (nftObj?.image && findNft?.image_extension == null) {
      let tokenImage: any = nftObj?.image;
      let image_data: any = await global_helper.check_nft_image(
        tokenImage,
        nftObj.coin_family
      );
      let image_extension: string | null = null;
      let text_data: string | null = null;
      if (
        !image_data.status &&
        nftObj?.image.indexOf("ipfs") > -1
      ) {
        const cleanImage = nftObj?.image?.replace(/\/$/, "");
        console.log('ddddddddddd111111111111');
        const imageHash = cleanImage?.substring(
          cleanImage.lastIndexOf("/") + 1,
          cleanImage.length
        );
        tokenImage = nftObj.coin_family != 7 ? `https://gateway.ipfs.io/ipfs/${imageHash}` : `https://ipfs.io/ipfs/${imageHash}`;
        image_data = await global_helper.check_nft_image(
          tokenImage,
          nftObj.coin_family
        );
        if (!image_data.status) {
          const ipfs_image = await global_helper.get_ipfs_image(
            nftObj?.image,
            nftObj.coin_family
          );
          tokenImage = ipfs_image !== "" ? ipfs_image : null; //nftObj.token_uri;
          image_data = await global_helper.check_nft_image(
            tokenImage,
            nftObj.coin_family
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
        if (nftObj.coin_family != 7) {
          const ipfs_image = await global_helper.get_ipfs_image(
            tokenImage,
            nftObj.coin_family
          );
          tokenImage = ipfs_image !== "" ? ipfs_image : tokenImage;
          image_extension = image_data.imgExtension;
          text_data = image_data.text_data !== "" ? image_data.text_data : null;
        } else {
          console.log('console.log second', image_data);
          if (image_data.status) {
            image_extension = image_data.imgExtension;
            text_data = image_data.text_data !== "" ? image_data.text_data : null;
          } else {
            const image_data2: any = await global_helper.check_nft_image(
              tokenImage, nftObj.coin_family
            );
            console.log('image_data2 >>>.', image_data2);
            if (
              image_data2.status
            ) {
              const ipfs_image = await global_helper.get_ipfs_image(
                tokenImage,
                nftObj.coin_family
              );
              tokenImage = ipfs_image !== "" ? ipfs_image : tokenImage;
              image_extension = image_data2.imgExtension;
              text_data = image_data2.text_data !== "" ? image_data2.text_data : null;
            }
          }

        }

      }
      nftObj.image = tokenImage;
      nftObj.image_extension = image_extension;
      nftObj.text_data = text_data;
    } else if (
      nftObj?.token_uri &&
      findNft?.image_extension == null
    ) {
      console.log('ddddddddddd3333333333');
      const token_uri_fetch: any =
        await global_helper.check_nft_token_uri(
          nftObj?.token_uri
        );
      let image_data: any | null = null;
      if (token_uri_fetch) {
        image_data = await global_helper.check_nft_image(
          token_uri_fetch?.image,
          nftObj.coin_family
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
    const findCoin = await Models.CoinsModel.findOne({
      attributes: ["coin_id", "coin_symbol", "coin_name"],
      where: {
        token_address: { [Op.like]: nftObj.token_address },
        token_type: nftObj.token_type,
      },
      raw: true,
    });
    let coinData: any = {};
    /** save token if not exist */
    if (!findCoin) {
      const saveCoinData = await Models.CoinsModel.create({
        coin_name: nftObj.name,
        coin_symbol: nftObj.symbol.toLowerCase(),
        coin_image: null,
        coin_family: nftObj.coin_family
          ? nftObj.coin_family
          : config.STATIC_COIN_FAMILY[nftData.symbol.toLowerCase()],
        coin_status: 1,
        is_token: 1,
        token_type:
          nftObj.token_type == "ERC1155"
            ? TokenType.ERC1155
            : TokenType.ERC721,
        decimals: 0,
        token_address: nftObj.token_address,
        is_on_trading_view: 0,
        is_on_cmc: 0,
        added_by: 'user',
        for_swap: 0
      });
      const redisCoinData = {
        coin_id: saveCoinData.coin_id,
        is_token: saveCoinData.is_token,
        token_address: saveCoinData.token_address,
        coin_family: saveCoinData.coin_family,
        decimals: saveCoinData.decimals,
        token_type: saveCoinData.token_type,
        coin_symbol: saveCoinData.coin_symbol,
        added_by: saveCoinData.added_by,
        for_swap: saveCoinData.for_swap
      }
      /** update into redis*/
      await WalletHelper.updateNftTokenInRedis(
        redisCoinData
      );
      coinData = {
        coin_id: saveCoinData.coin_id,
        coin_symbol: nftObj.symbol
          ? nftObj.symbol.toLowerCase()
          : null,
        coin_name: nftObj.name,
      };
    } else {
      coinData = findCoin;
    }
    nftObj.nft_coin_data = coinData;

    /** save nft if not exist in wallet */
    if (!findNft) {
      const nftTokenData: Interfaces.NFTInterface = {
        user_id: nftData.user_id,
        wallet_address: nftData.address,
        token_id: nftObj.token_id.toString(),
        token_address: nftObj.token_address,
        coin_family: nftObj.coin_family
          ? nftObj.coin_family
          : config.STATIC_COIN_FAMILY[nftData.symbol.toLowerCase()],
        image: nftObj?.image,
        description: nftObj.description,
        attributes: nftObj.attributes,
        token_uri: nftObj.token_uri,
        name: nftObj.name,
        available: 1,
        image_extension: nftObj.image_extension,
        text_data: nftObj.text_data,
        balance:
          nftObj.token_type == "ERC1155" ? Number(nftObj.amount) : null,
        token_type:
          nftObj.token_type == "ERC1155"
            ? TokenType.ERC1155
            : TokenType.ERC721,
      };
      await Models.NFTModelModel.create(nftTokenData);
    } else {
      /** update nft if not exist */
      const nftTokenData: Interfaces.NFTInterface = {
        description: nftObj.description,
        attributes: nftObj.attributes,
        token_uri: nftObj.token_uri,
        name: nftObj.name,
        balance:
          nftObj?.token_type == "ERC1155" ? Number(nftObj.amount) : null,
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
          wallet_address: nftData.address,
          token_id: nftObj.token_id.toString(),
          token_address: nftObj.token_address,
        },
      });
    }
    return nftObj;
  }

  public async getCoinGraphData(req: Request, res: Response) {
    try {
      const cmcId: number = req.body.cmc_id;
      const fiat_currency: string = req.body.fiat_currency || "USD";
      const duration: string = req.body.duration?.toLowerCase() || "1d";

      let graphData: any = await Models.CoinPriceInFiatGraphModel.findOne({
        where: {
          cmc_id: cmcId,
          fiat_type: fiat_currency,
          type: duration,
        },
        raw: true,
      });

      if (graphData) {
        graphData = await WalletHelper.filterByAgeRange(
          graphData.sparkline,
          duration
        );
      }

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

      const {
        addressList,
        device_token,
        device_id,
      }: {
        addressList: any;
        device_token: string;
        device_id: string;
      } = req.body;

      if (!addressList && !addressList.length) {
        const data = {
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




  public async syncBalance(req: Request, res: Response) {
    const lang: string = (req.headers["content-language"] as string) || "en";
    try {
      const user_id: number = req.userId;

      const wallets: any[] = await wallet_queries.getUserWalletsWithCoins(user_id);

      if (!wallets || wallets.length === 0) {
        return res.status(GlblCode.ERROR_CODE).send({
          status: false,
          code: GlblCode.ERROR_CODE,
          message: language[lang].NO_WALLETS_PROVIDED,
        });
      }

      const QUEUE_THRESHOLD = 25;

      if (wallets.length > QUEUE_THRESHOLD) {
        for (const wallet of wallets) {
          const coinData = wallet.coin;
          await kafka_helper.produceMessage(config.BALANCE_SYNC_TOPIC, {
            wallet_id: wallet.wallet_id,
            wallet_address: wallet.wallet_address,
            coin_data: coinData,
          });
        }
        return res.status(GlblCode.SUCCESS).send({
          status: true,
          code: GlblCode.SUCCESS,
          message: "Balance sync queued",
          data: { total_wallets: wallets.length },
        });
      }

      const walletResults = await Promise.all(
        wallets.map(async (wallet: any) => {
          try {
            const coinData = wallet.coin;
            const balDetails: any = await global_helper.get_wallet_balance(coinData, wallet.wallet_address);
            if (balDetails.status) {
              await wallet_queries.wallet_update(
                { balance: Number(balDetails.balance) },
                { wallet_id: wallet.wallet_id }
              );
            }
            return {
              wallet_id: wallet.wallet_id,
              coin_symbol: coinData?.coin_symbol,
              wallet_address: wallet.wallet_address,
              balance: balDetails.status ? Number(balDetails.balance) : null,
              sync_status: balDetails.status ? "success" : "failed",
            };
          } catch (e: any) {
            return {
              wallet_id: wallet.wallet_id,
              wallet_address: wallet.wallet_address,
              sync_status: "failed",
              error: e?.message,
            };
          }
        })
      );

      const synced = walletResults.filter((w: any) => w.sync_status === "success").length;
      const failed = walletResults.length - synced;

      return res.status(GlblCode.SUCCESS).send({
        status: true,
        code: GlblCode.SUCCESS,
        message: "Balance sync completed",
        data: { synced, failed, wallets: walletResults },
      });
    } catch (err: any) {
      console.error("Error in wallet > syncBalance.", err);
      await commonHelper.save_error_logs("wallet_syncBalance", err.message);
      return res.status(GlblCode.ERROR_CODE).send({
        status: false,
        code: GlblCode.ERROR_CODE,
        message: language[lang].CATCH_MSG,
      });
    }
  }


  public async getVersion(req: Request, res: Response) {
    const lang: string = (req.headers["content-language"] as string) || "en";
    try {
      const { version, platform } = req.body;

      let testing = false;
      const titleName = `currentversion_${platform}`;

      const currentSetting = await Models.SettingsModel.findOne({
        where: { title: titleName }
      });

      if (currentSetting && currentSetting.value) {
        const userVersionNum = parseInt(version.replace(/\./g, ""), 10);
        const currentVersionNum = parseInt(currentSetting.value.replace(/\./g, ""), 10);

        if (!isNaN(userVersionNum) && !isNaN(currentVersionNum)) {
          testing = userVersionNum > currentVersionNum;
        }
      }

      return res.status(GlblCode.SUCCESS).send({
        status: true,
        code: GlblCode.SUCCESS,
        message: "Version check completed",
        data: { testing },
      });
    } catch (err: any) {
      console.error("Error in wallet > getVersion.", err);
      await commonHelper.save_error_logs("wallet_getVersion", err.message);
      return res.status(GlblCode.ERROR_CODE).send({
        status: false,
        code: GlblCode.ERROR_CODE,
        message: language[lang].CATCH_MSG,
      });
    }
  }


}

export const walletController = new WalletController();
