import express from "express";
import { ControllerInterface } from "../../interfaces/controller.interface";
import { factPriceUpdateController } from "./controller"

class FactPriceUpdateRoute implements ControllerInterface {
    public path = "/factPriceUpdate";
    public router = express.Router();

    constructor() {
        this.initializeRoutes();
    }
    public initializeRoutes() {
        this.router.post(`${this.path}/update`,
        factPriceUpdateController.updateFactPrice);

    }
}
export default FactPriceUpdateRoute;





