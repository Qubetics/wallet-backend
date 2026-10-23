import NodeRSA from "node-rsa";
import { config } from "../../config";
import { catch_err_msg_queries } from "../dbHelper/index";
class CommonHelper {
  constructor() { }

  public async save_error_logs(fn_name: string, error_message: any) {
    try {
      await catch_err_msg_queries.catch_err_msg_create({ fx_name: fn_name, error_msg: error_message || {} })
    } catch (err: any) {
      console.error("Error in save_error_logs", err)
    }
  }

  public async decryptDataRSA(data: any) {
    try {
      let privateKeyFile: string = config.RSA_KEYS.USER.PRIVATE;
      let privateKey = Buffer.from(privateKeyFile);
      let RSAKey = new NodeRSA(privateKey);
      RSAKey.setOptions({ encryptionScheme: 'pkcs1' });
      let decryptedData = await RSAKey.decrypt(data, "utf8")
      return decryptedData;
    } catch (err: any) {
      console.error("decryptDataRSA error ======== ,", err.message);
      throw new Error(err)
    }
  }

  public async adminDecryptDataRSA(data: any) {
    try {
      let privateKeyFile: string = config.RSA_KEYS.ADMIN.PRIVATE;
      let privateKey = Buffer.from(privateKeyFile);
      let RSAKey = new NodeRSA(privateKey);
      RSAKey.setOptions({ encryptionScheme: 'pkcs1' });
      let decryptedData = await RSAKey.decrypt(data, "utf8")
      return decryptedData;
    } catch (err: any) {
      console.error("adminDecryptDataRSA error ======== ,", err.message);
      throw new Error(err)
    }
  }

  public async encryptDataRSA(data: any) {
    let publicKeyFile: any = config.RSA_KEYS.USER.PUBLIC;
    let publicKey: any = Buffer.from(publicKeyFile);
    let RSAKey: any = new NodeRSA(publicKey);
    RSAKey.setOptions({ encryptionScheme: 'pkcs1' });
    let encryptedData: any = RSAKey.encrypt(data, 'base64');
    return encryptedData;

  }

}

const commonHelper = new CommonHelper();
export default commonHelper;
