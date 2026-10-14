import express from "express";
import { ControllerInterface } from "../../interfaces/controller.interface";
import jwtVerification from "../../middlewares/verify.middleware";
import { validate as validateExpress } from "../../middlewares/validate";
import mpcWallets_validator from "./validator";
import { mpcWalletsController } from "./controller";

class MpcWalletsRoute implements ControllerInterface {
  public path = "/mpc";
  public router = express.Router();
  constructor() {
    this.initializeRoutes();
  }
  public initializeRoutes() {
  
    this.router.post(
      `${this.path}/saveMpcWallets`,
      [validateExpress(mpcWallets_validator.saveMpcWallets)],
      jwtVerification.verifyToken,
      mpcWalletsController.saveMpcWallets
    );

    this.router.post(
      `${this.path}/getMpcWallets`,
      [validateExpress(mpcWallets_validator.getMpcWallets)],
      jwtVerification.verifyToken,
      mpcWalletsController.getMpcWallets
    );

    this.router.get(
      `${this.path}/fetchMempoolBalance/:address`,
      jwtVerification.verifyToken,
      mpcWalletsController.fetchMempoolBalance
    );  
    
  }
}
export default MpcWalletsRoute;
