import express from "express";
import { ControllerInterface } from "../../interfaces/controller.interface";
import jwtVerification from "../../middlewares/verify.middleware";
import { PolControllers } from "./controllers/solController"
import SolMiddleware from "./middleware/solMiddleware"

class EthRoute implements ControllerInterface {
    public path = "/solana";
    public router = express.Router();

    constructor() {
        this.initializeRoutes();
    }

    public initializeRoutes() {
        this.router.post(`${this.path}/:coin/send`,
            jwtVerification.verifyToken,
            SolMiddleware.requestInfo,
            PolControllers.send);
    }

}

export default EthRoute;
