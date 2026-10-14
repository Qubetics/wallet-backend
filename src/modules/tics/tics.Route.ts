import express from "express";
import { ControllerInterface } from "../../interfaces/controller.interface";
import jwtVerification from "../../middlewares/verify.middleware";
import { TicsControllers } from "./controllers/ticsController"
import TicsMiddleware from "./middleware/ticsMiddlewaver"
import validator from "./validator/validator";
import { validate } from "../../middlewares/validate";

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

    this.router.post(`${this.path}/:coin/saveTransaction`,
      jwtVerification.verifyToken,
      TicsMiddleware.requestInfo,
      TicsControllers.saveTransaction);
  
    this.router.post(`${this.path}/:coin/updateTransactionStatus`,
      jwtVerification.verifyToken,
      TicsMiddleware.requestInfo,
      TicsControllers.updateTransactionStatus);

    /** Not used */
    this.router.post(`${this.path}/:coin/nonce`,
      jwtVerification.verifyToken,
      TicsMiddleware.requestInfo,
      TicsControllers.getNonce);

    this.router.post(`${this.path}/send/nativeAddress`,
      jwtVerification.verifyToken,
      [validate(validator.sendNativeValidate)],
      TicsMiddleware.requestNativeInfo,
      TicsControllers.sendNative);

    this.router.get(`${this.path}/gas_estimation/nativeAddress`,
      jwtVerification.verifyToken,
      // TicsMiddleware.requestNativeInfo,
      TicsControllers.getEstimationGasNative);
  }

}

export default TicsRoute;
