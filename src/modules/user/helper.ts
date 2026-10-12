import {
  Fiat_Currency,
  GlblBooleanEnum,
  WalletName,
} from "../../constants/global_enum";

import { Sequelize } from "sequelize";
import { global_helper } from "../../helpers/common/global_helper";
import redisClient from "../../helpers/common/redis";
import { config } from "../../config";
import dbHelper, {
  wallet_queries,
  user_queries,
  coin_queries,
  device_token_queries,
  address_book_wallet_queries,
} from "../../helpers/dbHelper/index";
import commonHelper from "../../helpers/common/common.helpers";
import { language } from "../../constants";
import kafka_helper from "../../helpers/common/kafka_helper";
import { TicsNativeAddressModel } from "../../models";


class userHelper {
  constructor() { }

  public async old_user_generate_referral(device_id: any, userId: any) {
    try {
      let user_exist: any = await user_queries.user_find_one(
        ["referral_code", "device_id"],
        { user_id: userId }
      );
      let referral_code: any;
      let where_clause: any;
      if (user_exist.referral_code == null) {
        let code: any = await userhelper.generate_referral_code();
        where_clause = { referral_code: code };
        referral_code = code;
      } else {
        referral_code = user_exist.referral_code;
      }
      if (user_exist.device_id == null) {
        where_clause = {
          ...where_clause,
          device_id: device_id,
        };
      } else {
        if (user_exist.device_id.includes(device_id)) {
          console.log("same device id exist for that user");
        } else {
          console.log("same device_id not exist");
          where_clause = {
            ...where_clause,
            device_id: Sequelize.fn(
              "CONCAT",
              Sequelize.col("device_id"),
              ",",
              device_id
            ),
          };
        }
      }
      if (where_clause) {
        await user_queries.user_update(where_clause, { user_id: userId });
      }
      return referral_code;
    } catch (err: any) {
      console.error("Error in old_user_generate_referral>>>>", err);
      await commonHelper.save_error_logs(
        "old_user_generate_referral",
        err.message
      );
      return 0;
    }
  }
  public async generate_referral_code() {
    try {
      const characters: string =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      let code: string = "";
      for (let i: number = GlblBooleanEnum.false; i < 8; i++) {
        const randomIndex: any = Math.floor(Math.random() * characters.length);
        code += characters.charAt(randomIndex);
      }
      return code;
    } catch (err: any) {
      console.error("Error in user > generate_referral_code.", err);
      await commonHelper.save_error_logs("generate_referral_code", err.message);
      return err;
    }
  }
  public async create_new_user(device_id: any, user_name: string) {
    try {
      const currentUTCDate: string = new Date()
        .toISOString()
        .replace(/T/, " ")
        .replace(/\..+/, "");
      let code: any = await userhelper.generate_referral_code();
      let obj: any = {
        user_name: user_name,
        request_rejected: 0,
        gp_referred: 0,
        pre_fran_referred: 0,
        fran_referred: 0,
        mas_fran_referred: 0,
        referral_count: GlblBooleanEnum.false,
        referral_code: code,
        referral_type_id: 1,
        device_id: device_id ? device_id : null,
        created_at: currentUTCDate,
        updated_at: currentUTCDate,
      };
      let userData: any = await user_queries.user_create(obj);
      let user_id: any = userData.user_id;
      return { code, user_id };
    } catch (err: any) {
      console.error("Error in create_new_user>>", err);
      await commonHelper.save_error_logs("create_new_user", err.message);
      return false;
    }
  }
  public async updating_balance(
    addressList: any,
    userId: number,
    req: any,
    wallet_name: string,
    lang: string,
    device_token: string,
    device_id: string
  ) {
    try {
      const currentUTCDate: string = new Date()
        .toISOString()
        .replace(/T/, " ")
        .replace(/\..+/, "");
      for await (const wallet of addressList) {
        if (!wallet.address) continue;

        let address: string = wallet.address;
        let symbol: string = wallet.symbol;
        let coin_family: number = wallet.coin_family;

        let addressValidity: any = await global_helper.validate_address(
          address,
          coin_family
        );
        if (!addressValidity)
          throw new Error(
            `${language[lang].INVALID_ADDRESS} (${symbol.toUpperCase()})`
          );

        // Getting Coin data
        let coinData: any = await coin_queries.coin_find_one(
          [
            "coin_id",
            "coin_family",
            "coin_symbol",
            "is_token",
            "token_address",
            "token_type",
          ],
          { coin_family: coin_family, coin_symbol: symbol }
        );
        if (coinData) {
          // balance of coin
          let balDetails: any = await global_helper.get_wallet_balance(
            coinData,
            address
          );
          let ifWalletExists: any = await wallet_queries.wallet_find_one(
            ["wallet_id"],
            {
              wallet_address: address,
              coin_id: coinData.coin_id,
              user_id: userId,
            }
          );
          if (ifWalletExists) {
            await wallet_queries.wallet_update(
              { wallet_name: wallet_name, status: GlblBooleanEnum.true },
              { wallet_id: ifWalletExists.wallet_id }
            );
          } else {
            let obj: any = {
              user_id: userId,
              wallet_name: wallet_name,
              wallet_address: address,
              default_wallet: GlblBooleanEnum.true,
              status: GlblBooleanEnum.true,
              coin_id: coinData.coin_id,
              balance: balDetails.status ? balDetails.balance : "0",
              coin_family: coin_family,
              is_private_wallet: req.body.isPrivateKey,
              created_at: currentUTCDate,
              updated_at: currentUTCDate,
            };
            // Creating wallet for that blockchain (coin)
            await wallet_queries.wallet_create(obj);
            await this.update_wallet_address_list(
              wallet.coin_family,
              address,
              userId,
              wallet_name
            );
          }
          if (balDetails.status == false) {
            await kafka_helper.produceMessage(config.BACKEND_WALLET_ADDRESSES, {
              coin_data: {
                coin_id: coinData.coin_id,
                coin_family: coinData.coin_family,
                is_token: coinData.is_token,
                token_address: coinData.token_address,
                token_type: coinData.token_type,
              },
              wallet_address: address,
              queue_count: 0,
            });

          }
        }
        if (device_token !== "chrome" && device_token !== "abc") {
          await this.device_token_helper(
            device_token,
            userId,
            lang,
            address,
            coin_family,
            device_id
          );
        }
      }
    } catch (err: any) {
      console.error("Error in updating_balance>>>", err);
      await commonHelper.save_error_logs("updating_balance", err.message);
      return false;
    }
  }

  public async updating_balance2(
    addressList: any,
    userId: number,
    req: any,
    wallet_name: string,
    lang: string,
    device_token: string,
    device_id: string
  ) {
    try {
      const currentUTCDate: string = new Date()
        .toISOString()
        .replace(/T/, " ")
        .replace(/\..+/, "");
      for await (const wallet of addressList) {
        if (!wallet.address) continue;

        const address: string = wallet.address;
        const symbol: string = wallet.symbol;
        const coin_family: number = wallet.coin_family;
        
        // Check if this is a TICS wallet (coin_family 7 and qubetics1 prefix)
        const isTicsWallet = coin_family === 7 && address.startsWith("qubetics");

        // Getting Coin data
        const coinData: any = await coin_queries.coin_find_one(
          [
            "coin_id",
            "coin_family",
            "coin_symbol",
            "is_token",
            "token_address",
            "token_type",
          ],
          { coin_family: coin_family, coin_symbol: symbol }
        );
        if (coinData) {

          // balance of coin
          if(!isTicsWallet)
          {
            const balDetails: any = await global_helper.get_wallet_balance(
              coinData,
              address
            );
            const ifWalletExists: any = await wallet_queries.wallet_find_one(
              ["wallet_id"],
              {
                wallet_address: address,
                coin_id: coinData.coin_id,
                user_id: userId,
              }
            );
            if (ifWalletExists) {
              await wallet_queries.wallet_update(
                { wallet_name: wallet_name, status: GlblBooleanEnum.true },
                { wallet_id: ifWalletExists.wallet_id }
              );
            } else {
              let obj: any = {
                user_id: userId,
                wallet_name: wallet_name,
                wallet_address: address,
                default_wallet: GlblBooleanEnum.true,
                status: GlblBooleanEnum.true,
                coin_id: coinData.coin_id,
                balance: balDetails.status ? balDetails.balance : "0",
                coin_family: coin_family,
                is_private_wallet: req.body.isPrivateKey,
                created_at: currentUTCDate,
                updated_at: currentUTCDate,
              };
              // Creating wallet for that blockchain (coin)
              await wallet_queries.wallet_create(obj);
              await this.update_wallet_address_list(
                wallet.coin_family,
                address,
                userId,
                wallet_name
              );
            }
            if (balDetails.status == false) {
              await kafka_helper.produceMessage(config.BACKEND_WALLET_ADDRESSES, {
                coin_data: {
                  coin_id: coinData.coin_id,
                  coin_family: coinData.coin_family,
                  is_token: coinData.is_token,
                  token_address: coinData.token_address,
                  token_type: coinData.token_type,
                },
                wallet_address: address,
                queue_count: 0,
              });

            }
          }
          else{
            const ifWalletExists: any = await wallet_queries.wallet_find_one(
              ["wallet_id"],
              {
                coin_id: coinData.coin_id,
                user_id: userId,
              }
            );
            if (ifWalletExists) {
              const ticsNativeWallet = await TicsNativeAddressModel.findOne({
                where: {
                  wallet_id: ifWalletExists.wallet_id,
                  address: address,
                }
              })
              if(!ticsNativeWallet){
                await TicsNativeAddressModel.create({
                  wallet_id: ifWalletExists.wallet_id,
                  address: address,
                  user_id: userId
                })
              }
              await this.update_wallet_address_list(
                wallet.coin_family,
                address,
                userId,
                wallet_name,
                ifWalletExists?.wallet_id
              );
            }
        }
      }
        if (device_token !== "chrome" && device_token !== "abc") {
          await this.device_token_helper(
            device_token,
            userId,
            lang,
            address,
            coin_family,
            device_id
          );
        }
      }
    } catch (err: any) {
      console.error("Error in updating_balance>>>", err);
      await commonHelper.save_error_logs("updating_balance", err.message);
      return false;
    }
  }

  public async update_wallet_address_list(
    coin_family: number,
    address: string,
    user_id: number,
    wallet_name: string,
    wallet_id?: number
  ) {
    try {
      switch (coin_family) {
        case config.STATIC_COIN_FAMILY.ETH:
          await redisClient.set_hash_table(
            config.ETH_WALLET_ADDRESS,
            address,
            JSON.stringify({ address, user_id, wallet_name })
          );
          break;
        case config.STATIC_COIN_FAMILY.BNB:
          await redisClient.set_hash_table(
            config.BNB_WALLET_ADDRESS,
            address,
            JSON.stringify({ address, user_id, wallet_name })
          );
          break;
        case config.STATIC_COIN_FAMILY.BTC:
          await redisClient.set_hash_table(
            config.BTC_WALLET_ADDRESS,
            address,
            JSON.stringify({ address, user_id, wallet_name })
          );
          break;
        case config.STATIC_COIN_FAMILY.TRX:
          await redisClient.set_hash_table(
            config.TRON_WALLET_ADDRESS,
            address,
            JSON.stringify({ address, user_id, wallet_name })
          );
          break;
        case config.STATIC_COIN_FAMILY.POL:
          await redisClient.set_hash_table(
            config.POL_WALLET_ADDRESS,
            address,
            JSON.stringify({ address, user_id, wallet_name })
          );
          break;
        case config.STATIC_COIN_FAMILY.TICS:
          if(address.startsWith("qubetics") && wallet_id){
            await redisClient.set_hash_table(
              config.TICS_NATIVE_WALLET_ADDRESS,
              address,
              JSON.stringify({ address, user_id, wallet_name, wallet_id })
            );
            break;
          }else{
            await redisClient.set_hash_table(
              config.TICS_WALLET_ADDRESS,
              address,
              JSON.stringify({ address, user_id, wallet_name })
            );
            break;
          }
        case config.STATIC_COIN_FAMILY.SOL:
          await redisClient.set_hash_table(
            config.SOL_WALLET_ADDRESS,
            address,
            JSON.stringify({ address, user_id, wallet_name })
          );
          break;
      }
    } catch (err: any) {
      console.error("Error in update_wallet_address_list.", err);
      await commonHelper.save_error_logs(
        "update_wallet_address_list",
        err.message
      );
      throw err;
    }
  }
  public async device_token_helper(
    device_token: any,
    userId: number,
    lang: string,
    address: string,
    coin_family: number,
    device_id: string
  ) {
    try {
      let checkUserDeviceToken: any =
        await device_token_queries.device_token_find_one(["status"], {
          device_id: device_id,
          address: address,
          coin_family: coin_family,
        });
      if (!checkUserDeviceToken) {
        await device_token_queries.device_token_create({
          device_id: device_id,
          device_token: device_token,
          user_id: userId,
          address: address,
          coin_family: coin_family,
          status: GlblBooleanEnum.true,
          language: lang,
          fiat_currency: Fiat_Currency.USD,
          push: 1,
        });
      } else {
        await device_token_queries.device_token_update(
          { status: GlblBooleanEnum.true, device_token: device_token },
          { device_id: device_id, address: address, coin_family: coin_family }
        );
      }
      return true;
    } catch (err: any) {
      console.error("Error in device_token_helper>>>", err);
      await commonHelper.save_error_logs("device_token_helper", err.message);
      return false;
    }
  }
  public async wallet_name(
    address_book_id: number,
    coin_family: number,
    wallet_name: string
  ) {
    try {
      let check_name: any =
        await address_book_wallet_queries.address_book_wallets_find_all(
          ["name"],
          { address_book_id: address_book_id, coin_family: coin_family }
        );

      if (check_name.length == GlblBooleanEnum.false) {
        if (
          wallet_name.length == GlblBooleanEnum.false &&
          coin_family == config.STATIC_COIN_FAMILY.ETH
        ) {
          wallet_name = WalletName.ETH;
        } else if (
          wallet_name.length == GlblBooleanEnum.false &&
          coin_family == config.STATIC_COIN_FAMILY.BTC
        ) {
          wallet_name = WalletName.BTC;
        } else if (
          wallet_name.length == GlblBooleanEnum.false &&
          coin_family == config.STATIC_COIN_FAMILY.TRX
        ) {
          wallet_name = WalletName.TRX;
        } else if (
          wallet_name.length == GlblBooleanEnum.false &&
          coin_family == config.STATIC_COIN_FAMILY.BNB
        ) {
          wallet_name = WalletName.BNB;
        } else if (
          wallet_name.length == GlblBooleanEnum.false &&
          coin_family == config.STATIC_COIN_FAMILY.POL
        ) {
          wallet_name = WalletName.POL;
        } else if (
          wallet_name.length == GlblBooleanEnum.false &&
          coin_family == config.STATIC_COIN_FAMILY.TICS
        ) {
          wallet_name = WalletName.TICS;
        } else if (
          wallet_name.length == GlblBooleanEnum.false &&
          coin_family == config.STATIC_COIN_FAMILY.SOL
        ) {
          wallet_name = WalletName.SOL;
        }
      } else if (check_name.length > GlblBooleanEnum.false) {
        for (let i = GlblBooleanEnum.false; i < check_name.length; i++) {
          let p: any = check_name[i].name.substring(
            3,
            check_name[i].name.length
          );
          p = parseInt(p);
          if (coin_family == config.STATIC_COIN_FAMILY.ETH) {
            if (check_name[i].name == WalletName.ETH) {
              wallet_name = `${WalletName.ETH}${i + 1}`;
            } else if (check_name[i].name == `${WalletName.ETH}${i}`) {
              wallet_name = `${WalletName.ETH}${i + 1}`;
            } else {
              if (p >= 1) {
                wallet_name = `${WalletName.ETH}${p + 1}`;
              }
            }
          } else if (coin_family == config.STATIC_COIN_FAMILY.BTC) {
            if (check_name[i].name == WalletName.BTC) {
              wallet_name = `${WalletName.BTC}${i + 1}`;
            } else if (check_name[i].name == `${WalletName.BTC}${i}`) {
              wallet_name = `${WalletName.BTC}${i + 1}`;
            } else {
              if (p >= 1) {
                wallet_name = `${WalletName.BTC}${p + 1}`;
              }
            }
          } else if (coin_family == config.STATIC_COIN_FAMILY.TRX) {
            if (check_name[i].name == WalletName.TRX) {
              wallet_name = `${WalletName.TRX}${i + 1}`;
            } else if (check_name[i].name == `${WalletName.TRX}${i}`) {
              wallet_name = `${WalletName.TRX}${i + 1}`;
            } else {
              if (p >= 1) {
                wallet_name = `${WalletName.TRX}${p + 1}`;
              }
            }
          } else if (coin_family == config.STATIC_COIN_FAMILY.BNB) {
            if (check_name[i].name == WalletName.BNB) {
              wallet_name = `${WalletName.BNB}${i + 1}`;
            } else if (check_name[i].name == `${WalletName.BNB}${i}`) {
              wallet_name = `${WalletName.BNB}${i + 1}`;
            } else {
              if (p >= 1) {
                wallet_name = `${WalletName.BNB}${p + 1}`;
              }
            }
          } else if (coin_family == config.STATIC_COIN_FAMILY.POL) {
            if (check_name[i].name == WalletName.POL) {
              wallet_name = `${WalletName.POL}${i + 1}`;
            } else if (check_name[i].name == `${WalletName.POL}${i}`) {
              wallet_name = `${WalletName.POL}${i + 1}`;
            } else {
              if (p >= 1) {
                wallet_name = `${WalletName.POL}${p + 1}`;
              }
            }
          } else if (coin_family == config.STATIC_COIN_FAMILY.TICS) {
            if (check_name[i].name == WalletName.TICS) {
              wallet_name = `${WalletName.TICS}${i + 1}`;
            } else if (check_name[i].name == `${WalletName.TICS}${i}`) {
              wallet_name = `${WalletName.TICS}${i + 1}`;
            } else {
              if (p >= 1) {
                wallet_name = `${WalletName.TICS}${p + 1}`;
              }
            }
          }
        }
      }
      return wallet_name;
    } catch (err: any) {
      console.error("Error in finding default wallet_name>>>>", err);
      await commonHelper.save_error_logs("wallet_name", err.message);
      return wallet_name;
    }
  }

  public async referral_already_used(data: any, lang: string) {
    try {
      let {
        device_id,
        wallet_address,
        user_id,
      }: {
        device_id: string;
        wallet_address: string | null;
        user_id: number | 0;
      } = data;
      /** check device id already used */
      let device_check: any = await dbHelper.checkIfuserReferred({
        to_device_id: device_id,
      });
      if (device_check) {
        throw new Error(`${language[lang].REFERRED_ALREADY_USED})`);
      } else {
        /** check user/wallet address already used  or not*/
        if (wallet_address) {
          let wallet_check: any = await dbHelper.find_one_wallet_table(
            ["email", "user_id", "wallet_id"],
            { wallet_address: wallet_address }
          );

          user_id = wallet_check ? wallet_check.user_id : 0;
        }

        if (user_id > 0) {
          let user_took_reward: any = await dbHelper.checkIfuserReferred({
            referrer_to: user_id,
          });
          if (user_took_reward) {
            throw new Error(`${language[lang].REFERRED_ALREADY_USED})`);
          }
        }
      }
    } catch (err: any) {
      console.error("Error in check_referral_already_exist.", err);
      await commonHelper.save_error_logs(
        "check_referral_already_exist",
        err.message
      );
      throw err;
    }
  }
  public async referral_code_is_valid(referral_code: string, lang: string) {
    try {
      let user_exist: any = await user_queries.user_find_one(
        ["referral_code", "device_id"],
        { referral_code: referral_code }
      );
      if (user_exist == null) {
        throw new Error(`${language[lang].INVALID_REFERRAL_CODE})`);
      }
    } catch (error) {
      await commonHelper.save_error_logs("check_referral_code_exist", error);
      return { status: false, data: null };
    }
  }
  public async save_referral_code(data: any, lang: string) {
    try {
      let {
        user_id,
        referral_code,
        device_id,
      }: { user_id: number; referral_code: string; device_id: string } = data;
      let referrer_from_data: any = await dbHelper.get_referrer_from_data(
        referral_code
      );
      if (
        referrer_from_data &&
        referrer_from_data.referral_code.toString() === referral_code.toString()
      ) {
        if (referrer_from_data.user_id != user_id) {
          let referral_to_data: any = await dbHelper.get_user_data(user_id);
          if (referral_to_data) {
            let referral_data = {
              referrer_from: referrer_from_data.user_id,
              referrer_to: referral_to_data.user_id,
              used_referral_code: referral_code,
              to_device_id: device_id,
            };
            await dbHelper.save_referral_data(referral_data);
          }
        }
      } else {
        throw new Error(`${language[lang].INVALID_CODE})`);
      }
    } catch (err: any) {
      console.error("Error in update_referral_code>>", err);
      await commonHelper.save_error_logs("update_referral_code", err.message);
      throw err;
    }
  }
}

const userhelper = new userHelper();
export default userhelper;
