import { Request, Response } from "express";
import { OnlyControllerInterface } from "../../interfaces/controller.interface";
import * as Models from '../../models/model/index';
import { GlblBlockchainTxStatusEnum, GlblCode } from "../../constants/enum";
import { TYPE, TxReqTypesEnum } from "./enum";
import { language } from "../../constants";
import commonHelper from "../../helpers/common/common";


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
                fiat_price: fiat_price,
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
            await commonHelper.saveErrorLogs("on_off_ramp_initiate_txn", err.message);
            return res.status(GlblCode.ERROR_CODE).send({
                status: false,
                code: GlblCode.ERROR_CODE,
                message: language[lang].CATCH_MSG
            });
        }

    }


}
export const onOffRampController = new OnOffRampController();