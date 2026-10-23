import { Request, Response } from "express";
import { OnlyControllerInterface } from "../../interfaces/controller.interface";
import { GlblCode } from "../../constants/global_enum";
import { chainAbstractionHelper } from "./helpers";
import commonHelper from "../../helpers/common/common.helpers";
import response from "../../helpers/response/response.helpers";
import { language } from "../../constants";
import dbHelper from "../../helpers/dbHelper";

class ChainAbstractionController implements OnlyControllerInterface {
  constructor() {
    this.initialize();
  }
  public initialize() { }

  public async getCoinList(req: Request, res: Response) {
    try {
      const addresses: [] = req.body.addrsList;
      const coinfamiles: any[] = req.body.coinFamilies || [];

      const data: any = await chainAbstractionHelper.getCoinList(coinfamiles, addresses, req.userId);

      return res.status(GlblCode.SUCCESS).send({
        status: true,
        code: GlblCode.SUCCESS,
        message: "fetched",
        data: data,
      });
    } catch (error) {
      const data = {
        code: GlblCode.ERROR_CODE,
        status: false,
        data: error,
      };
      return res.status(data.code).send(data);
    }
  }

  public async saveIntent(req: Request, res: Response) {
    let lang: any = req.headers['content-language'] || 'en';
    try {
      const {
        intentHash,
        hash,
        fees
      } = req.body;
      const trnx: any = await dbHelper.getTrnxHistoryByTxId(hash);
      if(!trnx) {
        return response.error(res, {
          data: { status: false, message: language[lang].TRNX_NOT_FOUND },
        });
      }
      const txId = trnx.id;
      const existingIntent: any = await dbHelper.getIntentTrnxHistory({tx_id : txId, tx_hash:intentHash});
      if(existingIntent) {
        return response.error(res, {
          data: { status: false, message: language[lang].TRNX_EXIST },
        });
      }
      const data = {
        tx_hash: intentHash,
        tx_id: txId,
        user_id: req.userId,
        status: 'pending',
        fees: fees
      }
      const result: any = await dbHelper.saveIntentWithdrawTxDetails(data);
      if (result) {
        return response.success(res, {
          data: {
            status: true,
            message: language[lang].SUCCESS,
          },
        });
      } else {
        return response.error(res, {
          data: {
            status: false,
            message: language[lang].FAILED
          },
        });
      }
    } 
    catch (err: any) {
      console.error("Error in QUBETICS saveIntent API >>>>>", err)
      await commonHelper.save_error_logs("saveIntent", err.message);
      return response.error(res, {
        data: {
          status: false,
          message: language[lang].CATCH_MSG
        },
      });
    }
  }
  public async changeIntentStatus(req: any, res: any) {
    let lang: any = req.headers['content-language'] || 'en';
    try {
      const {
        hash,
        status
      } = req.body;

      if(!hash || !status || hash == "" || status == "") {
        return response.error(res, {
          data: { status: false, message: language[lang].INVALID_REQUEST },
        });
      }

      let txId = 0;
      if(hash && hash !== "") {
        const where = {tx_hash: hash};
        const resultStatus: any = await dbHelper.getIntentTrnxHistory(where);
        console.log("🚀 ~ TicsController ~ sendIntent ~ tx_id:", resultStatus)
        if(!resultStatus) {
          return response.error(res, {
            data: { status: false, message: language[lang].TRNX_NOT_FOUND },
          });
        }
        txId = resultStatus.tx_id;
      }
      const data = {
        tx_hash: hash,
        tx_id: txId,
        status: status
      }
      console.log("🚀 ~ TicsController ~ sendIntent ~ data:", data)
      const where = {tx_hash: hash};
      const resultStatus: any = await dbHelper.updateIntentTrnxHistory(data, where);
      if (resultStatus.status && resultStatus.status == true) {
        return response.success(res, {
          data: {
            status: true,
            message: language[lang].SUCCESS,
          },
        });
      } else {
        return response.error(res, {
          data: {
            status: false,
            message: language[lang].FAILED
          },
        });
      }
    } 
    catch (err: any) {
      console.error("Error in QUBETICS saveIntent API >>>>>", err)
      await commonHelper.save_error_logs("saveIntent", err.message);
      return response.error(res, {
        data: {
          status: false,
          message: language[lang].CATCH_MSG
        },
      });
    }
  }
}

export const chainAbstractionController = new ChainAbstractionController();
