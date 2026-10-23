import { Op } from "sequelize";
import { GlblBooleanEnum } from "../../constants/global_enum";
import * as Models from "../../models/model/index";
import commonHelper from "../../helpers/common/common.helpers";

class ChainAbstractionHelpers {
  constructor() {
    this.initialize();
  }
  public initialize() { }
 
  public async getCoinList(coinFamilies: any[], addrsList: any[], userId: number) {
    try {
      
      //Hardcoded for Bitcoin & TICS Remove this later when blockchain integration is done
      coinFamilies = [3,7];
      const coinIds = [3, 161]; // 3 is Bitcoin, 161 is TICS Hardcoded for now
      const coinSymbols = ["btc", "tics"];


      const data: any = await Models.CoinsModel.findAll({
        attributes: [
          "coin_id",
          "coin_image",
          "coin_name",
          "coin_symbol",
          "coin_family",
          "is_token",
          "token_address",
          "token_type",
          "coin_status",
          "decimals"
        ],
        where: {
          coin_status: GlblBooleanEnum.true,
          coin_family: { [Op.in]: coinFamilies },
          coin_symbol: { [Op.in]: coinSymbols },
          coin_id: { [Op.in]: coinIds }
        },
        include: [
          {
            model: Models.WalletModel,
            attributes: [
              "wallet_address", "balance"
            ],
            where: {
              user_id: userId,
              wallet_address: { [Op.in]: addrsList },
            },
            required: false,
            as: "wallet_data",
          },
          {
            model: Models.CoinPriceInFiatModel,
            as: "fiat_price_data",
            attributes: [
              "price_change_24h",
              "value",
              "price_change_percentage_24h",
            ],
            where: {
              fiat_type: "USD",
            },
            required: false,
          },
        ],
        
      });
      return data;
    } catch (error: any) {
      console.error("Error in getCoinList>>>>", error);
      await commonHelper.save_error_logs("getCoinList", error?.message);
      return [];
    }
  }
}
export const chainAbstractionHelper = new ChainAbstractionHelpers();
