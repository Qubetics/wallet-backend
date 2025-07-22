import { Request, Response } from "express";
import { Op } from "sequelize";
import { OnlyControllerInterface } from "../../interfaces/controller.interface";
import * as Models from "../../models/model/index";
import {
  GlblBooleanEnum,
  GlblCode,
} from "../../constants/global_enum";
import { chainAbstractionHelper } from "./helpers";

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
}

export const chainAbstractionController = new ChainAbstractionController();
