import express from 'express';
import { validate as validateExpress } from "express-validation"
import { ControllerInterface } from '../../interfaces/controller.interface';
import jwtVerification from '../../middlewares/verify.middleware';
import { onOffRampController } from './controller';
import onOffRampValidator from './validator';

class OnOffRampRoute implements ControllerInterface {
    public path = '/on_off_ramp';
    public router = express.Router();

    constructor() {
        this.initializeRoutes();
    }

    public initializeRoutes() {
        this.router.post(`${this.path}/mercuryo/initiateTx`, [validateExpress(onOffRampValidator.mercuryoInitiateTx)], jwtVerification.verifyToken, onOffRampController.mercuryoInitiateTx);

    }
}
export default OnOffRampRoute;
