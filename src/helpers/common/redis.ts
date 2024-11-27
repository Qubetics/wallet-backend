import redis from 'redis';
import { promisify } from "util";
import { config } from "../../config";
// import { CoinFamily } from '../../constants/global_enum';
// import commonHelper from './common.helpers';


class RedisServer {

  public client_write: redis.RedisClient;

  constructor() {
    this.client_write = redis.createClient({ url: config.REDIS_CONN });
    this.client_write.on('connect', () => {
      console.log('Connected to redis client successfully');
    });
  }
  // public async initiateConnection(): Promise<void> {
  //   this.client_write = redis.createClient({ url: config.REDIS_CONN });
  //   this.client_write.on('connect', () => {
  //     console.log('Connected to redis client successfully');
  //   });
  // }

  // Admin set login time
  public async setRedisSting(key: string, value: number | string) {
    try {
      this.client_write.set(key, value.toString());
    } catch (err: any) {
      console.error("error in setRedisSting", err.message)
      return null;
    }
  }

  // ADMIN GET KEY
  public async getRedisSting(key: string) {
    const getAsync = promisify(this.client_write.get).bind(this.client_write);
    const value = await getAsync(key);
    if (value) return value;
    return null;
  }

  public async getKeyValuePair(hash: any, key: any) {
    try {
      const getAsync = promisify(this.client_write.HGET).bind(this.client_write);
      const value = await getAsync(hash, key || "");
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
      this.client_write.HDEL(hash, key)
      return true;
    } catch (error: any) {
      console.error("delKey ERROR>>>>>>", error);
      return null;
    }
  }

  // Admin del key
  public async del(key: any) {
    try {
      this.client_write.DEL(key)
    } catch (error: any) {
      console.error("delKey ERROR>>>>>>", error);
      return null;
    }
  }

  public async set_hash_table(key: string, field: any, value: any) {
    try {
      await this.client_write.HSET(key, field.toUpperCase(), value, (err: any, reply: any) => {
        if (err) {
          console.error('redis set string data error...', err)
        }
      });
    } catch (err: any) {
      console.error('💥 ~ ~ set_hash_table error');
      throw err;
    }
  }
  // public async set_hash_table_with_expiry(key: string, field: any, value: any, expiry: any) {
  //   try {
  //     field = field.toUpperCase()
  //     this.client_write.HSET(key, field, value, (err: any, reply: any) => {
  //       if (err) {
  //         console.error('redis set_hash_table_with_expiry string data error...', err)
  //       }
  //       this.client_write.expire(key, expiry, (err: any, reply: any) => {
  //         if (err) {
  //           console.error('redis set_hash_table_with_expiry string data error...', err)
  //         }
  //       })
  //     });
  //   } catch (err: any) {
  //     console.error('💥 ~ ~ set_hash_table_with_expiry error');
  //     throw err;
  //   }
  // }
  // public async setRedisSting_with_expiry(key: string, value: any, expiry: any) {
  //   try {
  //     this.client_write.set(key, value);
  //     this.client_write.expire(key, expiry, (err: any, reply: any) => {
  //       if (err) {
  //         console.error('redis set_hash_table_with_expiry string data error...', err)
  //       }
  //     })
  //   } catch (error) {
  //     console.error('setRedisSting_with_expiry >>>>', error);
  //     return null;
  //   }
  // }
}

const redisClient = new RedisServer();
export default redisClient;
