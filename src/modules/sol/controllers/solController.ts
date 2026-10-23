import { Request, Response } from "express";
import { OnlyControllerInterface } from "../../../interfaces/controller.interface";
import dbHelper from "../../../helpers/dbHelper";
import { language } from "../../../constants";
import response from "../../../helpers/response/response.helpers";
import commonHelper from "../../../helpers/common/common.helpers";

class PolController implements OnlyControllerInterface {
    constructor() {
        this.initialize();
    }

    public initialize() { }

    public async send(req: Request, res: Response) {
        let lang: any = req.headers['content-language'] || 'en';
        try {
            req.body.tx_hash = req.body.txid;
            req.body.tx_status = "completed";
            const resultStatus: any = await dbHelper.saveWithdrawTxDetails(req);

            if (resultStatus.status && resultStatus.status == true) {
                if (req.body.tx_type == 'withdraw') {

                    return response.success(res, {
                        data: {
                            status: true,
                            message: language[lang].WITHDRAW_REQUEST_ETH(req.body.amount, req.coininfo.coin_symbol),
                            tx_hash: req.body.txid,
                        },
                    });
                } else {
                    return response.success(res, {
                        data: {
                            status: true,
                            message: language[lang].SWAP_REQUEST_ETH(req.body.amount, req.coininfo.coin_symbol),
                            tx_hash: req.body.txid,
                        },
                    });
                }
            } else {
                return response.error(res, {
                    data: {
                        status: false,
                        message: language[lang].TRANSACTION_REQUEST
                    },
                });
            }


        } catch (err: any) {
            console.error("Error in ETHEREUM send API >>>>>", err)
            await commonHelper.save_error_logs("eth_send", err.message);
            return response.error(res, {
                data: {
                    status: false,
                    message: language[lang].CATCH_MSG
                },
            });
        }
    }

}

export const PolControllers = new PolController();
