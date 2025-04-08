import { Request, Response, NextFunction } from "express";
import jwtHelper from '../../helpers/common/jwt';
import { config } from "../../config";
import { GlblCode, GlblMessages } from './../../constants/global_enum';
import { Messages } from "./auth/enum";
import { adminQueries } from "../../helpers/dbHelper";
import jwt from 'jsonwebtoken';
import commonHelper from "../../helpers/common/common.helpers";
import { CryptoHelper } from "../../helpers/common/cryptoJs";


class AdminMiddleware {
    public async checkLogin(req: Request, res: Response, next: NextFunction) {
        try {
            const encryptedJWT = req.headers.authorization;
            if (!encryptedJWT) {
                return res.status(GlblCode.ERROR_CODE).json({
                    message: Messages.TOKEN_NOT_FOUND,
                    status: false,
                    code: GlblCode.ERROR_CODE,
                    data: [],
                });
            }
            const bearerHeader: string = CryptoHelper.decrypt(encryptedJWT);
            const bearerToken = bearerHeader.split(" ")[1];

            if (!jwtHelper.verify(bearerToken)) {
                return res.status(GlblCode.INVALID_TOKEN).json({
                    message: GlblMessages.INVALID_TOKEN,
                    status: false,
                    code: GlblCode.INVALID_TOKEN,
                    data: [],
                });
            }

            const decodedData: any = jwtHelper.decodeToken(bearerToken);
            const adminId = parseInt(decodedData);

            if (!decodedData || !adminId) {
                return res.status(GlblCode.ERROR_CODE).json({
                    message: Messages.UNABLE_DECODE,
                    status: false,
                    code: GlblCode.ERROR_CODE,
                    data: [],
                });
            }

            const adminData = await adminQueries.adminFindOne(
                ["id", "username", "email", "password", "mobile_no", "google2fa_secret",
                    "google2fa_status", "jwt_token", "login_status", "created_at", "updated_at"],
                { id: adminId, active: 1 },
                [['id', 'DESC']]
            );

            if (!adminData) {
                return res.status(GlblCode.ERROR_CODE).json({
                    message: Messages.UNABLE_DECODE,
                    status: false,
                    code: GlblCode.ERROR_CODE,
                    data: [],
                });
            }

            req.body.adminId = adminId;
            req.body.adminDetails = adminData;
            req.body.user_email = adminData.email;

            next();
        } catch (err) {
            console.error("Error in checkLogin of admin:", err);
            return res.status(GlblCode.INVALID_TOKEN).json({
                message: GlblMessages.INVALID_TOKEN,
                status: false,
                code: GlblCode.INVALID_TOKEN,
                data: {},
            });
        }
    }

    public async generateToken(user_id: number) {
        try {
            const token: any = jwt.sign({ user_id: user_id }, config.JWT_SECRET, { expiresIn: "30d" });
            const set_token: string = `JWT ${token}`
            const encrypt_token: any = await commonHelper.encryptDataRSA(set_token);
            return encrypt_token;
        } catch (err: any) {
            console.error("Error in generateToken.", err)
            throw err;
        }
    }

}

const adminMiddleware = new AdminMiddleware();
export default adminMiddleware;
