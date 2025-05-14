import express from "express";
import { ControllerInterface } from "../../interfaces/controller.interface";
import jwtVerification from "../../middlewares/verify.middleware";
import { EthControllers } from "./controllers/ethController"
import EthMiddleware from "./middleware/ethMiddleware"

class EthRoute implements ControllerInterface {
  public path = "/ethereum";
  public router = express.Router();

  constructor() {
    this.initializeRoutes();
  }

  public initializeRoutes() {

    /** Used on Front-End */
    this.router.post(`${this.path}/:coin/gas_estimation`,
      jwtVerification.verifyToken,
      EthMiddleware.requestInfo,
      EthControllers.getEstimationGas);

    this.router.post(`${this.path}/:coin/send`,
      jwtVerification.verifyToken,
      EthMiddleware.requestInfo,
      EthControllers.send);

    /** Not used */
    this.router.post(`${this.path}/:coin/nonce`,
      jwtVerification.verifyToken,
      EthMiddleware.requestInfo,
      EthControllers.getNonce);

  }

}

export default EthRoute;
