import express from "express";
import { ControllerInterface } from "../../interfaces/controller.interface";
import jwtVerification from "../../middlewares/verify.middleware";
import { dvpnController } from "./controller"

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

    }
}
export default DvpnPlansRoute;
