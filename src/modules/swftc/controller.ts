import { OnlyControllerInterface } from "../../interfaces/controller.interface";
import * as Models from '../../models/model/index';
import { Request, Response } from "express";
import { config } from "../../config";
import rp from "request-promise";
import axios from "axios";
import { GlblBooleanEnum, GlblCode } from "../../constants/global_enum";
import { global_helper } from "../../helpers/common/global_helper";
import { language } from "../../constants";
import commonHelper from "../../helpers/common/common.helpers";
import { Op } from "sequelize";


class SwftcController implements OnlyControllerInterface {

    constructor() {
        this.initialize();
    }

    public initialize() { }

    public async post_data(req: Request, res: Response) {
        console.log('config.SWFTC.SWFTC_QUERY_COINLIST >>>', config.SWFTC.SWFTC_QUERY_COINLIST);
        let lang: any = req.headers['content-language'] || 'en';
        try {
            var data = JSON.stringify({
                "supportType": "advanced"
            });
            var configg = {
                method: 'post',
                url: config.SWFTC.SWFTC_QUERY_COINLIST,
                headers: {
                    'Content-Type': 'application/json'
                },
                data: data
            };

            let arr: any = []
            let networks: any = [
                "ETH",
                "BTC",
                "BSC",
                "SOL",
                "POLYGON",
                "TRX"
            ];

            await axios(configg)
                .then(async function (response) {
                    // for (let value of response?.data.data) {
                    //     arr.push(value)
                    // }
                    for await (let value of response?.data.data) {
                        if (networks.indexOf(value.mainNetwork) !== -1) {
                            let coin_symbol: string = value.coinCode.split(/[\(\)]/)
                            let symbol = coin_symbol[GlblBooleanEnum.false]
                            let image: any = null;
                            let token_address: any = value.contact ? value.contact : null;
                            let result: any = await global_helper.get_token_image_from_cmc({ symbol: symbol })
                            if (result) {
                                image = result.image;
                            }
                            let data_exist: any = await Models.SWFTCCoinsDataModel.findOne({
                                attributes: ["coinName"],
                                where: {
                                    coinName: value.coinAllCode,
                                    coinCode: value.coinCode,
                                    mainNetwork: value.mainNetwork,
                                    contact: token_address ? { [Op.like]: token_address } : null,
                                },
                                raw: true
                            })
                            if (!data_exist) {
                                await Models.SWFTCCoinsDataModel.create({
                                    coinName: value.coinAllCode,
                                    coinCode: value.coinCode,
                                    coinImageUrl: image,
                                    mainNetwork: value.mainNetwork,
                                    contact: token_address,
                                    coinDecimal: value.coinDecimal,
                                    noSupportCoin: value.noSupportCoin,
                                    isSupportAdvanced: value.isSupportAdvanced,
                                    isSupportMemo: value.isSupportMemo,
                                    coinCodeShow: value.coinCodeShow,
                                    status: GlblBooleanEnum.true
                                })
                            }
                        }
                    }
                })
                .catch(function (error) {
                    console.error(error);
                });

            let result = {
                status: true,
                code: GlblCode.SUCCESS,
                message: language[lang].SUCCESS
            };
            return res.status(result.code).send(result);
        } catch (err: any) {
            console.error("err in post_data of SWFTC>>", err)
            let data = {
                status: false,
                code: GlblCode.ERROR_CODE,
                message: language[lang].CATCH_MSG
            };
            return res.status(data.code).send(data);
        }
    }

    public async coindata(req: Request, res: Response) {
        let lang: any = req.headers['content-language'] || 'en';
        try {
            let swftc_data: any = await Models.SWFTCCoinsDataModel.findAll({
                attributes: ["coinName", "coinCode", "coinImageUrl", "mainNetwork", "contact", "coinDecimal", "noSupportCoin", "isSupportAdvanced", "isSupportMemo", "coinCodeShow"],
                where: { status: 1 }
            })
            // let swftc_data: any = await swftc_queries.swftc_find_all(
            //     ["coinName", "coinCode", "coinImageUrl", "mainNetwork", "contact", "coinDecimal", "noSupportCoin", "isSupportAdvanced", "isSupportMemo", "coinCodeShow"],
            //     { status: 1 }
            // )
            let result = {
                status: true,
                code: GlblCode.SUCCESS,
                data: swftc_data,
                message: language[lang].SUCCESS
            };
            return res.status(result.code).send(result);
        } catch (err: any) {
            console.error("err in get_data of SWFTC>>", err)
            await commonHelper.save_error_logs("SWFT_get_data", err.message);
            let data = {
                status: false,
                code: GlblCode.ERROR_CODE,
                message: language[lang].CATCH_MSG
            };
            return res.status(data.code).send(data);
        }
    }

    // public async queryCoinList(req: Request, res: Response) {
    //     let lang: any = req.headers['content-language'] || 'en';

    //     try {
    //         let findCoins = await Models.SWFTCCoinsDataModel.findAll({
    //             where: {
    //                 status: GlblBooleanEnum.true,
    //             },
    //             raw: true,
    //         });
    //         let data = {
    //             data: findCoins,
    //             status: true,
    //             code: GlblCode.SUCCESS,
    //             message: language[lang].SUCCESS
    //         };
    //         return res.status(data.code).send(data);
    //     } catch (err: any) {
    //         console.error(`queryCoinList err >>>`, err);
    //         let data = {
    //             details: [],
    //             status: false,
    //             code: GlblCode.ERROR_CODE,
    //             message: language[lang].CATCH_MSG
    //         };
    //         return res.status(data.code).send(data);
    //     }
    // }

    public async getBaseInfo(req: Request, res: Response) {
        let lang: any = req.headers['content-language'] || 'en';
        try {
            const requestOptionsForListing = {
                method: "POST",
                uri: `${config.SWFTC.SWFTC_BASE_INFO}`,
                body: JSON.stringify(req.body),
                headers: {
                    "Content-Type": "application/json",
                },
            };
            let result = await rp(requestOptionsForListing);
            let data = {
                data: JSON.parse(result),
                status: true,
                code: GlblCode.SUCCESS,
                message: language[lang].SUCCESS
            };
            return res.status(data.code).send(data);
        } catch (err: any) {
            console.error(`getBaseInfo err >>>`, err);
            await commonHelper.save_error_logs("SWFT_getBaseInfo", err.message);
            let data = {
                details: [],
                status: false,
                code: GlblCode.ERROR_CODE,
                message: language[lang].CATCH_MSG
            };
            return res.status(data.code).send(data);
        }
    }
    public async accountExchange(req: Request, res: Response) {
        let lang: any = req.headers['content-language'] || 'en';

        try {
            /** if receive coin amount not received then set here */
            if (req.body.receiveCoinAmt == undefined || req.body.receiveCoinAmt == null) {
                req.body.receiveCoinAmt = GlblBooleanEnum.false;
            }
            const requestOptionsForListing = {
                method: "POST",
                uri: `${config.SWFTC.SWFTC_ACCOUNT_EXCHANGE}`,
                body: JSON.stringify(req.body),
                headers: {
                    "Content-Type": "application/json",
                },
            };
            let result = await rp(requestOptionsForListing);
            let data = {
                data: JSON.parse(result),
                status: true,
                code: GlblCode.SUCCESS,
                message: language[lang].SUCCESS
            }
            return res.status(data.code).send(data);
        } catch (err: any) {
            console.error(`accountExchange err >>>`, err);
            await commonHelper.save_error_logs("SWFT_accountExchange", err.message);
            let data = {
                details: [],
                status: false,
                code: GlblCode.ERROR_CODE,
                message: language[lang].CATCH_MSG
            };
            return res.status(data.code).send(data);
        }
    }
}
export const SWftcController = new SwftcController();