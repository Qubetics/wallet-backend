// helpers/s3Helper.ts
const ObsClient=require('esdk-obs-nodejs')
const { Readable } = require("stream");

import { config } from '../../config';

class S3Helper {
  private obsClient: any;

  constructor() {
    this.obsClient = new ObsClient({
      access_key_id: config.HUAWEI_OBS.ACCESS_KEY,
      secret_access_key: config.HUAWEI_OBS.SECRET_KEY,
      server: config.HUAWEI_OBS.SERVER_URL,
    });
  }

  public async uploadToHuaweiS3(file: any, folder = 'Banner'): Promise<string> {
    const fileName = `${folder}/${Date.now()}_${file.name}`;
    try {
        const fileStream = new Readable();
        fileStream.push(file.data);
        fileStream.push(null); 
      const result = await this.obsClient.putObject({
        Bucket: config.HUAWEI_OBS.BUCKET,
        Key: fileName,
        Body: fileStream,
        ContentType: file.mimetype,
      });

      if (result.CommonMsg.Status < 300) {
        return fileName;
      } else {
        throw new Error(`Upload failed with status ${result.CommonMsg.Status}`);
      }
    } catch (err) {
      throw err;
    }
  }

  public async deleteFromHuaweiS3(key: string): Promise<void> {
    try {
        const result = await this.obsClient.deleteObject({
        Bucket: config.HUAWEI_OBS.BUCKET,
        Key: key,
      });
  
      if (result.CommonMsg.Status >= 300) {
        throw new Error(`OBS delete failed with status ${result.CommonMsg.Status}`);
      }
    } catch (err) {
      console.error('OBS Delete error:', err);
      throw err;
    }
  }

  public getPublicDownloadUrl(key: string): string {
    const baseUrl = (config.HUAWEI_OBS.PUBLIC_BASE_URL || '').replace(/\/$/, '');
    return baseUrl ? `${baseUrl}/${key}` : '';
  }

  public createPresignedDownloadUrl(key: string, expiresSeconds = 3600): string {
    try {
      const result = this.obsClient.createSignedUrlSync({
        Method: 'GET',
        Bucket: config.HUAWEI_OBS.BUCKET,
        Key: key,
        Expires: expiresSeconds,
      });
      return result.SignedUrl || '';
    } catch (err) {
      console.error('OBS createSignedUrl error:', err);
      throw err;
    }
  }
}

const s3Helper = new S3Helper();
export default s3Helper;
