import { Request, Response } from "express";
import { OnlyControllerInterface } from "../../interfaces/controller.interface";
import {
  GlblCode,
} from "../../constants/global_enum";
import { mpcWalletsHelper } from "./helpers";
import { utxobtc } from "../../helpers/common/btc_helpers";


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
      
      const {wallet_address, coin_family}: any = req.body;

      const data: any = await mpcWalletsHelper.getMpcWallets(req.userId, wallet_address, coin_family);
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

  public async fetchMempoolBalance(req: Request, res: Response) {
    try {
      const address: any = req.params.address;

      if(!address) {
        return res.status(GlblCode.ERROR_CODE).send({
          status: false,
          code: GlblCode.ERROR_CODE,
          message: "BTC address is required",
        });
      }
      
      const data: any = await utxobtc.get_balance(address);

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
