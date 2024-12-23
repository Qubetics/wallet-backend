import express from 'express';
import { ControllerInterface } from '../../interfaces/controller.interface';
import jwtVerification from '../../middlewares/verify.middleware';
import { SWftcController } from './controller';
import swftcValidator from "./validator";
import { validate as validateExpress } from "express-validation";

class SwftcRoute implements ControllerInterface {
    public path = '/swftc';
    public router = express.Router();

    constructor() {
        this.initializeRoutes();
    }

    public initializeRoutes() {
        this.router.post(`${this.path}/post_data`, SWftcController.post_data);
        this.router.post(`${this.path}/coinData`, [validateExpress(swftcValidator.coinData)], jwtVerification.verifyToken, SWftcController.coindata);

        // this.router.post(`${this.path}/SWFT/queryCoinList`, jwtVerification.verifyToken, SWftcController.queryCoinList);
        this.router.post(`${this.path}/getBaseInfo`, [validateExpress(swftcValidator.getBaseInfo)], jwtVerification.verifyToken, SWftcController.getBaseInfo);
        this.router.post(`${this.path}/accountExchange`, [validateExpress(swftcValidator.accountExchange)], jwtVerification.verifyToken, SWftcController.accountExchange);
    }
}
export default SwftcRoute;
