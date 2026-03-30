import { Request, Response, NextFunction } from "express";
import s3Helper from "../../helpers/common/s3.helpers";
import { GlblCode, GlblMessages } from "../../constants/global_enum";
import logger from "../../helpers/common/logger.helper";

const ALLOWED_EXTENSIONS = ['.deb', '.exe', '.pkg'];
const OBS_FOLDER = 'DvpnBuilds';

export const uploadBuildToHuawei = async (req: Request, res: Response, next: NextFunction) => {
    try {
        logger.info(`Uploading build to Huawei S3 ${JSON.stringify(req.files)}`);

        if(!req.files || !req.files.build) {
            logger.warn("No file uploaded");
            return res.status(GlblCode.ERROR_CODE).json({
                message: 'Please upload a build file',
                status: false,
                code: GlblCode.ERROR_CODE,
                data: {},
            });
        }

        if (req.files && req.files.build) {
            const file = Array.isArray(req.files.build) ? req.files.build[0] : req.files.build;
            const fileName = file.name || '';
            const ext = fileName.toLowerCase().slice(fileName.lastIndexOf('.'));
            if (!ALLOWED_EXTENSIONS.includes(ext)) {
                return res.status(GlblCode.ERROR_CODE).json({
                    message: 'Invalid file extension. Allowed: .deb, .exe, .pkg',
                    status: false,
                    code: GlblCode.ERROR_CODE,
                    data: {},
                });
            }
            const uploadedPath = await s3Helper.uploadToHuaweiS3(file, OBS_FOLDER);

            logger.info(`Build uploaded to Huawei S3 ✅✅✅ ${uploadedPath}`);
            req.body.filePath = uploadedPath;
        }
        next();
    } catch (error: any) {
        console.error("❌ Build Upload Middleware Error:", error.message);
        return res.status(GlblCode.ERROR_CODE).json({
            message: GlblMessages.FILE_UPLOAD_ERROR,
            status: false,
            code: GlblCode.ERROR_CODE,
            data: {},
        });
    }
};
