import { Request, Response } from "express";
import { OnlyControllerInterface } from "../../interfaces/controller.interface";
import jwtHelper from "../../helpers/common/jwt";
import { GlblBooleanEnum, GlblCode } from "../../constants/global_enum";
import { language } from "../../constants";
import commonHelper from "../../helpers/common/common.helpers";
import { CryptoHelper } from "../../helpers/common/cryptoJs";


class AuthController implements OnlyControllerInterface {
  constructor() {
    this.initialize();
  }

  public initialize() { }

  public async generateNewTokens(req: Request, res: Response) {
    const lang = (req.headers['content-language'] as string) || 'en';

    try {
      if (!req.body.refreshToken) {
        return res.status(GlblCode.ERROR_CODE).send({
          code: GlblCode.ERROR_CODE,
          status: false,
          message: language[lang].INVALID_TOKEN
        });
      }

      const decryptRefresh = CryptoHelper.decrypt(req.body.refreshToken);
      const refreshJwtToken = decryptRefresh.split(" ")[1];

      const userData = await jwtHelper.decodeRefreshToken(refreshJwtToken);
      if (!userData?.userId || !userData?.device_token) {
        return res.status(GlblCode.ERROR_CODE).send({
          code: GlblCode.ERROR_CODE,
          status: false,
          message: language[lang].UNABLE_DECODE,
        });
      }

      const userId = Number(userData.userId);
      const newJwtToken = await jwtHelper.createJSONWebToken(
        userId || GlblBooleanEnum.false,
        userData.device_token
      );

      const newGeneratedRefreshToken = await jwtHelper.createJSONRefreshToken(
        userId || GlblBooleanEnum.false,
        userData.device_token
      );

      return res.status(GlblCode.SUCCESS).send({
        code: GlblCode.SUCCESS,
        status: true,
        message: language[lang].SUCCESS,
        token: newJwtToken,
        refreshToken: newGeneratedRefreshToken
      });

    } catch (error: unknown) {
      const err = error as Error;
      console.error("Error in generateNewTokens api:", err);
      await commonHelper.save_error_logs("auth_generateNewTokens", err.message);

      return res.status(GlblCode.ERROR_CODE).send({
        code: GlblCode.ERROR_CODE,
        status: false,
        message: language[lang].CATCH_MSG
      });
    }
  }
}

export const authController = new AuthController();
