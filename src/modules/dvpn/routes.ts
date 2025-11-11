import express from "express";
import { ControllerInterface } from "../../interfaces/controller.interface";
import jwtVerification from "../../middlewares/verify.middleware";
import { dvpnController } from "./controller"
import { validate as validateExpress } from "express-validation";
import DvpnPlansValidator from "./validator";

import { SolanaHelper } from "../../helpers/common/solana.helper";

class DvpnPlansRoute implements ControllerInterface {
    public path = "/dvpn";
    public router = express.Router();

    constructor() {
        this.initializeRoutes();
    }

    //Initialize the routes
    public initializeRoutes() {
        
        //get dvpn session history
        this.router.post(`${this.path}/sessionHistory`,
         jwtVerification.verifyToken,
         dvpnController.sessionHistory);

        //Not  Required for Now
        //get dvpn plans
        // this.router.post(`${this.path}/plans`,
        //     jwtVerification.verifyToken,
        //     dvpnController.getDvpnPlansList);

        // //add dvpn plan
        // this.router.post(`${this.path}/addDvpnPlan`,
        //     jwtVerification.verifyToken,
        //     validateExpress(DvpnPlansValidator.addDvpnPlan),
        //     dvpnController.addDvpnPlan);
    }
}
export default DvpnPlansRoute;
