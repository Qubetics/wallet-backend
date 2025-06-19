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
import { WalletHelper as userWalletHelper } from "../../wallet/wallet.helpers"
import { config } from "../../../config";
import kafka_helper from "../../../helpers/common/kafka_helper";
import commonHelper from "../../../helpers/common/common.helpers";
import s3Helper from "../../../helpers/common/s3.helpers";



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
      const coin_family = req.body?.coin_family == undefined ? null : req.body.coin_family;
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
        attributes: [
         "coin_id",
         "coin_name",
         "coin_symbol",
         "coin_image",
         "coin_family",
         "coin_status",
         "is_token",
         "token_type",
         "decimals",
         "cmc_id",
         "token_address",
         "for_swap",
         "added_by",
         "created_at",
         "updated_at"
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
      if (from_date && to_date) {
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

      //search by coin_family
      if (coin_family !== null) {
        obj.where.coin_family = coin_family;
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

  // public async addToken(req: Request, res: Response) {
  //     try {
  //         let { coin_family, token_address, coin_name, decimals, coin_symbol, is_shortlist, coin_image, policy_id, ip_address }: any = req.body;

  //         await TokenHelper.searchToken(token_address , coin_family);

  //         let coin_data: any = await CoinsModel.findOne({
  //             where: {
  //                 coin_family: coin_family,
  //                 token_address: { [Op.like]: token_address }
  //             },
  //             raw: true
  //         });
  //         if (coin_data) {
  //             if (coin_data?.status == "deleted") {
  //                 let data_to_update: any = { status: "inactive" }
  //                 if (coin_data?.added_by == 'user') {
  //                     data_to_update.added_by = 'admin';
  //                 }
  //                 if (coin_image !== null) {
  //                     data_to_update.coin_image = coin_image
  //                 }
  //                 await CoinsModel.update(
  //                     data_to_update,
  //                     { where: { coin_family: coin_family, token_address: { [Op.like]: token_address } } }
  //                 );


  //                 await common_helper.fetch_token_coin_market_price(coin_family, coin_data);
  //                 return res.status(GlblCode.SUCCESS).send({
  //                     data: {
  //                         success: true,
  //                         message: "Token added successfully",
  //                     }
  //                 });
  //             } else {
  //                 if (coin_data?.added_by == 'admin') {
  //                     const resMsg: any = { message: "Token address already exist" };
  //                     return res.status(GlblCode.ERROR_CODE).send({
  //                         data: resMsg
  //                     });
  //                 } else {
  //                     let data_to_update: any = { added_by: 'admin' }
  //                     if (coin_image !== null) {
  //                         data_to_update.coin_image = coin_image
  //                     }
  //                     await CoinsModel.update(
  //                         data_to_update,
  //                         { where: { coin_family: coin_family, token_address: { [Op.like]: token_address } } }
  //                     );

  //                     await common_helper.fetch_token_coin_market_price(coin_family, coin_data);
  //                     return ReturnResponse.success(res, {
  //                         data: {
  //                             success: true,
  //                             message: Messages.DATA_ADDED,
  //                         }
  //                     });
  //                 }
  //             }
  //         } else {
  //             let allow_swap = '0';
  //             if (coin_family == ETH) {
  //                 let response: any = await add_wallet_token_helper.eth_check_allow_swap(token_address);
  //                 if (response == 0) {
  //                     let token_data: any = {
  //                         token_address: token_address,
  //                         decimals: Math.pow(10, decimals),
  //                         coin_symbol: coin_symbol,
  //                         coin_name: coin_name,
  //                     }
  //                     let swap_exist_uniSwap: number = await add_wallet_token_helper.check_allow_swap_from_uniSwap(token_data);
  //                     if (swap_exist_uniSwap == 1) {
  //                         allow_swap = '1';
  //                     }
  //                 } else {
  //                     allow_swap = '1';
  //                 }
  //             } else if (coin_family == BNB) {
  //                 let response: any = await add_wallet_token_helper.bnb_check_allow_swap(token_address)
  //                 if (response == 0) {
  //                     let token_data: any = {
  //                         token_address: token_address,
  //                         decimals: Math.pow(10, decimals),
  //                         coin_symbol: coin_symbol,
  //                         coin_name: coin_name,
  //                     }
  //                     let swap_exist_pancakeV3: number = await add_wallet_token_helper.check_allow_swap_from_pancakeV3(token_data);
  //                     if (swap_exist_pancakeV3 == 1) {
  //                         allow_swap = '1';
  //                     }
  //                 } else {
  //                     allow_swap = '1';
  //                 }
  //             } else if (coin_family == SOL) {
  //                 let response: any = await add_wallet_token_helper.sol_check_allow_swap_from_jupiter(token_address);
  //                 if (response == 1) {
  //                     allow_swap = '1';
  //                 } else {
  //                     // let jupiterApi = `https://price.jup.ag/v4/price?ids=${token_address}`;
  //                     let jupiterApi = `https://api.jup.ag/price/v2?ids=${token_address}`;
  //                     let result: any = await axios.get(jupiterApi);
  //                     let token_data = result.data?.data || null;
  //                     // if (token_data && Object.keys(token_data)?.length > 0) {
  //                     if (token_data && token_data[token_address]) {
  //                         allow_swap = '1';
  //                     } else {
  //                         const result1: any = await axios.get(`https://api.phantom.app/tokens/v1/solana:101/address/${token_address}`);
  //                         if (result1?.data?.data || result1?.data?.data?.spamStatus == "VERIFIED") {
  //                             allow_swap = '1';
  //                         }
  //                     }
  //                 }
  //             } else if (coin_family == PLS) {
  //                 allow_swap = '1';
  //             }

  //             // if (coin_family == PLS) {
  //             //     allow_swap = "1";
  //             // }

  //             let coin_family_array = [ETH, BNB, MATIC, AVAX, CRO, PLS];
  //             const hasValue = coin_family_array.includes(coin_family);
  //             if (hasValue) {
  //                 if (is_shortlist == 0 || is_shortlist == 1) {
  //                     is_shortlist = is_shortlist
  //                 } else {
  //                     const resMsg = { status: false, message: Messages.INVALID_SHORTLIST_VALUE };
  //                     return ReturnResponse.error(res, resMsg);
  //                 }
  //             } else {
  //                 is_shortlist = 0
  //             }

  //             let token_type = await add_wallet_token_helper.check_token_type(coin_family);
  //             let chain_id_data = [
  //                 { 'coin_family': ETH, 'chain_id': 1 },
  //                 { 'coin_family': BNB, 'chain_id': 56 },
  //                 { 'coin_family': MATIC, 'chain_id': 137 },
  //                 { 'coin_family': AVAX, 'chain_id': 43114 },
  //                 { 'coin_family': CRO, 'chain_id': 25 },
  //                 { 'coin_family': PLS, 'chain_id': 369 },
  //             ];
  //             let chain = chain_id_data.filter(chain_id_data => chain_id_data.coin_family == coin_family)[0];
  //             let data_to_save: any = {
  //                 is_token: 1,
  //                 token_address: token_address,
  //                 coin_name: coin_name,
  //                 coin_family: coin_family,
  //                 decimals: decimals !== 0 ? Math.pow(10, parseInt(decimals)) : 0,
  //                 coin_symbol: coin_symbol,
  //                 allow_swap: coin_family == PLS ? allow_swap : '0',
  //                 is_token_allow_swap: allow_swap ? allow_swap : '0',
  //                 status: "inactive",
  //                 coin_image: coin_image ? coin_image : null,
  //                 token_type: token_type,
  //                 chain_id: chain?.chain_id || null,
  //                 is_shortlist: is_shortlist,
  //                 policy_id: policy_id !== undefined ? policy_id : null,
  //             }
  //             let coin_data: any = await Models.CoinModel.create(data_to_save);
  //             await Models.AdminLogModel.create({
  //                 admin_id: req.user_id,
  //                 slug: "add_update_token",
  //                 data: data_to_save,
  //                 ip_address: ip_address,
  //             });
  //             let redis_token_data: any = {
  //                 id: coin_data.id,
  //                 coin_name: coin_data.coin_name,
  //                 coin_symbol: coin_data.coin_symbol,
  //                 coin_image: coin_data.coin_image,
  //                 coin_family: coin_data.coin_family,
  //                 is_token: coin_data.is_token,
  //                 token_address: coin_data.token_address,
  //                 token_type: coin_data.token_type,
  //                 allow_swap: coin_data.allow_swap,
  //                 is_token_allow_swap: coin_data.is_token_allow_swap,
  //                 decimals: coin_data.decimals,
  //                 chain_id: coin_data.chain_id,
  //                 status: coin_data.status,
  //                 created_at: coin_data.created_at,
  //             }
  //             // await redis_update.update_all_coin_list_by_coin_family(coin_family);
  //             await redis_update.update_token_list(coin_family, redis_token_data);

  //             await common_helper.fetch_token_coin_market_price(coin_family, coin_data);
  //             return ReturnResponse.success(res, {
  //                 data: {
  //                     success: true,
  //                     message: Messages.DATA_ADDED,
  //                 }
  //             });
  //         }
  //     } catch (err: any) {
  //         console.log('🔥 ~ ~ add_token error');
  //         global_helper.handle_catch(res, err)
  //     }
  // };

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
          //   return res.status(GlblCode.SUCCESS).send({
          //     data: { status: true, message: "Token already exist" },
          //   });
        }


        //
        // if (coinDataExist.added_by == "user") {
        //   await userWalletHelper.insert_entry_in_custom_token_table(
        //     coinDataExist.coin_id,
        //     req.userId
        //   );
        // }
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
      const { id, status }: { id: number, status: number } = req.body;

      if (!id || status == undefined) {
        return res.status(GlblCode.ERROR_CODE).send({
          code: GlblCode.ERROR_CODE,
          status: false,
          message: "Id is required"
        });
      }
      const exist_token: any = await CoinsModel.findOne({ where: { coin_id: id } });
      if (!exist_token) {
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
      const { id, status }: { id: number, status: number } = req.body;

      if (!id || status == undefined) {
        return res.status(GlblCode.ERROR_CODE).send({
          code: GlblCode.ERROR_CODE,
          status: false,
          message: "Id is required"
        });
      }
      const exist_token: any = await CoinsModel.findOne({ where: { coin_id: id } });
      if (!exist_token) {
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
      const { id }: { id: number } = req.body;
      let coin_image_url: string = "";

      //check if image is present
      if (!req.files || !req.files.image) {
        return res.status(GlblCode.ERROR_CODE).send({
          code: GlblCode.ERROR_CODE,
          status: false,
          message: "Image is required"
        });
      }

      if (req.files && req.files.image) {
        const file = Array.isArray(req.files.image) ? req.files.image[0] : req.files.image;
        const uploadedUrl = await s3Helper.uploadToHuaweiS3(file, 'TokenLogo');
        coin_image_url = uploadedUrl;
      }

      const imagePath = coin_image_url || "";
      const imageUrl = imagePath ? `${config.HUAWEI_OBS.PUBLIC_BASE_URL}/${imagePath}` : "";

      //check if id and imageUrl are present
      if (!id || !imageUrl) {
        return res.status(GlblCode.ERROR_CODE).send({
          code: GlblCode.ERROR_CODE,
          status: false,
          message: "Id and imageUrl are required"
        });
      }

      //check if token exists
      const exist_token: any = await CoinsModel.findOne({ where: { coin_id: id } });
      if (!exist_token) {
        return res.status(GlblCode.ERROR_CODE).send({
          code: GlblCode.ERROR_CODE,
          status: false,
          message: "Token not found"
        });
      }

      //update token logo
      await CoinsModel.update({ coin_image: imageUrl }, { where: { coin_id: id } });

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
