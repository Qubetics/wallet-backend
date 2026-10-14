import express from "express";
import { ControllerInterface } from "../../interfaces/controller.interface";
import jwtVerification from "../../middlewares/verify.middleware";
import { SWftcController } from "./controller";
import swftcValidator from "./validator";
import { validate as validateExpress } from "../../middlewares/validate";

class SwftcRoute implements ControllerInterface {
  public path = "/swftc";
  public router = express.Router();

  constructor() {
    this.initializeRoutes();
  }

  public initializeRoutes() {
    this.router.post(
      `${this.path}/queryCoinList`,
      [validateExpress(swftcValidator.queryCoinList)],
      jwtVerification.verifyToken,
      SWftcController.queryCoinList
    );

    this.router.post(
      `${this.path}/queryCoinData`,
      [validateExpress(swftcValidator.queryCoinData)],
      jwtVerification.verifyToken,
      SWftcController.queryCoinData
    );

    this.router.post(
      `${this.path}/getBaseInfo`,
      [validateExpress(swftcValidator.getBaseInfo)],
      jwtVerification.verifyToken,
      SWftcController.getBaseInfo
    );
    this.router.post(
      `${this.path}/accountExchange`,
      [validateExpress(swftcValidator.accountExchange)],
      jwtVerification.verifyToken,
      SWftcController.accountExchange
    );
  }
}
export default SwftcRoute;
