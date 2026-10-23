import { Request, Response, NextFunction } from "express";
import response from "../helpers/response/response.helpers";
import commonHelper from "../helpers/common/common.helpers";
import { language } from "../constants";

export const encryptionMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  let lang: any = req.headers['content-language'] || 'en';
  try {
    const method = req.method;

    if ((req.body.dataString && method == "PUT" || method == "PATCH" || method == "POST" || method == "DELETE" || method == "PUT")) {
      if (req.body.dataString) {
        let dataFields: any;
        if (req.originalUrl.includes('admin')) {
          dataFields = await commonHelper.adminDecryptDataRSA(req.body.dataString)
        } else {
          dataFields = await commonHelper.decryptDataRSA(req.body.dataString);
        }
        if (dataFields) {
          dataFields = JSON.parse(dataFields);
          req.body = dataFields;
          console.log('req.body >>', req.body);
          next();
        } else {
          return response.error(res, {
            data: {
              status: false,
              message: language[lang].CATCH_MSG
            }
          })
        }
      } else if (!req.body.dataString && (
        req.originalUrl == `/api/v1/wallet/fee` ||
        req.originalUrl == `/api/v1/wallet/order/update` ||
        req.originalUrl == `/api/v1/wallet/activeinactive` ||
        req.originalUrl == `/api/v1/wallet/updateBalance` ||
        req.originalUrl == `/api/v1/wallet/nativeCoinFiatPrice`)) {
        next();
      } else {
        next();
      }
    } else if (method == "GET") {
      next();
    } else {
      return response.error(res, {
        data: {
          status: false,
          message: language[lang].CATCH_MSG
        }
      })
    }
  } catch (err: any) {
    console.error("\n\n error >", err);
    return response.error(res, {
      data: {
        status: false,
        message: language[lang].CATCH_MSG
      }
    });
  }
}
