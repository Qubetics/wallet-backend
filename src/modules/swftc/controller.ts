import { OnlyControllerInterface } from "../../interfaces/controller.interface";
import * as Models from "../../models/model/index";
import { Request, Response } from "express";
import { config } from "../../config";
import axios from "axios";
import { GlblCode } from "../../constants/global_enum";
import { language } from "../../constants";
import commonHelper from "../../helpers/common/common.helpers";
import { Op } from "sequelize";

class SwftcController implements OnlyControllerInterface {
  constructor() {
    this.initialize();
  }

  public initialize() { }

  public async queryCoinList(req: Request, res: Response) {
    let lang: any = req.headers["content-language"] || "en";
    try {
      const addresses = req.body.addresses;
      const coin_family = req.body.coin_family || 0;
      const is_wallet = req.body.is_wallet || false;
      const fiat_type: string = req.body?.fiat_type || "usd";
      const page: number = Number(req.body?.page || 1);
      const per_page: number = Number(req.body?.per_page || 500);
      const offset: number = (page - 1) * per_page;
      let where: any = { status: 1 };
      if (req.body?.search) {
        let search: any =
          req.body.search == undefined
            ? (req.body.search = "%%")
            : (req.body.search = "%" + req.body.search + "%");
        where = {
          ...where,
          [Op.or]: [
            { "$coin_data.coin_name$": { [Op.like]: search } },
            { "$coin_data.coin_symbol$": { [Op.like]: search } },
            { "$coin_data.token_address$": { [Op.like]: search } },
          ],
        };
      }

      const appVersion = req.headers["app-version"];
      const requiredVersion = "1.1";
      let coinWhere = {};
      if (appVersion !== requiredVersion) {
        if (coin_family === 7) {
          coinWhere = { coin_family: -1 };
        } else if (coin_family !== 0) {
          coinWhere = { coin_family };
        } else {
          coinWhere = { coin_family: { [Op.ne]: 7 } };
        }
      } else {
        coinWhere = coin_family !== 0 ? { coin_family } : {};
      }
      let swftc_data: any = await Models.SWFTCCoinsDataModel.findAndCountAll({
        attributes: [
          "id",
          "coinName",
          "coinCode",
          "coinImageUrl",
          "mainNetwork",
          "contact",
          "coinDecimal",
          "noSupportCoin",
          "isSupportAdvanced",
          "isSupportMemo",
          "coinCodeShow",
        ],
        where: where,
        include: [
          {
            model: Models.CoinsModel,
            attributes: [
              "coin_id",
              "coin_symbol",
              "coin_name",
              "is_token",
              "decimals",
              "token_address",
              "coin_image",
              "coin_family",
            ],
            where: coinWhere,
            as: "coin_data",
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
                attributes: ["balance", "wallet_address", "status"],
                where: {
                  wallet_address: { [Op.in]: addresses },
                },
                required: is_wallet,
                as: "wallet_data",
              },
            ],
          },
        ],
        limit: per_page,
        offset: offset,
      });

      let result = {
        status: true,
        code: GlblCode.SUCCESS,
        data: swftc_data.rows,
        meta: {
          page: page,
          pages: Math.ceil(swftc_data.count / per_page),
          perPage: per_page,
          total: swftc_data.count,
        },
        message: language[lang].SUCCESS,
      };
      return res.status(result.code).send(result);
    } catch (err: any) {
      console.error("err in get_data of SWFTC>>", err);
      await commonHelper.save_error_logs("swftc_coindata", err.message);
      let data = {
        status: false,
        code: GlblCode.ERROR_CODE,
        message: language[lang].CATCH_MSG,
      };
      return res.status(data.code).send(data);
    }
  }

  public async queryCoinData(req: Request, res: Response) {
    let lang: any = req.headers["content-language"] || "en";
    try {
      const addresses = req.body.addresses;
      const id = req.body.id;
      const fiat_type = req.body.fiat_type;
      const is_wallet = req.body.is_wallet || false;

      let swftc_data: any = await Models.SWFTCCoinsDataModel.findAll({
        attributes: [
          "coinName",
          "coinCode",
          "coinImageUrl",
          "mainNetwork",
          "contact",
          "coinDecimal",
          "noSupportCoin",
          "isSupportAdvanced",
          "isSupportMemo",
          "coinCodeShow",
        ],
        where: { status: 1, coinId: { [Op.in]: id } },
        include: [
          {
            model: Models.CoinsModel,
            attributes: [
              "coin_id",
              "coin_symbol",
              "coin_name",
              "is_token",
              "token_address",
              "decimals",
              "coin_image",
              "coin_family",
            ],
            as: "coin_data",
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
                attributes: ["balance", "wallet_address", "status"],
                where: {
                  wallet_address: { [Op.in]: addresses },
                },
                required: is_wallet,
                as: "wallet_data",
              },
            ],
          },
        ],
      });

      let result = {
        status: true,
        code: GlblCode.SUCCESS,
        data: swftc_data,
        message: language[lang].SUCCESS,
      };
      return res.status(result.code).send(result);
    } catch (err: any) {
      console.error("err in get_data of queryCoinData>>", err);
      await commonHelper.save_error_logs("swftc_queryCoinData", err.message);
      let data = {
        status: false,
        code: GlblCode.ERROR_CODE,
        message: language[lang].CATCH_MSG,
      };
      return res.status(data.code).send(data);
    }
  }

  public async getBaseInfo(req: Request, res: Response) {
    let lang: any = req.headers["content-language"] || "en";
    try {
      req.body.sourceFlag = "Qubetics";
      const response = await axios.post(`${config.SWFTC.SWFTC_BASE_INFO}`, JSON.stringify(req.body), {
        headers: {
          "Content-Type": "application/json",
        },
        // keep the raw response text: it is parsed below exactly as before
        transformResponse: [(body: string) => body],
      });
      let result = response.data;
      let data = {
        data: JSON.parse(result),
        status: true,
        code: GlblCode.SUCCESS,
        message: language[lang].SUCCESS,
      };
      return res.status(data.code).send(data);
    } catch (err: any) {
      console.error(`getBaseInfo err >>>`, err);
      await commonHelper.save_error_logs("SWFT_getBaseInfo", err.message);
      let data = {
        details: [],
        status: false,
        code: GlblCode.ERROR_CODE,
        message: language[lang].CATCH_MSG,
      };
      return res.status(data.code).send(data);
    }
  }

  public async accountExchange(req: Request, res: Response) {
    let lang: any = req.headers["content-language"] || "en";

    try {
      req.body.sourceFlag = "Qubetics";
      const response = await axios.post(`${config.SWFTC.SWFTC_ACCOUNT_EXCHANGE}`, JSON.stringify(req.body), {
        headers: {
          "Content-Type": "application/json",
        },
        // keep the raw response text: it is parsed below exactly as before
        transformResponse: [(body: string) => body],
      });
      let result = response.data;
      let data = {
        data: JSON.parse(result),
        status: true,
        code: GlblCode.SUCCESS,
        message: language[lang].SUCCESS,
      };
      return res.status(data.code).send(data);
    } catch (err: any) {
      console.error(`accountExchange err >>>`, err);
      await commonHelper.save_error_logs("SWFT_accountExchange", err.message);
      let data = {
        details: [],
        status: false,
        code: GlblCode.ERROR_CODE,
        message: language[lang].CATCH_MSG,
      };
      return res.status(data.code).send(data);
    }
  }
}
export const SWftcController = new SwftcController();
