import { Request, response, Response } from "express";
import { OnlyControllerInterface } from "../../../interfaces/controller.interface";
import { GlblAddedBy, GlblCode, GlblMessages } from "../../../constants/global_enum";
import { language } from "../../../constants";
import { adminErrQueries, coin_queries } from "../../../helpers/dbHelper";
import MenuListsModel from "../../../models/model/model_menu_lists.";
import { TokenHelper } from "./token.helper";
import { includes } from "lodash";
import CoinsModel from "../../../models/model/model.coins";
import { Op } from "sequelize";
import { WalletHelper } from "../wallet/wallet.helper";
import { Messages } from "../../user/enum";
import {WalletHelper as userWalletHelper} from "../../wallet/wallet.helpers"
import { config } from "../../../config";
import kafka_helper from "../../../helpers/common/kafka_helper";
import commonHelper from "../../../helpers/common/common.helpers";


class TokenController implements OnlyControllerInterface {
    constructor() {
        this.initialize();
    }

    public initialize() { }

    static addedByMap: any = {
        admin: 1,
        user: 2,
        swap: 3
    }

    public async getTokenList(req: Request, res: Response) {
        let lang: any = req.headers['content-language'] || 'en';
        try {
            
            const per_page: number = Number(
                req.body?.limit == undefined ? (req.body.limit = "10") : req.body.limit
              );
              const page: number = Number(
                req.body.page == undefined ? (req.body.page = "1") : req.body.page
              );
              const offset: number = (page - 1) * per_page;

              const search: string = req.body?.search == undefined ? null : req.body.search;
              const from_date: string = req.body?.from_date == undefined ? null : req.body.from_date;
              const to_date: string = req.body?.to_date == undefined ? null : req.body.to_date;
              const added_by: number = req.body?.added_by == undefined ? null : 
                  typeof req.body.added_by === 'string' && TokenController.addedByMap[req.body.added_by] ? 
                  TokenController.addedByMap[req.body.added_by] : 
                  Number(req.body.added_by);
              
              //object for get token list
              let obj: any = {
                  where: {},
                  order: [['coin_id', 'DESC']],
                  limit: per_page,
                  offset: offset,
                  page: page,
                  attributes : [
                    "coin_id",
                    "coin_name",
                    "coin_symbol",
                    "mainnet_token_address",
                    "coin_gicko_alias",
                    "coin_image",
                    "coin_family",
                    "coin_status",
                    "is_token",
                    "token_type",
                    "decimals",
                    "cmc_id",
                    "is_on_cmc",
                    "usd_price",
                    "withdraw_limit",
                    "token_abi",
                    "uuid",
                    "token_address",
                    "for_swap",
                    "gasless",
                    "added_by",
                    "created_at",
                    "updated_at",
                    "coin_gicko_id",
                    "is_on_coin_gicko",
                    "graph_source",
                    "pair_address"
                  ],
                  
              }
  
              //search by coin_name, coin_symbol, token_address, coin_family
              if (search) {
                  obj.where[Op.or] = [
                  { coin_name: { [Op.like]: `%${search}%` } },
                  { coin_symbol: { [Op.like]: `%${search}%` } },
                  { token_address: { [Op.like]: `%${search}%` } },
                  { coin_family: { [Op.like]: `%${search}%` } }
                  ];
              }
  
              //search by from_date and to_date
              if(from_date && to_date){
                  const start_date = new Date(from_date);
                  start_date.setHours(0, 0, 0, 0);
                  
                  const end_date = new Date(to_date);
                  end_date.setHours(23, 59, 59, 999);
                  
                  obj.where.created_at = { 
                      [Op.between]: [
                          start_date.toISOString().slice(0, 19).replace('T', ' '), 
                          end_date.toISOString().slice(0, 19).replace('T', ' ')
                      ] 
                  };
              }

              //search by added_by
              if (added_by !== null) {
                obj.where.added_by = added_by;
              }

  
              //get token list
              const get_token_list: any = await TokenHelper.get_token_list(obj);
  
              return res.status(GlblCode.SUCCESS).send({
                  message: GlblMessages.SUCCESS,
                  status: true,
                  code: GlblCode.SUCCESS,
                  data: get_token_list
              });

        } catch (err: any) {
            console.error("Error in getTokenList API", err)
            await adminErrQueries.adminErrLogsCreate({ fx_name: "getTokenList", error_msg: err.message || {} })
            return res.status(GlblCode.ERROR_CODE).send({
                code: GlblCode.ERROR_CODE,
                status: false,
                message: language[lang].CATCH_MSG
            });
        }
    }
    

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
            decimals
          }: {
            coin_family: number;
            token_type: string;
            token_address: string;
            name: string;
            symbol: string; 
            decimals: string;
          } = req.body;
    
          let coinDataExist: any = await coin_queries.coin_find_one(
            [
              "coin_id",
              "coin_status",
              "added_by",
            ],
            { coin_family: coin_family, token_address: token_address }
          );
    
          if (coinDataExist) {

            console.log("this is coinDataExist >>>", coinDataExist);


            if (coinDataExist.coin_status == 0) {
              await coin_queries.coin_update(
                { coin_status: 1 },
                { coin_id: coinDataExist.coin_id }
              );
              await userWalletHelper.update_token_in_redis(
                { coin_family: coin_family },
                coinDataExist.coin_id
              );
            } else {
              console.log("coin status is active");
              if (coinDataExist.added_by == GlblAddedBy.USER) {
               const updateCoinData = await coin_queries.coin_update(
                  { added_by: GlblAddedBy.ADMIN },
                  { coin_id: coinDataExist.coin_id }
                );
                await userWalletHelper.update_token_in_redis(
                  { coin_family: coin_family },
                  coinDataExist.coin_id
                );
              } else {
                return res.status(GlblCode.ERROR_CODE).send({
                    data: { status: false, message: "Token already exist" },
                  });
              }
            }
            

          } else {
            const response: any = await TokenHelper.addCoinToTable(
              token_address,
              symbol,
              name,
              coin_family,
              token_type,
              decimals,
              currentUTCDate
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
    
          return res.status(GlblCode.SUCCESS).send({
            data: { status: true, message: "Token added successfully" },
          });
    
        } catch (err: any) {
          console.error("Error in wallet > addToken.", err);
          await commonHelper.save_error_logs("wallet_addToken", err.message);
          throw language[lang].CATCH_MSG;
        }
      }

  
    public async toogleSwap(req: Request, res: Response) {
        let lang: any = req.headers['content-language'] || 'en';
        try {
            const {id , status} : {id: number , status: number}  = req.body; 

            if(!id || status == undefined) {
                return res.status(GlblCode.ERROR_CODE).send({
                    code: GlblCode.ERROR_CODE,
                    status: false,
                    message: "Id is required"
                });
            }
            const exist_token: any = await CoinsModel.findOne({ where: { coin_id: id } });
            if(!exist_token) {
                return res.status(GlblCode.ERROR_CODE).send({
                    code: GlblCode.ERROR_CODE,
                    status: false,
                    message: "Token not found"
                });
            }
            await CoinsModel.update({ for_swap: status }, { where: { coin_id: id } });

            return res.status(GlblCode.SUCCESS).send({
                message: GlblMessages.SUCCESS,
                status: true,
                code: GlblCode.SUCCESS
            });

        } catch (err: any) {
            console.error("Error in toogleSwap API", err)
            await adminErrQueries.adminErrLogsCreate({ fx_name: "toogleSwap", error_msg: err.message || {} })
            return res.status(GlblCode.ERROR_CODE).send({
                code: GlblCode.ERROR_CODE,  
                status: false,
                message: language[lang].CATCH_MSG
            });
        }
    }

    public async toogleStatus(req: Request, res: Response) {
        let lang: any = req.headers['content-language'] || 'en';
        try {
            const {id , status} : {id: number , status: number}  = req.body; 

            if(!id || status == undefined) {
                return res.status(GlblCode.ERROR_CODE).send({
                    code: GlblCode.ERROR_CODE,
                    status: false,
                    message: "Id is required"
                });
            }
            const exist_token: any = await CoinsModel.findOne({ where: { coin_id: id } });
            if(!exist_token) {
                return res.status(GlblCode.ERROR_CODE).send({
                    code: GlblCode.ERROR_CODE,
                    status: false,
                    message: "Token not found"
                });
            }
            await CoinsModel.update({ coin_status: status }, { where: { coin_id: id } });

            return res.status(GlblCode.SUCCESS).send({
                message: GlblMessages.SUCCESS,
                status: true,
                code: GlblCode.SUCCESS
            });

        } catch (err: any) {
            console.error("Error in toogleStatus API", err)
            await adminErrQueries.adminErrLogsCreate({ fx_name: "toogleStatus", error_msg: err.message || {} })
            return res.status(GlblCode.ERROR_CODE).send({
                code: GlblCode.ERROR_CODE,  
                status: false,
                message: language[lang].CATCH_MSG
            });
        }
    }

    public async updateTokenLogo(req: Request, res: Response) {
        let lang: any = req.headers['content-language'] || 'en';
        try {
            const {id , coin_image_url} : {id: number , coin_image_url: string}  = req.body; 

            if(!id || !coin_image_url) {
                return res.status(GlblCode.ERROR_CODE).send({
                    code: GlblCode.ERROR_CODE,
                    status: false,
                    message: "Id and coin_image_url are required"
                });
            }

            const exist_token: any = await CoinsModel.findOne({ where: { coin_id: id } });
            if(!exist_token) {
                return res.status(GlblCode.ERROR_CODE).send({
                    code: GlblCode.ERROR_CODE,
                    status: false,
                    message: "Token not found"
                });
            }

            await CoinsModel.update({ coin_image: coin_image_url }, { where: { coin_id: id } });

            return res.status(GlblCode.SUCCESS).send({
                message: GlblMessages.SUCCESS,
                status: true,
                code: GlblCode.SUCCESS
            });

        } catch (err: any) {
            console.error("Error in updateTokenLogo API", err)
            await adminErrQueries.adminErrLogsCreate({ fx_name: "updateTokenLogo", error_msg: err.message || {} })
            return res.status(GlblCode.ERROR_CODE).send({
                code: GlblCode.ERROR_CODE,
                status: false,
                message: language[lang].CATCH_MSG
            });
        }
    }
}

    export const tokenController = new TokenController();
