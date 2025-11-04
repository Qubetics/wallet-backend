import express from "express";
import { ControllerInterface } from "../../interfaces/controller.interface";
import jwtVerification from "../../middlewares/verify.middleware";
import { dvpnPlansController } from "./controller"
import { validate as validateExpress } from "express-validation";
import DvpnPlansValidator from "./validator";

class DvpnPlansRoute implements ControllerInterface {
    public path = "/dvpnPlans";
    public router = express.Router();

    constructor() {
        this.initializeRoutes();
    }
    public initializeRoutes() {
        //get dvpn plans
        this.router.post(`${this.path}/plans`,
            jwtVerification.verifyToken,
            dvpnPlansController.getDvpnPlansList);
        
        //add dvpn plan
        this.router.post(`${this.path}/addDvpnPlan`,
            jwtVerification.verifyToken,
            validateExpress(DvpnPlansValidator.addDvpnPlan),
            dvpnPlansController.addDvpnPlan);
    }
}
export default DvpnPlansRoute;
