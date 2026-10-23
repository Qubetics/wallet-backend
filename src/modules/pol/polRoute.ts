import express from "express";
import { ControllerInterface } from "../../interfaces/controller.interface";
import jwtVerification from "../../middlewares/verify.middleware";
import { PolControllers } from "./controllers/polController"
import PolMiddleware from "./middleware/polMiddleware"

class PolRoute implements ControllerInterface {
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

    /** Not used */
    this.router.post(`${this.path}/:coin/nonce`,
      jwtVerification.verifyToken,
      PolMiddleware.requestInfo,
      PolControllers.getNonce);

  }

}

export default PolRoute;
