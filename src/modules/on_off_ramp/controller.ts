import { Request, Response } from "express";
import { OnlyControllerInterface } from "../../interfaces/controller.interface";
import * as Models from '../../models/model/index';
import { GlblBlockchainTxStatusEnum, GlblCode, GlblMessages, GlblStatus } from "../../constants/global_enum";
import { TYPE, TxReqTypesEnum } from "./enum";
import jwt from "jsonwebtoken";
import { language, NotificationTypes } from "../../constants";
import commonHelper from "../../helpers/common/common.helpers";
import { Op } from "sequelize";
import { bigNumberSafeConversion } from "../../helpers/common/globalFunctions";
import { global_helper } from "../../helpers/common/global_helper";
import dbHelper from "../../helpers/dbHelper";


class OnOffRampController implements OnlyControllerInterface {

    constructor() {
        this.initialize();
    }

    public initialize() { }

    public async mercuryoInitiateTx(req: Request, res: Response) {
        let lang: any = req.headers['content-language'] || 'en';
        try {
            console.log("Entered into mercuryo>>>")
            let { ramp_type, coin_id, coin_family, tx_type, wallet_address, amount, fiat_price, fiat_type, merchant_id, order_id }: { ramp_type: string, coin_id: number, coin_family: number, tx_type: string, wallet_address: string, amount: number, fiat_price: number, fiat_type: string, merchant_id: string, order_id: string | null } = req.body;
            const user_id: number = req.userId;

            let dataToSave: any = {
                coin_id: coin_id,
                coin_family: coin_family,
                type: tx_type.toUpperCase() == TYPE.BUY ? TYPE.BUY.toLowerCase() : TYPE.SELL.toLowerCase(),
                status: GlblBlockchainTxStatusEnum.PENDING,
                blockchain_status: GlblBlockchainTxStatusEnum.PENDING,
                amount: amount,
                fiat_type: fiat_type,
                merchant_id: merchant_id,
                order_id: order_id ? order_id : null
            }

            dataToSave = tx_type.toUpperCase() === TYPE.BUY ? { ...dataToSave, to_adrs: wallet_address, to_user_id: user_id, user_id: 0 } : { ...dataToSave, from_adrs: wallet_address, user_id: user_id };

            dataToSave.req_type = (ramp_type?.toUpperCase() == TxReqTypesEnum.MERCURYO) ? TxReqTypesEnum.MERCURYO : (ramp_type == TxReqTypesEnum.ALCHEMY) ? TxReqTypesEnum.ALCHEMY : (ramp_type == TxReqTypesEnum.ON_RAMPER) ? TxReqTypesEnum.ON_RAMPER : TxReqTypesEnum.NOTPRESET;


            let check_history_exist: any = await Models.TrnxHistoryModel.findOne({
                attributes: ["id", "tx_id"],
                where: {
                    req_type: dataToSave.req_type,
                    order_id: order_id
                },
                raw: true
            })
            if (!check_history_exist) {
                await Models.TrnxHistoryModel.create(dataToSave)
            }
            let data: any = {
                status: true,
                code: GlblCode.SUCCESS,
                message: language[lang].INITIATE_TXN_CREATED
            };
            return res.status(data.code).send(data);

        } catch (err: any) {
            console.error("Error in transak_initiate_txn>>", err)
            await commonHelper.save_error_logs("on_off_ramp_initiate_txn", err.message);
            return res.status(GlblCode.ERROR_CODE).send({
                status: false,
                code: GlblCode.ERROR_CODE,
                message: language[lang].CATCH_MSG
            });
        }

    }
    public async mercuryoWebhook(req: Request, res: Response) {
        try {
            console.log('🚀 ~ ~ mercuro_webhook req.body?.data', req.body?.data);
            if (req.body?.data) {
                let webhookData: any = req.body?.data;
                if (webhookData?.type == "withdraw" || webhookData?.type == "deposit") {
                    const status = webhookData?.status === 'completed' ? 'completed' : webhookData?.status === 'failed' ? 'failed' : 'pending';
                    const notification_type = webhookData?.type === 'withdraw' ? 'buy' : 'sell';
                    const notification_status = webhookData?.status === 'completed' ? 'confirmed' : webhookData?.status === 'failed' ? 'failed' : status;

                    let txDetail: any = await Models.TrnxHistoryModel.findOne({
                        attributes: ['id', 'user_id', 'to_adrs', 'coin_id', 'coin_family', 'status'],
                        raw: true
                    });

                    /* create history when mercuyo history not exists */
                    let chains = [
                        { 'coin_family': 1, 'coin_symbol': "bnb" },
                        { 'coin_family': 2, 'coin_symbol': "eth" },
                        { 'coin_family': 3, 'coin_symbol': "btc" },
                        { 'coin_family': 4, 'coin_symbol': "pol" },
                        { 'coin_family': 5, 'coin_symbol': "sol" },
                        { 'coin_family': 6, 'coin_symbol': "trx" }
                    ];
                    if (!txDetail && webhookData?.status == 'pending') {
                        const chain_data = chains.find(chain => chain.coin_symbol === webhookData?.currency?.toLowerCase());
                        if (chain_data) {
                            let wallet_data: any = await Models.WalletModel.findOne({
                                attributes: ['id', 'user_id', 'coin_id', 'coin_symbol', 'coin_family', 'status'],
                                include: [{
                                    model: Models.CoinsModel,
                                    attributes: ['coin_id'],
                                    as: "coin_data",
                                    where: { coin_family: chain_data.coin_family, coin_symbol: chain_data.coin_symbol, is_token: 0 },
                                    required: true,
                                }]
                            });
                            if (wallet_data) {
                                let newDataToSave: any = {
                                    user_id: wallet_data?.user_id,
                                    coin_id: wallet_data?.coin_id,
                                    coin_family: wallet_data?.coin_family,
                                    amount: webhookData?.amount,
                                    type: webhookData?.type !== 'withdraw' ? TYPE.SELL : TYPE.BUY,
                                    to_adrs: webhookData?.tx?.address,
                                    // fiat_price: webhookData?.fiat_amount,
                                    fiat_type: webhookData?.fiat_currency,
                                    merchant_id: webhookData?.merchant_transaction_id || null,
                                    order_id: webhookData?.id || null,
                                    tx_id: webhookData?.tx?.id || null,
                                    req_type: TxReqTypesEnum.MERCURYO,
                                    status: status,
                                    blockchain_status: (status == GlblStatus.COMPLETED) ? GlblBlockchainTxStatusEnum.CONFIRMED : GlblBlockchainTxStatusEnum.FAILED
                                }
                                txDetail = await Models.TrnxHistoryModel.create(newDataToSave);
                            }
                        }
                    }

                    if (txDetail?.status !== 'completed' && txDetail?.status !== 'failed') {
                        let dataToSave: any = {
                            order_id: webhookData?.id,
                            amount: webhookData?.amount,
                            type: webhookData?.type !== 'withdraw' ? 'sell' : 'buy',
                            // fiat_price: webhookData?.fiat_amount,
                            fiat_type: webhookData?.fiat_currency,
                            tx_id: webhookData?.tx?.id || null,
                            country_code: webhookData?.user?.country_code,
                            status: status,
                            blockchain_status: (status == GlblStatus.COMPLETED) ? GlblBlockchainTxStatusEnum.CONFIRMED : GlblBlockchainTxStatusEnum.FAILED
                        }
                    }

                    await Models.OnOffRampLogModel.create({
                        slug: "mercuryo_webhook",
                        merchant_id: webhookData?.merchant_transaction_id,
                        data: webhookData,
                    });

                    /* start save & send notification */
                    if (txDetail && (status == 'completed' || status == 'failed')) {
                        if (txDetail?.status !== 'completed' && txDetail?.status !== 'failed') {
                            /* update native coin balance */
                            let chain_data = chains.filter(chain => chain.coin_symbol == webhookData?.currency?.toLowerCase())[0];
                            if (chain_data) {
                                let coin_data: any = await Models.CoinsModel.findOne({
                                    attributes: ['id', 'coin_family', 'is_token', 'token_address'],
                                    where: { coin_family: chain_data.coin_family, coin_symbol: chain_data.coin_symbol, is_token: 0 },
                                    raw: true
                                });
                                if (coin_data) {
                                    let balance = await global_helper.get_wallet_balance(coin_data, webhookData?.tx?.address);

                                    await Models.WalletModel.update(
                                        { balance: Number(balance) },
                                        { where: { wallet_address: { [Op.like]: webhookData?.tx?.address }, coin_id: coin_data.id } }
                                    );
                                }
                            }


                            let notiMsg = webhookData?.type == 'withdraw' ?
                                `BUY request of ${bigNumberSafeConversion(webhookData?.amount)} ${webhookData?.currency.toUpperCase()} has been ${notification_status}.` :
                                `SELL request of ${bigNumberSafeConversion(webhookData?.amount)} ${webhookData?.currency.toUpperCase()} has been ${notification_status}.`;
                            let notificationData: any = {
                                amount: webhookData?.amount,
                                message: notiMsg,
                                from_user_id: 0,
                                to_user_id: txDetail.user_id,
                                wallet_address: txDetail.to_adrs?.toLowerCase(),
                                notification_type: notification_type,
                                tx_id: txDetail.id || 0,
                                tx_type: webhookData?.type !== 'withdraw' ? 'SELL' : 'BUY',
                                coin_symbol: webhookData?.currency.toLowerCase(),
                                coin_family: txDetail.coin_family,
                                coin_id: txDetail.coin_id,
                            };
                            await Models.NotificationModel.create(notificationData);
                            /* send push notification */
                            let device_token_data = await dbHelper.getUserDeviceToken(txDetail.to_adrs, txDetail.coin_family);
                            if (device_token_data.device_token?.length > 0) {
                                let dataNoti: any = {
                                    token: device_token_data.device_token,
                                    title: webhookData?.type.toUpperCase(),
                                    message: notiMsg,
                                    notification_type: notification_type,
                                    tx_id: txDetail.id || 0,
                                    tx_type: webhookData?.type.toUpperCase(),
                                };
                                await global_helper.sendNotification(dataNoti);
                            }
                        }
                    }
                    /* end save & send notification */
                }
            }
        } catch (err: any) {
            console.error("Error in mercuro_webhook>>", err)
            await commonHelper.save_error_logs("transak_webhook", err.message)
            return res.status(GlblCode.ERROR_CODE).send({
                status: false,
                code: GlblCode.ERROR_CODE,
                message: GlblMessages.CATCH_MSG,
            });
        }

    }


}
export const onOffRampController = new OnOffRampController();