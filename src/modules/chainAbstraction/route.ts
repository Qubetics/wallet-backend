import express from "express";
import { ControllerInterface } from "../../interfaces/controller.interface";
import jwtVerification from "../../middlewares/verify.middleware";
import { chainAbstractionController } from "./controller";
import { validate as validateExpress } from "express-validation";
import chainAbstraction_validator from "./validator";

class ChainAbstractionRoute implements ControllerInterface {
  public path = "/chainAbstraction";
  public router = express.Router();
  constructor() {
    this.initializeRoutes();
  }
  public initializeRoutes() {
  
    this.router.post(
      `${this.path}/getCoinList`,
      [validateExpress(chainAbstraction_validator.getCoinList)],
      jwtVerification.verifyToken,
      chainAbstractionController.getCoinList
    );
    this.router.post(
      `${this.path}/saveIntentHash`,
      jwtVerification.verifyToken,
      chainAbstractionController.saveIntent
    );
    this.router.post(
      `${this.path}/updateIntentStatus`,
      jwtVerification.verifyToken,
      validateExpress(chainAbstraction_validator.changeIntentStatus),
      chainAbstractionController.changeIntentStatus
    );
    
  }
}
export default ChainAbstractionRoute;
