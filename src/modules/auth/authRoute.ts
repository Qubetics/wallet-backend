import express from "express";
import { ControllerInterface } from "../../interfaces/controller.interface";
import { authController } from "./controller.auth";

class AuthRoute implements ControllerInterface {
  public path = "/auth";
  public router = express.Router();

  constructor() {
    this.initializeRoutes();
  }

  public initializeRoutes() {
    this.router.post(`${this.path}/authorisation`,
     authController.generateNewTokens);
     

    //use this api to generate new tokens by impersonate
    // this.router.post(`${this.path}/tokenByImpersonate`,
    // authController.tokenByImpersonate);

  }
}

export default AuthRoute;
