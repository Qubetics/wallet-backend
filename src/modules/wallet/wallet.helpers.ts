import { OnlyControllerInterface } from "../../interfaces/controller.interface";
import redisHelper from "../../helpers/common/redis";
import * as Models from "../../models/model/index";
import { config } from "../../config";
import { GlblAddedBy, GlblBooleanEnum } from "../../constants/global_enum";
import { exponentialToDecimal } from "../../helpers/common/globalFunctions";
import { coin_queries, custom_token_queries } from "../../helpers/dbHelper";
import { language } from "../../constants";
import { global_helper } from "../../helpers/common/global_helper";
import commonHelper from "../../helpers/common/common.helpers";
import { wallet_queries } from "../../helpers/dbHelper";
import kafka_helper from "../../helpers/common/kafka_helper";
import resent_graph_data_queries from "../../helpers/dbHelper/resent_graph_data";
import { Op } from "sequelize";
class WalletHelpers implements OnlyControllerInterface {
  constructor() {
    this.initialize();
  }
  public initialize() { }
  public async add_coin_to_table(
    tokenAddress: string,
    symbol: string,
    name: string,
    coinFamily: number,
    tokenType: string,
    decimals: any,
    lang: any,
    currentUTCDate: any,
    userId: number
  ) {
    try {
      let swapSupported: number = 0;

      if (
        coinFamily == config.STATIC_COIN_FAMILY.ETH ||
        coinFamily == config.STATIC_COIN_FAMILY.BNB ||
        coinFamily == config.STATIC_COIN_FAMILY.POL
      ) {
        swapSupported = await global_helper.oneInchSwapSupported(
          tokenAddress,
          coinFamily
        );
      }

      let image: any = null;
      let cmc_id: number | null = null;
      let graphSource: string | null = null;
      let graphPair: string | null = null;

      if (tokenAddress && symbol) {


        const cmcPayload: any = {
          symbol: symbol,
          coinFamily: coinFamily,
          tokenAddress: tokenAddress,
        }
        const cmc_data: any = await global_helper.getTokenImageFromCmcBySymbol(cmcPayload);


        console.log("this is the cmc_data >>>", cmc_data);
        cmc_id = cmc_data ? cmc_data.id : GlblBooleanEnum.false;
        image = cmc_data ? cmc_data.image : null;
        const tradingViewData = await global_helper.getTradingSource(symbol);
        console.log("tradingViewData >>>", tradingViewData);
        if (tradingViewData.status) {
          graphSource = tradingViewData.graphSource;
          graphPair = tradingViewData.graphPair;
        }
      }
      console.log("coinZone>>>", image, "token_type>>", image);

      let coinData: any = {
        coin_name: name,
        coin_symbol: symbol.toUpperCase(),
        coin_image: image,
        cmc_id: cmc_id,
        coin_family: coinFamily,
        coin_status: GlblBooleanEnum.true,
        is_token: GlblBooleanEnum.true,
        is_on_cmc: GlblBooleanEnum.true,
        for_swap: swapSupported,
        added_by: GlblAddedBy.USER,
        token_type: tokenType.toUpperCase(),
        decimals: Math.pow(10, parseInt(decimals)),
        token_address: tokenAddress,
        created_at: currentUTCDate,
        updated_at: currentUTCDate,
        graph_pair: graphPair,
        graph_source: graphSource,
        is_on_trading_view: graphSource ? 1 : 0,
      };
      let response: any = await coin_queries.coin_create(coinData);
      console.log("🚀 ~ WalletHelpers ~ response:", response)

      coinData.coin_id = response.coin_id;
      const redisCoinData = {
        coin_id: coinData.coin_id,
        is_token: coinData.is_token,
        token_address: coinData.token_address,
        coin_family: coinData.coin_family,
        decimals: coinData.decimals,
        token_type: coinData.token_type,
        coin_symbol: coinData.coin_symbol,
        added_by: coinData.added_by,
        for_swap: coinData.for_swap
      }
      await WalletHelper.update_token_in_redis_hash(redisCoinData)
      await custom_token_queries.custom_token_create({
        coin_id: coinData.coin_id,
        user_id: userId,
      });

      if (cmc_id != null) {
        await WalletHelper.insert_graph_reset_data(cmc_id);
      }

      return { coinData: coinData };
    } catch (err: any) {
      console.error("Error in add_coin_to_table>>", err);
      await commonHelper.save_error_logs("add_coin_to_table", err.message);
      return null;
    }
  }

  private async insert_graph_reset_data(cmc_id: number) {
    try {
      let currentUTCDate: string = new Date()
        .toISOString()
        .replace(/T/, " ")
        .replace(/\..+/, "");
      let graph_data: any =
        await resent_graph_data_queries.resent_graph_data_find_one(["id"], {
          cmc_id: cmc_id,
        });
      if (graph_data == null) {
        await resent_graph_data_queries.resent_graph_data_create({
          cmc_id: cmc_id,
          graph_type: "1d",
          created_at: currentUTCDate,
          updated_at: null,
        });
      }
    } catch (err: any) {
      console.error("Error in insert_graph_reset_data>>", err);
      await commonHelper.save_error_logs(
        "insert_graph_reset_data",
        err.message
      );
      throw err;
    }
  }


  public async insert_entry_in_custom_token_table(
    coinId: number,
    userId: number
  ) {
    try {
      let selectToken: any = await custom_token_queries.custom_token_find_one(
        ["id", "user_id", "coin_id"],
        { coin_id: coinId, user_id: userId }
      );
      if (selectToken == null) {
        await custom_token_queries.custom_token_create({
          coin_id: coinId,
          user_id: userId,
        });
      } else {
        console.log("Data is present in selectToken");
      }
    } catch (err: any) {
      console.error("Error in insert_entry_in_custom_token_table>>", err);
      await commonHelper.save_error_logs(
        "insert_entry_in_custom_token_table",
        err.message
      );
      return null;
    }
  }

  public async create_wallet_for_coin(
    walletAddress: string,
    coinId: number,
    walletName: string,
    userId: number,
    coinFamily: number,
    lang: string,
    currentUTCDate: any,
    tokenAddress: string,
    isToken: number,
    tokenType: string
  ) {
    try {
      let message: any;
      let wallet_data: any = await wallet_queries.wallet_find_one_with_order(
        ["wallet_id", "status"],
        { wallet_address: { [Op.like]: walletAddress }, coin_id: coinId },
        [["wallet_id", "ASC"]]
      );
      if (!wallet_data) {
        let tokenBalData: any = await global_helper.get_new_token_balance(
          coinFamily,
          walletAddress,
          tokenAddress
        );

        const save_wallet_data = {
          wallet_address: walletAddress,
          wallet_name: walletName,
          coin_id: coinId,
          user_id: userId,
          balance: tokenBalData.status ? tokenBalData.balance : "0",
          default_wallet: 1,
          coin_family: coinFamily,
          status: 1,
          created_at: currentUTCDate,
          updated_at: currentUTCDate,
        };
        await wallet_queries.wallet_create(save_wallet_data);
        message = language[lang].TOKEN_ADDED;
        if (tokenBalData.status == false) {
          // add to queue
          await kafka_helper.produceMessage(config.BACKEND_WALLET_ADDRESSES, {
            coin_data: {
              coin_id: coinId,
              coin_family: coinFamily,
              is_token: isToken,
              token_address: tokenAddress,
              token_type: tokenType,
            },
            wallet_address: walletAddress,
            queue_count: 0,
          });
        }
      } else {
        if (wallet_data.status == 1) {
          message = language[lang].TOKEN_EXIST;
        } else {
          await wallet_queries.wallet_update(
            { status: 1 },
            { wallet_address: walletAddress, coin_id: coinId }
          );
          message = language[lang].TOKEN_ADDED;
        }
      }
      return message;
    } catch (err: any) {
      console.error("error at create_wallet_for_coin================>", err);
      await commonHelper.save_error_logs("create_wallet_for_coin", err.message);
      return null;
    }
  }

  public async update_token_in_redis(coin_data: any, coin_id: number) {
    try {
      let coin_family = coin_data.coin_family;
      let tokensList: any;
      let specific_token_data: any;
      if (coin_id > 0) {
        let token: any = await coin_queries.coin_find_one([], {
          coin_id: coin_id,
        });
        specific_token_data = token;
      } else {
        specific_token_data = coin_data;
      }
      switch (coin_family) {
        case config.STATIC_COIN_FAMILY.ETH:
          tokensList = await redisHelper.getRedisSting(
            config.TOKENLIST.ETH.ERC20
          );
          tokensList = JSON.parse(tokensList);
          if (tokensList) {
            await tokensList.push(specific_token_data);
            await redisHelper.setRedisSting(
              config.TOKENLIST.ETH.ERC20,
              JSON.stringify(tokensList)
            );
          } else {
            tokensList = await coin_queries.coin_find_all([], {
              coin_status: 1,
              coin_family: coin_family,
            });
            await redisHelper.setRedisSting(
              config.TOKENLIST.ETH.ERC20,
              JSON.stringify(tokensList)
            );
          }
          break;
        case config.STATIC_COIN_FAMILY.BNB:
          tokensList = await redisHelper.getRedisSting(
            config.TOKENLIST.BSC.BEP20
          );
          tokensList = JSON.parse(tokensList);
          if (tokensList) {
            await tokensList.push(specific_token_data);
            await redisHelper.setRedisSting(
              config.TOKENLIST.BSC.BEP20,
              JSON.stringify(tokensList)
            );
          } else {
            tokensList = await coin_queries.coin_find_all([], {
              coin_status: 1,
              coin_family: coin_family,
            });
            await redisHelper.setRedisSting(
              config.TOKENLIST.BSC.BEP20,
              JSON.stringify(tokensList)
            );
          }
          break;
        case config.STATIC_COIN_FAMILY.POL:
          tokensList = await redisHelper.getRedisSting(
            config.TOKENLIST.POL.ERC20
          );
          tokensList = JSON.parse(tokensList);
          if (tokensList) {
            await tokensList.push(specific_token_data);
            await redisHelper.setRedisSting(
              config.TOKENLIST.POL.ERC20,
              JSON.stringify(tokensList)
            );
          } else {
            tokensList = await coin_queries.coin_find_all([], {
              coin_status: 1,
              coin_family: coin_family,
            });
            await redisHelper.setRedisSting(
              config.TOKENLIST.POL.ERC20,
              JSON.stringify(tokensList)
            );
          }
          break;
        case config.STATIC_COIN_FAMILY.TICS:
          tokensList = await redisHelper.getRedisSting(
            config.TOKENLIST.TICS.ERC20
          );
          tokensList = JSON.parse(tokensList);
          if (tokensList) {
            await tokensList.push(specific_token_data);
            await redisHelper.setRedisSting(
              config.TOKENLIST.TICS.ERC20,
              JSON.stringify(tokensList)
            );
          } else {
            tokensList = await coin_queries.coin_find_all([], {
              coin_status: 1,
              coin_family: coin_family,
            });
            await redisHelper.setRedisSting(
              config.TOKENLIST.TICS.ERC20,
              JSON.stringify(tokensList)
            );
          }
          break;
        case config.STATIC_COIN_FAMILY.SOL:
          tokensList = await redisHelper.getRedisSting(
            config.TOKENLIST.SOL.SPL
          );
          tokensList = JSON.parse(tokensList);
          if (tokensList) {
            await tokensList.push(specific_token_data);
            await redisHelper.setRedisSting(
              config.TOKENLIST.SOL.SPL,
              JSON.stringify(tokensList)
            );
          } else {
            tokensList = await coin_queries.coin_find_all([], {
              coin_status: 1,
              coin_family: coin_family,
            });
            await redisHelper.setRedisSting(
              config.TOKENLIST.SOL.SPL,
              JSON.stringify(tokensList)
            );
          }
          break;
        case config.STATIC_COIN_FAMILY.TRX:
          tokensList = await redisHelper.getRedisSting(
            config.TOKENLIST.TRON.TRX20
          );
          tokensList = JSON.parse(tokensList);
          if (tokensList) {
            await tokensList.push(specific_token_data);
            await redisHelper.setRedisSting(
              config.TOKENLIST.TRON.TRX20,
              JSON.stringify(tokensList)
            );
          } else {
            tokensList = await coin_queries.coin_find_all([], {
              coin_status: 1,
              coin_family: coin_family,
            });
            await redisHelper.setRedisSting(
              config.TOKENLIST.TRON.TRX20,
              JSON.stringify(tokensList)
            );
          }
          break;
      }
    } catch (err: any) {
      console.error("error at update_token_in_redis", err);
      await commonHelper.save_error_logs("update_token_in_redis", err.message);
      return null;
    }
  }

  public async update_token_in_redis_hash(coin_data: any) {
    try {
      switch (coin_data.coin_family) {
        case config.STATIC_COIN_FAMILY.BNB:
          await redisHelper.set_hash_table(
            config.TOKENLIST.BSC.BEP20,
            coin_data.token_address,
            JSON.stringify(coin_data)
          );
          break;
        case config.STATIC_COIN_FAMILY.POL:
          await redisHelper.set_hash_table(
            config.TOKENLIST.POL.ERC20,
            coin_data.token_address,
            JSON.stringify(coin_data)
          );
        case config.STATIC_COIN_FAMILY.TICS:
          await redisHelper.set_hash_table(
            config.TOKENLIST.TICS.ERC20,
            coin_data.token_address,
            JSON.stringify(coin_data)
          );
        case config.STATIC_COIN_FAMILY.SOL:
          await redisHelper.set_hash_table(
            config.TOKENLIST.SOL.SPL,
            coin_data.token_address,
            JSON.stringify(coin_data)
          );
          break;
        case config.STATIC_COIN_FAMILY.TRX:
          await redisHelper.set_hash_table(
            config.TOKENLIST.TRON.TRX20,
            coin_data.token_address,
            JSON.stringify(coin_data)
          );
          break;
        default:
          await redisHelper.set_hash_table(
            config.TOKENLIST.ETH.ERC20,
            coin_data.token_address,
            JSON.stringify(coin_data)
          );
          break;
      }
    } catch (err: any) {
      console.error("Error in update_token_in_redis_hash.", err);
      await commonHelper.save_error_logs(
        "update_token_in_redis_hash",
        err.message
      );
      return null;
    }

  }

  public async min_coin_balance(
    wallet_data: any,
    fiat_currency: string,
    usd_value: any
  ) {
    try {
      let fiat_currency_value: any = await Models.CoinPriceInFiatModel.findOne({
        attributes: ["value"],
        where: {
          coin_id: wallet_data.coin_id,
          fiat_type: fiat_currency,
        },
        raw: true,
      });
      let min_bal: number = 10 / usd_value;
      let min_bal_in_fiat: number = min_bal * fiat_currency_value.value;
      min_bal_in_fiat =
        min_bal_in_fiat < 0.000001
          ? await WalletHelper.toFixedExp(min_bal_in_fiat, 8)
          : min_bal_in_fiat < 0.0001
            ? await WalletHelper.toFixedExp(min_bal_in_fiat, 6)
            : await WalletHelper.toFixedExp(min_bal_in_fiat, 2);
      console.log("min_bal>>>>", min_bal_in_fiat);
      return {
        min_bal_in_fiat: min_bal_in_fiat,
        fiat_value: fiat_currency_value.value,
      };
    } catch (err: any) {
      console.error("Error in min_coin_balance of wallet", err);
      throw err;
    }
  }

  public async toFixedExp(num: any, fixed: number) {
    try {
      if (num) {
        num = exponentialToDecimal(Number(num));
        let re = new RegExp("^-?\\d+(?:.\\d{0," + (fixed || -1) + "})?");
        return num.toString().match(re)[0];
      } else {
        return "0.00";
      }
    } catch (err: any) {
      console.error("Error in toFixedExp>>", err);
      return "0.00";
    }
  }

  public async updateNftTokenInRedis(coinData: any) {
    try {
      switch (coinData.coin_family) {
        case config.STATIC_COIN_FAMILY.ETH:
          await redisHelper.set_hash_table(
            config.TOKENLIST.ETH.NFT,
            coinData.token_address,
            JSON.stringify(coinData)
          );
          break;
        case config.STATIC_COIN_FAMILY.TICS:
          await redisHelper.set_hash_table(
            config.TOKENLIST.TICS.NFT,
            coinData.token_address,
            JSON.stringify(coinData)
          );
          break;
      }
    } catch (err: any) {
      console.error("Error in update_nft_token_in_redis.", err);
      await commonHelper.save_error_logs(
        "update_nft_token_in_redis",
        err.message
      );
      return null;
    }
  }

  // Function to filter elements based on the age range
  public async filterByAgeRange(
    elementsArray: any,
    range: string
  ): Promise<any[]> {
    try {
      const now = Date.now(); // Current timestamp
      let timeRange: number = 0;
      // Define time ranges
      switch (range) {
        case "1d":
          timeRange = 1 * 24 * 60 * 60 * 1000; // 1 day in milliseconds
          break;
        case "1w":
          timeRange = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
          break;
        case "1m":
          timeRange = 30 * 24 * 60 * 60 * 1000; // 30 days (approx 1 month)
          break;
        case "3m":
          timeRange = 90 * 24 * 60 * 60 * 1000; // 90 days (approx 3 months)
          break;
        case "1y":
          timeRange = 365 * 24 * 60 * 60 * 1000; // 1 year
          break;
        case "all":
          timeRange = 0; // all time
          break;
        default:
          timeRange = 0; // If invalid range, default to zero
      }

      if (!timeRange) {
        return elementsArray;
      }
      // Calculate the time threshold
      const thresholdTime = new Date(now - timeRange);

      // Find the index of the first element that meets the time condition
      const firstMatchIndex = elementsArray.findIndex((item: any) => {
        const itemTime = new Date(item.timestamp);
        return itemTime >= thresholdTime; // Match items within the specified range
      });

      // Return all remaining elements starting from the first match
      if (firstMatchIndex !== -1) {
        return elementsArray.slice(firstMatchIndex);
      }

      // If no match is found, return an empty array
      return [];
    } catch (error) {
      console.log("::Error log:: filterByAgeRange :>> ", error);
      return [];
    }
  }

  public async parsePossiblyQuotedNumber(value: any) {
    try {
      if (typeof value === 'string') {
        // Check if it's a stringified number with quotes inside (e.g. "\"18\"")
        if (/^"\d+(\.\d+)?"$/.test(value)) {
          const innerValue = JSON.parse(value); // => "18"
          return Number(innerValue);            // => 18
        }

        // Handle direct number strings like "18"
        if (/^\d+(\.\d+)?$/.test(value)) {
          return Number(value);
        }
      }

      // If it's already a number, return it
      if (typeof value === 'number') {
        return value;
      }
    } catch (error) {
      console.error("Failed to parse value:", value, error);
    }

    return null; // fallback if not parsable
  }
}
export const WalletHelper = new WalletHelpers();
