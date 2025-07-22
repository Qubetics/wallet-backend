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
  }
}
export default ChainAbstractionRoute;
