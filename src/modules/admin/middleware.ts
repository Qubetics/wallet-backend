import { Request, Response, NextFunction } from "express";
import jwtHelper from '../../helpers/common/jwt';
import { GlblCode, GlblMessages } from './../../constants/global_enum';
import { Messages } from "./auth/enum";
import { adminQueries } from "../../helpers/dbHelper";
import s3Helper from "../../helpers/common/s3.helpers";
import { CryptoHelper } from "../../helpers/common/cryptoJs";
import BannerModel from "../../models/model/model.banner";


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

    public uploadImageToHuawei = async (req: Request, res: Response, next: NextFunction, folder : any = 'Banner') => {
        try {
          if (req.files && req.files.image) {
            const file = Array.isArray(req.files.image) ? req.files.image[0] : req.files.image;
            const uploadedUrl = await s3Helper.uploadToHuaweiS3(file, folder);
            req.body.imagePath = uploadedUrl;
          }
          next();
        } catch (error: any) {
          console.error("❌ Image Upload Middleware Error:", error.message);
          return res.status(GlblCode.ERROR_CODE).json({
            message: GlblMessages.FILE_UPLOAD_ERROR,
            status: false,
            code: GlblCode.ERROR_CODE,
            data: {},
        });
        }
      };

    public checkActiveBanners = async (req: Request, res: Response, next: NextFunction) => {
        const activeBanners : any = await BannerModel.count({ where: { status: '1' } });
        if (activeBanners >= 5) {
            return res.status(GlblCode.ERROR_CODE).send({
                code: GlblCode.ERROR_CODE,
                status: false,
                message: "Only 5 active banners are allowed at a time"
            });
        }
        next();
    }

}

const adminMiddleware = new AdminMiddleware();
export default adminMiddleware;
