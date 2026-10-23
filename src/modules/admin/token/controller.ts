import { Request, Response } from "express";
import { OnlyControllerInterface } from "../../../interfaces/controller.interface";
import { GlblAddedBy, GlblCode, GlblMessages } from "../../../constants/global_enum";
import { language } from "../../../constants";
import { adminErrQueries, coin_queries } from "../../../helpers/dbHelper";
import { TokenHelper } from "./token.helper";
import CoinsModel from "../../../models/model/model.coins";
import { Op, Sequelize } from "sequelize";
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
        obj.where[Op.and] = [
          Sequelize.where(
            Sequelize.fn('DATE', Sequelize.col('created_at')),
            {
              [Op.gte]: from_date
            }
          ),
          Sequelize.where(
            Sequelize.fn('DATE', Sequelize.col('created_at')),
            {
              [Op.lte]: to_date
            }
          )
        ];
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

          await userWalletHelper.update_token_in_redis_hash(redisCoinData);

          return res.status(GlblCode.ERROR_CODE).send({
            data: { status: false, message: "Token already exist" },
          });

        } else {

          if (coinDataExist.added_by == GlblAddedBy.USER) {
            await coin_queries.coin_update(
              { added_by: GlblAddedBy.ADMIN },
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
              added_by: GlblAddedBy.ADMIN,
              for_swap: coinDataExist.for_swap
            }
  
            await userWalletHelper.update_token_in_redis_hash(redisCoinData);
            return res.status(GlblCode.SUCCESS).send({
              data: { status: true, message: "Token updated successfully" },
            });
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
