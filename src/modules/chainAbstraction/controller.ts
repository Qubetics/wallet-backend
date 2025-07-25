import { Request, Response } from "express";
import { Op } from "sequelize";
import { OnlyControllerInterface } from "../../interfaces/controller.interface";
import * as Models from "../../models/model/index";
import {
  GlblBooleanEnum,
  GlblCode,
} from "../../constants/global_enum";
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
        message: "Coin list has been fetched successfully",
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
        status: 'pending'
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
  public async changeIntentStatus(req: Request, res: Response) {
    let lang: any = req.headers['content-language'] || 'en';
    try {
      const {
        hash,
        status
      } = req.body;
      let txId = 0;
      if(hash && hash !== "") {
        const resultStatus: any = await dbHelper.getIntentTrnxHistory(hash);
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
      }
      console.log("🚀 ~ TicsController ~ sendIntent ~ data:", data)
      const resultStatus: any = await dbHelper.updateIntentTrnxHistory({status: status},data);
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
