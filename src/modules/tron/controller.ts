import response from "../../helpers/response/response.helpers";
import { OnlyControllerInterface } from "../../interfaces/controller.interface";
import { Request, Response } from "express";
import { Tron_Helper } from "./helper";
import * as Models from './../../models/model/index';
import { trxWeb3 } from "../../helpers/common/web3_trx_helper";
import { config } from "../../config";
import dbHelper from "../../helpers/dbHelper";
import redisClient from "../../helpers/common/redis";
import { GlblBlockchainTxStatusEnum, GlblCode, GlblStatus, TxTypesEnum, TxReqTypesEnum } from "../../constants/global_enum";
import { language } from "../../constants";
import commonHelper from "../../helpers/common/common.helpers";
import BigNumber from "bignumber.js";


class TronController implements OnlyControllerInterface {
    constructor() {
        this.initialize();
    }

    public initialize() { }


    public async gasEstimation(req: Request, res: Response) {
        let lang: any = req.headers['content-language'] || 'en';
        try {
            console.log("req body tron gasEstimation>>>", req.body)

            const from_address: string = req.body.from_address;
            const to_address: string = req.body.to_address;
            const amount: number = req.body.amount;
            const is_bridge = 1;
            const coinData = req.coininfo;
            // let tx_raw: string = req.body.tx_raw;
            // let token_address: any = req.coininfo.token_address;
            // let fee_data: any = await Tron_Helper.Gas_Fee(
            //     to_address, // toAddress,
            //     tx_raw, // raw,
            //     token_address /// contract_address
            // );
            let fee_data: any = await Tron_Helper.getEstimationGas({
                fromAddress: from_address,
                toAddress: to_address,
                amount: amount,
                is_bridge,
                coinData
            });
            if (fee_data?.status) {
                return response.success(res, {
                    data: {
                        status: true,
                        message: language[lang].REQUEST_EXECUTED,
                        data: fee_data?.data,
                    },
                });
            } else {
                console.error("fee_data", fee_data);
                return response.error(res, { data: { message: language[lang].CATCH_MSG } });
            }

        } catch (err: any) {
            console.error("Error: in tron gas_estimation ", err);
            await commonHelper.save_error_logs("tron_gas_estimation", err.message);
            return response.error(res, { data: { message: language[lang].CATCH_MSG } });
        }
    };

    public async send(req: Request, res: Response) {
        let lang: any = req.headers['content-language'] || 'en';
        try {
            console.log("req body tron send>>>", req.body)
            let is_maker: number | null = req.body.is_maker ? req.body.is_maker : null;
            const user_id = req.userId;
            let card_id: any = req.body.card_id;
            const trnx_type: any = req.body.tx_type ? req.body.tx_type : TxTypesEnum.WITHDRAW;
            if (trnx_type == "card_fees") {
                card_id = card_id ? card_id : 1;
            }
            let referral_upgrade_level: string = req.body.referral_upgrade_level ? req.body.referral_upgrade_level : null;
            const from_address: string = req.body.from;
            const to_address: string = req.body.to;
            const coin_id: number = req.body.coin_id;
            const amount: number = req.body.amount;
            const gas_price: number = req.body.gas_price;
            const gas_estimate: number = req.body.gas_estimate
                ? req.body.gas_estimate
                : 0; /// gas_estimate
            const trnx_raw: any = req.body.tx_raw;
            const fiat_currency: string = "USD";
            if ((trnx_type == "card_fees" && card_id == 1) || (trnx_type == "card_fees" && card_id == 3)) {
                return res.status(GlblCode.ERROR_CODE).send({
                    status: false,
                    code: GlblCode.ERROR_CODE,
                    message: language[lang].CARDS_MAINTENANCE_MODE
                });
            } else if ((trnx_type == "card_recharge" && card_id == 1) || (trnx_type == "card_recharge" && card_id == 3)) {
                return res.status(GlblCode.ERROR_CODE).send({
                    status: false,
                    code: GlblCode.ERROR_CODE,
                    message: language[lang].CARD_NOT_SUPPORT_RECHARGING
                });
            } else {
                console.log(" no card fee or card recharge check", trnx_type, card_id)
            }
            if (from_address == to_address) {
                let resMsg = {
                    status: false,
                    message: language[lang].SAME_ADDRESS
                };
                return response.error(res, { data: resMsg });
            }
            if (trnx_raw) {
                let coin: any = await dbHelper.find_one_coins_table(['coin_id', 'mainnet_token_address', 'coin_name', 'cmc_id', 'is_on_cmc', 'coin_symbol', 'coin_gicko_alias', 'coin_image', 'coin_family', 'coin_status', 'is_token', 'token_type', 'decimals', 'usd_price', 'withdraw_limit', 'token_abi', 'token_address', 'uuid', 'for_swap', 'added_by', 'created_at', 'updated_at'], { coin_id: coin_id })
                if (!coin) {
                    console.error(`coin not found >>>`);
                    let resMsg = {
                        status: false,
                        message: language[lang].CATCH_MSG
                    };
                    return response.error(res, { data: resMsg });
                }
                const balance: string = await trxWeb3.Fetch_Balance(
                    from_address,
                    coin,
                    true
                );
                const insufficientBal: boolean = new BigNumber(balance).isLessThan(amount);
                if (insufficientBal) {
                    const resMsg = {
                        status: false,
                        message: language[lang].INSUFFICIENTTRX,
                        data: {},
                    };
                    return response.error(res, { data: resMsg });
                }

                return await Tron_Helper.BroadcastRawTx(
                    trnx_raw,
                    async (error: any, txRes: any) => {
                        if (error) {
                            const LOW_FEE = error.message.includes("transaction underpriced");
                            const insufficientBalance =
                                error.message.includes("insufficient funds");

                            let message = error.message;
                            if (LOW_FEE) {
                                message = language[lang].TRANSACTION_FEE_LOW;
                            }
                            if (insufficientBalance) {
                                message = language[lang].INSUFFICIENT_GAS_PRICE;
                            }

                            let resMsg = {
                                status: false,
                                message: message,
                                trnx_hash: null,
                            };
                            return response.error(res, { data: resMsg });
                        } else {
                            let to_user_id: number = 0;
                            let user_data: any = await redisClient.getKeyValuePair(config.TRON_WALLET_ADDRESS, to_address.toUpperCase())
                            if (user_data) {
                                user_data = JSON.parse(user_data)
                                to_user_id = user_data.user_id
                            }
                            await Models.TrnxHistoryModel.create({
                                user_id: user_id,
                                referral_upgrade_level: referral_upgrade_level,
                                from_adrs: from_address,
                                to_adrs: to_address,
                                coin_id: coin_id,
                                coin_family: config.STATIC_COIN_FAMILY.TRX,
                                amount: amount,
                                tx_id: txRes.data.txid,
                                is_maker: is_maker,
                                gas_price: null,
                                tx_raw: trnx_raw.txID,
                                type: trnx_type,
                                status: GlblStatus.COMPLETED,
                                blockchain_status: GlblBlockchainTxStatusEnum.PENDING,
                                tx_fee: gas_price,
                                to_user_id: to_user_id,
                                req_type: TxReqTypesEnum.APP,
                                order_id: req.body.order_id,
                                merchant_id: null,
                                block_id: null,
                                block_hash: null,
                                speedup: null,
                                nonce: null,
                                swap_fee: null,
                                gas_limit: null,
                                gas_reverted: null,
                                fiat_type: fiat_currency,
                                fiat_price: null,
                                country_code: null,
                                order_status: req.body.order_id ? GlblBlockchainTxStatusEnum.PENDING : null
                            });

                            let resMsg = {
                                status: true,
                                message: language[lang].WITHDRAW_REQUEST_ETH(req.body.amount, req.coininfo.coin_symbol),
                                trnx_hash: txRes.data.txid,
                            };
                            return response.success(res, { data: resMsg });
                        }
                    }
                );
            } else {
                console.error(`tron trnx_raw not found `);
                let resMsg = {
                    status: false,
                    message: language[lang].CATCH_MSG
                };
                return response.error(res, { data: resMsg });
            }
        } catch (err: any) {
            console.error(`TransactionController Withdraw  error >>>`, err);
            await commonHelper.save_error_logs("tron_send", err.message);
            let resMsg = {
                status: false,
                message: language[lang].CATCH_MSG
            };
            return response.error(res, { data: resMsg });
        }
    }


}
export const tronControllers = new TronController();
