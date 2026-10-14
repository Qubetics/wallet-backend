import jwt from "jsonwebtoken";
import { config } from "../../config";
import commonHelper from "./common.helpers";
import { CryptoHelper } from "./cryptoJs";

class JWT {
  public async createJSONWebToken(userId: number, device_token: string) {
    try {
      const jwtToken: any = jwt.sign({ userId, device_token }, config.JWT_SECRET, {
        expiresIn: 60 * 60 * 24, // 24 Hrs 
      });
      const token: string = `JWT ${jwtToken}`;
      return CryptoHelper.encrypt(token);

    } catch (err: any) {
      console.error("Error in createJSONWebToken.", err)
      await commonHelper.save_error_logs("createJSONWebToken", err.message);
      throw err;
    }

  }
  public async createJSONRefreshToken(userId: number, device_token: string) {
    try {
      const options: jwt.SignOptions = {
        expiresIn: "365d",
      };
      const jwtToken = jwt.sign(
        { userId, device_token },
        config.REFRESH_SECRET as string,
        options
      );
      const token: string = `REFRESH ${jwtToken}`;
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

}

const jwtHelper = new JWT();
export default jwtHelper;
