import express from "express";
import { ControllerInterface } from "../../interfaces/controller.interface";
import jwtVerification from "../../middlewares/verify.middleware";
import { TicsControllers } from "./controllers/ticsController"
import TicsMiddleware from "./middleware/ticsMiddlewaver"

class TicsRoute implements ControllerInterface {
  public path = "/qubetics";
  public router = express.Router();

  constructor() {
    this.initializeRoutes();
  }

  public initializeRoutes() {

    /** Used on Front-End */
    this.router.post(`${this.path}/:coin/gas_estimation`,
      jwtVerification.verifyToken,
      TicsMiddleware.requestInfo,
      TicsControllers.getEstimationGas);

    this.router.post(`${this.path}/:coin/send`,
      jwtVerification.verifyToken,
      TicsMiddleware.requestInfo,
      TicsControllers.send);

    /** Not used */
    this.router.post(`${this.path}/:coin/nonce`,
      jwtVerification.verifyToken,
      TicsMiddleware.requestInfo,
      TicsControllers.getNonce);

    this.router.post(`${this.path}/:coin/native_address`,
      jwtVerification.verifyToken,
      TicsMiddleware.requestNativeInfo,
      TicsControllers.sendNative);
  }

}

export default TicsRoute;
