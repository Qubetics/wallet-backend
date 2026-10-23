import { CoinsModel } from "../../../models";
import redisClient from "../../../helpers/common/redis";
import { config } from "../../../config";
import { global_helper } from "../../../helpers/common/global_helper";
import commonHelper from "../../../helpers/common/common.helpers";
import { GlblAddedBy, GlblBooleanEnum } from "../../../constants/global_enum";
import { coin_queries } from "../../../helpers/dbHelper";
import { WalletHelper } from "../../wallet/wallet.helpers";


class TokenHelpers {
    constructor() {
      this.initialize();
    }
    public initialize() { }
    
    public async get_token_list(obj: any){
        try {
            const token_list : any = await CoinsModel.findAndCountAll({
                where: obj.where,
                attributes : obj.attributes,
                order: obj.order,
                limit: obj.limit,
                offset: obj.offset,
                include: obj.includes
            });
          
            return {
                token_list: token_list.rows,
                total: token_list.count,
                page: obj.page,
                per_page: obj.limit,
                total_pages: Math.ceil(token_list.count / obj.limit)
            };
        } catch (err: any) {
            console.error("Error in get_token_list", err)
        }
    }

    public async searchToken(tokenAddress : string, coinFamily : number ) {
      
        try {
      
          if (!tokenAddress || !coinFamily) {
            return "tokenAddress & coinFamily required"
          }
      
          const redisKey = `${config.SEARCH_TOKEN}_${coinFamily}`;
          const tokenDetailsStr = await redisClient.getKeyValuePair(redisKey, tokenAddress.toUpperCase());
      
          let tokenDetails: { decimals: string; name: string; symbol: string };
      
          if (tokenDetailsStr) {
            tokenDetails = JSON.parse(tokenDetailsStr);
          } else {
            tokenDetails = await global_helper.return_decimals_name_symbol(
              coinFamily,
              tokenAddress,
              'en'
            );
      
            if (!tokenDetails) {
                return "INVALID TOKEN"
            }
      
            tokenDetails.decimals = tokenDetails.decimals.toString();
            await redisClient.set_hash_table(redisKey, tokenAddress, JSON.stringify(tokenDetails),3600);
          }
      
          if (
            Object.keys(tokenDetails).length !== 0 &&
            tokenDetails.constructor === Object
          ) {
      
            return tokenDetails
          }
      
          return "TOKENS_NOT_FOUND"
        } catch (err: any) {
          console.error("Error in token > searchToken.", err);
        }
      }

      public async addCoinToTable(
        tokenAddress: string,
        symbol: string,
        name: string,
        coinFamily: number,
        tokenType: string,
        decimals: any,
        currentUTCDate: any
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
            added_by: GlblAddedBy.ADMIN,
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
    
          return { coinData: coinData };
        } catch (err: any) {
          console.error("Error in add_coin_to_table>>", err);
          await commonHelper.save_error_logs("add_coin_to_table", err.message);
          return null;
        }
      }
    
   
  }
  export const TokenHelper = new TokenHelpers();