import { Request, Response, NextFunction } from "express";
import jwtHelper from "../helpers/common/jwt";
import response from "../helpers/response/response.helpers";
import { language } from "../constants";
import { CryptoHelper } from "../helpers/common/cryptoJs";

class JWTVerify {
   public async verifyToken(
      req: Request,
      res: Response,
      next: NextFunction
   ) {
      const lang = req.headers['content-language'] || 'en';

      try {
         const encryptedJWT = req.headers["authorization"];
         if (!encryptedJWT) {
            return response.error(res, {
               data: {
                  status: false,
                  message: language[lang].NO_TOKEN,
                  data: {},
               },
            });
         }

         const bearerHeader = CryptoHelper.decrypt(encryptedJWT);
         const bearerToken = bearerHeader.split(" ")[1];

         // First verify the token
         if (!jwtHelper.verify(bearerToken)) {
            return response.error(res, {
               data: {
                  status: false,
                  code: 409,
                  message: language[lang].SESSION_EXPIRED,
                  data: {},
               },
            });
         }

         // Then decode the token
         const decodedData = jwtHelper.decodeToken(bearerToken);
         const currentTimestamp = Math.floor(Date.now() / 1000);

         if (decodedData?.exp < currentTimestamp) {
            return response.error(res, {
               data: {
                  status: false,
                  code: 409,
                  message: language[lang].SESSION_EXPIRED,
                  data: {},
               },
            });
         }

         if (!decodedData?.userId) {
            return response.error(res, {
               data: {
                  status: false,
                  message: language[lang].UNAUTHORIZED_ACCESS,
                  data: {},
               },
            });
         }

         req.device_token = decodedData.device_token;
         req.userId = parseInt(decodedData.userId);


         next();

      } catch (err: any) {
         console.error("ERROR IN JWT VERIFY:", err);
         return response.error(res, {
            data: {
               status: false,
               message: language[lang].UNAUTHORIZED_ACCESS,
               data: err,
            },
         });
      }
   }
}

const jwtVerification = new JWTVerify();
export default jwtVerification;
