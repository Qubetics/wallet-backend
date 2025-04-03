import jwt from "jsonwebtoken";
import { config } from "../../config";
import commonHelper from "./common.helpers";
// import CryptoJS from "crypto-js";
import { CryptoHelper } from "./cryptoJs";

class JWT {
  public async createJSONWebToken(userId: number, device_token: string) {
    try {
      const jwtToken: any = jwt.sign({ userId, device_token }, config.JWT_SECRET, {
        // expiresIn: "7d", // 7 days
        // expiresIn: 60 * 2, // 2 minutes
        expiresIn: 60 * 60 * 2, // 2 Hrs 
      });
      const token: string = `JWT ${jwtToken}`;
      // const encryptSecret = CryptoJS.enc.Utf8.parse(config.ENCRYPT_SECRET);
      // const encryptIV = CryptoJS.enc.Utf8.parse(config.ENCRYPT_IV_SECRET);
      // return CryptoJS.AES.encrypt(Token, encryptSecret, { iv: encryptIV, padding: CryptoJS.pad.Pkcs7, mode: CryptoJS.mode.CBC }).toString();
      return CryptoHelper.encrypt(token);

    } catch (err: any) {
      console.error("Error in createJSONWebToken.", err)
      await commonHelper.save_error_logs("createJSONWebToken", err.message);
      throw err;
    }

  }
  public async createJSONRefreshToken(userId: number, device_token: string) {
    try {
      const options = {
        expiresIn: "365d",
        // audience:userId
      };
      const jwtToken = jwt.sign(
        { userId, device_token },
        config.REFRESH_SECRET as string,
        options
      );
      const token: string = `REFRESH ${jwtToken}`;
      // return CryptoJS.AES.encrypt(Token, config.ENCRYPT_SECRET).toString();
      return CryptoHelper.encrypt(token);
    } catch (err: any) {
      console.error("Error in createJSONRefreshToken.", err)
      await commonHelper.save_error_logs("createJSONRefreshToken", err.message);
      throw err;
    }
  }
  public async create_json_web_token(data: any) {
    const userId: any = data;
    const jwtToken: string = jwt.sign(userId, config.JWT_SECRET);
    const token: any = `JWT ${jwtToken}`;
    // return CryptoJS.AES.encrypt(Token, config.ENCRYPT_SECRET).toString();
    return CryptoHelper.encrypt(token);
  }

  public decodeToken = (token: string) => {
    const payload: any = jwt.decode(token);
    return payload as { userId: string; iat: number; exp: number, device_token: string };
  }

  public verify = (token: string) => {
    try {
      jwt.verify(token, config.JWT_SECRET || "");
      return true;
    } catch (error: any) {
      console.error("VERIFY ERROR", error);
      return false;
    }
  }

  public decodeRefreshToken = (token: string) => {
    const payload = jwt.decode(token);

    return payload as {
      userId: string;
      role: number;
      device_id: string;
      device_token: string,
      iat: number;
    };
  }

  public verifyRefreshToken = (token: string) => {
    try {
      const data = jwt.verify(token, config.REFRESH_SECRET || "");
      if (data) {
        const decodedData = this.decodeRefreshToken(token);
        return decodedData;
      }
    } catch (error) {
      return null;
    }
  }
}

const jwtHelper = new JWT();
export default jwtHelper;
