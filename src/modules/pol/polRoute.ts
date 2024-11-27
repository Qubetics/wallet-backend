import express from "express";
import { ControllerInterface } from "../../interfaces/controller.interface";
import jwtVerification from "../../middlewares/verify.middleware";
import { PolControllers } from "./controllers/polController"
import PolMiddleware from "./middleware/polMiddleware"
// import { validate } from "express-validation"
// import validator from "./../../middlewares/validator"

class EthRoute implements ControllerInterface {
  public path = "/polygon";
  public router = express.Router();

  constructor() {
    this.initializeRoutes();
  }

  public initializeRoutes() {

    /** Used on Front-End */
    this.router.post(`${this.path}/:coin/gas_estimation`,
      jwtVerification.verifyToken,
      PolMiddleware.requestInfo,
      PolControllers.getEstimationGas);

    this.router.post(`${this.path}/:coin/send`,
      jwtVerification.verifyToken,
      PolMiddleware.requestInfo,
      PolControllers.send);

    this.router.post(`${this.path}/:coin/sendSwapTrnx`,
      jwtVerification.verifyToken,
      PolMiddleware.requestInfo,
      PolControllers.sendSwapTrnx);

    /** Not used */
    this.router.post(`${this.path}/:coin/nonce`,
      jwtVerification.verifyToken,
      PolMiddleware.requestInfo,
      PolControllers.getNonce);

    this.router.post(`${this.path}/:coin/get_raw_data_string`,
      jwtVerification.verifyToken,
      PolMiddleware.requestInfo,
      PolControllers.rawDataString);
  }

}

export default EthRoute;
