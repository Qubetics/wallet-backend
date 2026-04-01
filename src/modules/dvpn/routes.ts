import express from "express";
import { validate as validateExpress } from "express-validation";
import { ControllerInterface } from "../../interfaces/controller.interface";
import jwtVerification from "../../middlewares/verify.middleware";
import { dvpnController } from "./controller";
import dvpnValidator from "./validator";
import { uploadBuildToHuawei } from "./middleware";

class DvpnPlansRoute implements ControllerInterface {
    public path = "/dvpn";
    public router = express.Router();

    constructor() {
        this.initializeRoutes();
    }

    public initializeRoutes() {
        this.router.post(`${this.path}/sessionHistory`,
            jwtVerification.verifyToken,
            dvpnController.sessionHistory);

        this.router.post(`${this.path}/uploadBuild`,
            jwtVerification.verifyToken,
            uploadBuildToHuawei,
            dvpnController.uploadBuild);

        this.router.get(`${this.path}/getBuildList`,
            jwtVerification.verifyToken,
            validateExpress(dvpnValidator.getBuildList),
            dvpnController.getBuildList);

        this.router.get(`${this.path}/downloadBuild/:buildId/:platform`,
            jwtVerification.verifyToken,
            validateExpress(dvpnValidator.downloadBuild),
            dvpnController.downloadBuild);

        this.router.get(`${this.path}/build/:platform`,
            jwtVerification.verifyToken,
            validateExpress(dvpnValidator.getLatestBuild),
            dvpnController.getLatestBuild);

        this.router.get(`${this.path}/build/version/latest/:platform`,
            jwtVerification.verifyToken,
            dvpnController.getLatestBuildVersion);
    }
}
export default DvpnPlansRoute;
