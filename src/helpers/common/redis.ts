import { createClient } from 'redis';
import { config } from "../../config";

// redis 3 converted non-string values to strings; the current client expects strings or buffers
const toRedisValue = (value: any): string | Buffer =>
  Buffer.isBuffer(value) ? value : typeof value === 'string' ? value : String(value);

class RedisServer {

  public client_write: ReturnType<typeof createClient>;

  constructor() {
    this.client_write = createClient({ url: config.REDIS_CONN });
    this.client_write.on('connect', () => {
      console.log('Connected to redis client successfully');
    });
    // without an 'error' listener the client would crash the process on a connection error
    this.client_write.on('error', (err: any) => {
      console.error('redis client error', err?.message || err);
    });
    // commands sent before the connection is ready are queued by the client
    this.client_write.connect().catch((err: any) => {
      console.error('redis connect error', err?.message || err);
    });
  }

  // Admin set login time
  public async setRedisSting(key: string, value: number | string) {
    try {
      this.client_write.set(key, value.toString()).catch((err: any) => {
        console.error("error in setRedisSting", err.message);
      });
    } catch (err: any) {
      console.error("error in setRedisSting", err.message)
      return null;
    }
  }

  // ADMIN GET KEY
  public async getRedisSting(key: string) {
    const value = await this.client_write.get(key);
    if (value) return value;
    return null;
  }

  public async getKeyValuePair(hash: any, key: any) {
    try {
      const value = await this.client_write.hGet(hash, key || "");
      if (value) {
        return value;
      } else {
        return null;
      }
    } catch (error) {
      console.error('getKeyValuePair >>>>', error);
      return null;
    }
  }

  public async delKey(hash: any, key: any) {
    try {
      this.client_write.hDel(hash, key).catch((error: any) => {
        console.error("delKey ERROR>>>>>>", error);
      });
      return true;
    } catch (error: any) {
      console.error("delKey ERROR>>>>>>", error);
      return null;
    }
  }

  public async set_hash_table(key: string, field: any, value: any, expiryInSeconds?: number) {
    try {
      try {
        await this.client_write.hSet(key, field.toUpperCase(), toRedisValue(value));
      } catch (err: any) {
        console.error('redis set string data error...', err)
      }
      if (expiryInSeconds) {
        this.client_write.expire(key, expiryInSeconds).catch((err: any) => {
          console.error('redis expire error...', err)
        });
      }
    } catch (err: any) {
      console.error('💥 ~ ~ set_hash_table error');
      throw err;
    }
  }
}

const redisClient = new RedisServer();
export default redisClient;
