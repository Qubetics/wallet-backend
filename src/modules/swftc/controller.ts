import { OnlyControllerInterface } from "../../interfaces/controller.interface";
import * as Models from '../../models/model/index';
import { Request, Response } from "express";
import { config } from "../../config";
import rp from "request-promise";
import axios from "axios";
import { GlblAddedBy, GlblBooleanEnum, GlblCode } from "../../constants/global_enum";
import { global_helper } from "../../helpers/common/global_helper";
import { language } from "../../constants";
import commonHelper from "../../helpers/common/common.helpers";
import { Op } from "sequelize";
import { coin_queries } from "../../helpers/dbHelper";


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

            let networks: any = [
                "ETH",
                "BTC",
                "BSC",
                "SOL",
                "POLYGON",
                "TRX"
            ];

            let coinFamily: any = {
                1: "BSC",
                2: "ETH",
                3: "BTC",
                4: "POLYGON",
                5: "SOL",
                6: "TRX",
                7: "TICS"
            };

            await axios(configg)
                .then(async function (response) {
                    // for (let value of response?.data.data) {
                    //     arr.push(value)
                    // }
                    for await (let value of response?.data.data) {
                        if (networks.indexOf(value.mainNetwork) !== -1) {
                            let coin_family: any = Object.keys(coinFamily).find(
                                (key) => coinFamily[key] === value.mainNetwork
                            );
                            console.log('coin_family >>>', coin_family);
                            let token_type = null;
                            if (coin_family == config.STATIC_COIN_FAMILY.ETH || coin_family == config.STATIC_COIN_FAMILY.POL || coin_family == config.STATIC_COIN_FAMILY.TICS) {
                                token_type = "ERC20"
                            } else if (coin_family == config.STATIC_COIN_FAMILY.BSC) {
                                token_type = "BEP20"
                            } else if (coin_family == config.STATIC_COIN_FAMILY.SOL) {
                                token_type = "SPL"
                            } else if (coin_family == config.STATIC_COIN_FAMILY.TRX) {
                                token_type = "TRC20"
                            }


                            let token_address: any = value.contact ? value.contact : null;
                            let coin_symbol: string = value.coinCode.split(/[\(\)]/)
                            let symbol = coin_symbol[GlblBooleanEnum.false]

                            let data_exist: any = await Models.SWFTCCoinsDataModel.findOne({
                                attributes: ['id', "coinName"],
                                where: {
                                    coinName: value.coinAllCode,
                                    coinCode: value.coinCode,
                                    mainNetwork: value.mainNetwork,
                                    contact: token_address ? { [Op.like]: token_address } : null,
                                },
                                raw: true
                            })
                            if (!data_exist) {
                                let coinName = value.coinAllCode;
                                if (token_address) {
                                    let tokenDetails = await global_helper.return_decimals_name_symbol(
                                        parseInt(coin_family),
                                        token_address,
                                        lang
                                    );
                                    console.log('tokenDetails >>', tokenDetails);
                                    coinName = tokenDetails.name;
                                }
                                let findCoin: any = await Models.CoinsModel.findOne({
                                    attributes: ["coin_id", "coin_image"],
                                    where: {
                                        coin_symbol: symbol,
                                        coin_family: coin_family,
                                        token_address: token_address ? { [Op.like]: token_address } : null,
                                    },
                                    raw: true,
                                });
                                let image: any = null;
                                let cmcId: any = null;
                                let result: any = await global_helper.get_token_image_from_cmc({ symbol: symbol })
                                if (result) {
                                    image = result.image;
                                    cmcId = result.id
                                }
                                let coin_id: number = 0;
                                if (!findCoin) {
                                    let graphSource: string | null = null;
                                    let graphPair: string | null = null;
                                    if (token_address && symbol) {
                                        const tradingViewData = await global_helper.getTradingSource(symbol);
                                        console.log('tradingViewData >>>', tradingViewData);
                                        if (tradingViewData.status) {
                                            graphSource = tradingViewData.graphSource;
                                            graphPair = tradingViewData.graphPair;
                                        }

                                    }
                                    let swapSupported: number = 0;
                                    if (token_address && coin_family == config.STATIC_COIN_FAMILY.ETH || coin_family == config.STATIC_COIN_FAMILY.BNB || coin_family == config.STATIC_COIN_FAMILY.POL) {
                                        swapSupported = await global_helper.oneInchSwapSupported(token_address, coinFamily)
                                    }

                                    let currentUTCDate: string = new Date().toISOString().replace(/T/, " ").replace(/\..+/, "");
                                    let coinData: any = {
                                        coin_name: coinName,
                                        coin_symbol: symbol.toUpperCase(),
                                        coin_image: image,
                                        cmc_id: cmcId,
                                        coin_family: coin_family,
                                        coin_status: GlblBooleanEnum.true,
                                        is_token: GlblBooleanEnum.true,
                                        is_on_cmc: cmcId ? GlblBooleanEnum.true : GlblBooleanEnum.false,
                                        for_swap: swapSupported,
                                        added_by: GlblAddedBy.ADMIN,
                                        token_type: token_type,
                                        decimals: Math.pow(10, parseInt(value.coinDecimal)),
                                        token_address: token_address,
                                        is_on_coin_gicko: 0,
                                        graph_pair: graphPair,
                                        graph_source: graphSource,
                                        is_on_trading_view: graphSource ? 1 : 0,
                                        created_at: currentUTCDate,
                                        updated_at: currentUTCDate,

                                    }
                                    let response: any = await coin_queries.coin_create(coinData);
                                    coin_id = response?.coin_id;
                                } else {
                                    coin_id = findCoin?.coin_id;
                                }
                                await Models.SWFTCCoinsDataModel.create({
                                    coinId: coin_id,
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

                            } else {
                                await Models.SWFTCCoinsDataModel.update(
                                    { noSupportCoin: value.noSupportCoin, status: 1 },
                                    { where: { id: data_exist.id } })
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
            const page: number = Number(req.body?.page || 1);
            const per_page: number = Number(req.body?.per_page || 500);
            const offset: number = (page - 1) * per_page;
            let where: any = { status: 1 };
            const total = await Models.SWFTCCoinsDataModel.count({ where: where });
            if (req.body?.search) {
                let search: any = req.body.search == undefined ? (req.body.search = "%%") : (req.body.search = "%" + req.body.search + "%");
                where = {
                    ...where, [Op.or]: [
                        { coinName: { [Op.like]: search } },
                        { coinCode: { [Op.like]: search } },
                        { contact: { [Op.like]: search } }
                    ]
                }
            }
            let swftc_data: any = await Models.SWFTCCoinsDataModel.findAll({
                attributes: ["coinName", "coinCode", "coinImageUrl", "mainNetwork", "contact", "coinDecimal", "noSupportCoin", "isSupportAdvanced", "isSupportMemo", "coinCodeShow"],
                where: where,
                limit: per_page,
                offset: offset,
            })
            // let swftc_data: any = await swftc_queries.swftc_find_all(
            //     ["coinName", "coinCode", "coinImageUrl", "mainNetwork", "contact", "coinDecimal", "noSupportCoin", "isSupportAdvanced", "isSupportMemo", "coinCodeShow"],
            //     { status: 1 }
            // )
            let result = {
                status: true,
                code: GlblCode.SUCCESS,
                data: swftc_data,
                meta: {
                    page: page,
                    pages: Math.ceil(total / per_page),
                    perPage: per_page,
                    total: total,
                },
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
            req.body.sourceFlag = 'Qubetics';
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
            req.body.sourceFlag = 'Qubetics';
            // /** if receive coin amount not received then set here */
            // if (req.body.receiveCoinAmt == undefined || req.body.receiveCoinAmt == null) {
            //     req.body.receiveCoinAmt = GlblBooleanEnum.false;
            // }
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