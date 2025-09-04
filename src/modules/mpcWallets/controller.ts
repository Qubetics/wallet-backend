import { Request, Response } from "express";
import { Op } from "sequelize";
import { OnlyControllerInterface } from "../../interfaces/controller.interface";
import * as Models from "../../models/model/index";
import {
  GlblBooleanEnum,
  GlblCode,
} from "../../constants/global_enum";
import { mpcWalletsHelper } from "./helpers";
import commonHelper from "../../helpers/common/common.helpers";
import response from "../../helpers/response/response.helpers";
import { language } from "../../constants";
import dbHelper from "../../helpers/dbHelper";

class MpcWalletsController implements OnlyControllerInterface {
  constructor() {
    this.initialize();
  }
  public initialize() { }


  public async saveMpcWallets(req: Request, res: Response) {
    try {
      const mpcWalletData = req.body;

      const data: any = await mpcWalletsHelper.saveMpcWallets(mpcWalletData, req.userId);
      return res.status(GlblCode.SUCCESS).send({
        status: true,
        code: GlblCode.SUCCESS,
        message: data.message,
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

  public async getMpcWallets(req: Request, res: Response) {
    try {
      
      const reqBody: any = req.body;

      const data: any = await mpcWalletsHelper.getMpcWallets(req.userId, reqBody);
      return res.status(GlblCode.SUCCESS).send({
        status: true,
        code: GlblCode.SUCCESS,
        message: data.message,
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
}

export const mpcWalletsController = new MpcWalletsController();
