import { Request, Response, NextFunction } from "express";
import response from "../helpers/response/response.helpers";
import commonHelper from "../helpers/common/common.helpers";
import { language } from "../constants";

export const encryptionMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  let lang: any = req.headers['content-language'] || 'en';
  try {
    console.log("Entered into src > middlewares > encryption.middleware.ts > encryptionMiddleware.ts")
    const method = req.method;
    console.log("\n\n🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀\n");
    console.log("req.originalUrl", method, "~~~", req.originalUrl);
    console.log("HEADER authorization >>>   ", req.headers.authorization);

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
        console.log("get into special hooks i.e Webhook")
        next();
      } else {
        console.log("To remove this else condition ");
        console.log('without encryption req.body >>', req.body);
        next();
      }
    } else if (method == "GET") {
      next();
    } else {
      console.log("Entered into LAST ELSE condition")
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
