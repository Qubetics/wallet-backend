import * as Models from "../../models/model/index";
import { Op, Sequelize } from "sequelize";
import axios from "axios";
import { config } from "../../config";


const CMC_CONFIG = {
    URL: "https://pro-api.coinmarketcap.com/v2/cryptocurrency/",
    KEY: config.CMC_ROTATION_KEYS[0],
    KEY2: config.CMC_ROTATION_KEYS[1],
    KEY3: config.CMC_ROTATION_KEYS[2],
    KEY4: config.CMC_ROTATION_KEYS[3],
    KEY5: config.CMC_ROTATION_KEYS[4],
}

// Array of all available API keys for rotation
const API_KEYS = [
    CMC_CONFIG.KEY,
    CMC_CONFIG.KEY2,
    CMC_CONFIG.KEY3,
    CMC_CONFIG.KEY4,
    CMC_CONFIG.KEY5
];

class FactPriceUpdateHelpers {

    /**
     * Key Rotation Mechanism:
     * - Uses 5 different CMC API keys to avoid rate limits
     * - Rotates keys using modulo operation: keyIndex = requestIndex % totalKeys
     * - Request 0 uses KEY1, Request 1 uses KEY2, ..., Request 5 uses KEY1 again
     * - Each request in the loop uses a different API key automatically
     * - Helps distribute API load across multiple keys for better rate limit management
     */

    // Method to get API key based on rotation index
    private getRotatedApiKey(index: number): string {
        const keyIndex = index % API_KEYS.length; // Rotate through keys using modulo
        console.log(`🔑 Using API Key ${keyIndex + 1}/${API_KEYS.length} for request ${index + 1}`);
        return API_KEYS[keyIndex];
    }

    public async cmcApi(params: any, keyRotationIndex: number = 0) {
        try {
          let url: string = "";
          let header: any = {};
          let result: any;
          
              // Use rotated API key based on the provided index
              const selectedApiKey = this.getRotatedApiKey(keyRotationIndex);
              
              url = `${CMC_CONFIG.URL}${params}`;
              header = { "X-CMC_PRO_API_KEY": selectedApiKey };
              
              console.log(`🌐 Making API request to: ${url}`);
              console.log(`🔐 Using API Key ending in: ...${selectedApiKey.slice(-8)}`);
              
              result = await axios({
                method: "get",
                url: url,
                headers: header,
              });
        
          return result;
        } catch (err: any) {
          console.error("Error in cmcApi >>>", err);
          // Log specific rate limit errors for monitoring
          if (err.response?.status === 429) {
            console.error(`⚠️ Rate limit hit for API key ending in: ...${this.getRotatedApiKey(keyRotationIndex).slice(-8)}`);
          }
          throw err; // Re-throw to handle in calling function
        }
      }


public updateFiatPrice = async () => {
    try {
      // Fetch 10 coins with valid CMC IDs from the database
      const coinIds: any = await Models.CoinsModel.findAll({
        attributes: ['cmc_id'],
        group: ['cmc_id'],
        order: [['created_at', 'ASC']],
        limit: 10,
        where: {
          cmc_id: {
            [Op.ne]: 0
          },
          [Op.and]: [
            Sequelize.literal('cmc_id IS NOT NULL')
          ]
        }
      });

      // Extract CMC IDs from the result and create an array
      const cmcIds: any[] = coinIds ? coinIds.map((row: any) => row.cmc_id) : [];

      console.log("Array of cmcIds 🔆🔆", cmcIds);
  
      if (cmcIds.length > 0) {
        // Fetch fiat currency conversion rates from database (excluding USD)
        console.log("📊 Fetching fiat currency rates from database...");
        const fiatRatesRaw = await Models.CurrencyFiatModel.findAll({
          attributes: ["currency_code", "price_in_usd"],
          where: {
            currency_code: { [Op.ne]: "USD" },
          },
          raw: true,
          order: [["currency_id", "asc"]],
        });

        // Build a fiat rate map (including USD = 1)
        console.log("💱 Building fiat rate mapping...");
        const fiatRateMap: Record<string, number> = {
          USD: 1, // Base currency - no conversion needed
        };
        
        // Populate fiat rate map with conversion rates
        for (const fiat of fiatRatesRaw) {
          const code = fiat.currency_code.toUpperCase();
          const rate = fiat.price_in_usd;
          if (rate && rate > 0) {
            fiatRateMap[code] = rate;
          }
        }

        console.log("🔄 Starting to process coins one by one...");
        
        // Process each coin individually with delay
        for (let i = 0; i < cmcIds.length; i++) {
          const cmcId = cmcIds[i];
          
          try {
            console.log(`⏳ Processing coin ${i + 1}/${cmcIds.length} - CMC ID: ${cmcId}`);
            
            // Fetch live market data for single coin from CMC API with key rotation
            // Pass the loop index (i) to rotate through API keys
            const result = await this.cmcApi(`quotes/latest?id=${cmcId}&convert=USD`, i);
            const cmcData = result?.data?.data;

            // Check if we got valid data for this coin
            if (!cmcData || !cmcData[cmcId]) {
              console.log(`⚠️ No data found for CMC ID: ${cmcId}, skipping...`);
              continue;
            }

            const coinObj = cmcData[cmcId];
            const usdQuote = coinObj.quote?.USD;
            
            // Skip if USD quote data is missing
            if (!usdQuote) {
              console.log(`⚠️ No USD quote data for CMC ID: ${cmcId}, skipping...`);
              continue;
            }

            console.log(`💰 Processing price data for ${coinObj.name} (${coinObj.symbol})`);

            // Construct latest price object with all USD-based metrics
            const latest_price_usd: any = {
              price: usdQuote.price || 0,
              timestamp: usdQuote.last_updated,
              price_change_24h: usdQuote.percent_change_24h || 0,
              volume_24h: usdQuote.volume_24h || 0,
              percent_change_7d: usdQuote.percent_change_7d || 0,
              percent_change_30d: usdQuote.percent_change_30d || 0,
            };

            // Update prices for each fiat currency
            console.log(`💲 Updating prices for all fiat currencies...`);
            for (const fiatCode in fiatRateMap) {
              const fiatRate = fiatRateMap[fiatCode];
              const fiatPrice = usdQuote.price * fiatRate; // Convert USD price to fiat currency

              const where = { cmc_id: coinObj.id, fiat_type: fiatCode };

              // Check if price record already exists for this coin-fiat combination
              let existingPrice = await Models.CoinPriceInFiatModel.findOne({
                attributes: ["id", "coin_id"],
                where,
                raw: true,
              });

              let coin_id: number = 0;

              if (!existingPrice) {
                // Record doesn't exist - create new entry
                console.log(`➕ Creating new price record for ${coinObj.symbol} in ${fiatCode}`);
                
                // Fetch coin details from database
                const coin = await Models.CoinsModel.findOne({
                  attributes: ["coin_id", "coin_family", "cmc_id", "token_address"],
                  where: { cmc_id: coinObj.id },
                });

                if (!coin) {
                  console.log(`⚠️ Coin not found in database for CMC ID: ${coinObj.id}`);
                  continue;
                }
                coin_id = coin.coin_id;

                // Create new price record with all necessary data
                await Models.CoinPriceInFiatModel.create({
                  coin_id: coin.coin_id,
                  coin_name: coinObj.name,
                  coin_family: coin.coin_family,
                  max_supply: coinObj.max_supply || 0,
                  cmc_id: coinObj.id,
                  circulating: coinObj.circulating_supply || 0,
                  total_supply: coinObj.total_supply,
                  rank: coinObj.cmc_rank || 0,
                  market_cap: usdQuote.market_cap * fiatRate, // Convert market cap to fiat
                  fiat_type: fiatCode,
                  coin_symbol: coinObj.symbol,
                  value: fiatPrice,
                  price_change_24h: usdQuote.percent_change_24h || 0,
                  price_change_percentage_24h: usdQuote.percent_change_24h || 0,
                  volume_24h: usdQuote.volume_24h * fiatRate, // Convert volume to fiat
                  token_address: coin.token_address || "",
                  latest_price: latest_price_usd,
                });
              } else {
                // Record exists - update existing entry
                console.log(`🔄 Updating existing price record for ${coinObj.symbol} in ${fiatCode}`);
                coin_id = existingPrice.coin_id;
                
                await Models.CoinPriceInFiatModel.update(
                  {
                    value: fiatPrice, // Updated price in fiat currency
                    price_change_24h: usdQuote.percent_change_24h,
                    price_change_percentage_24h: usdQuote.percent_change_24h,
                    volume_24h: usdQuote.volume_24h * fiatRate, // Updated volume in fiat
                    total_supply: coinObj.total_supply,
                    latest_price: latest_price_usd, // Latest USD price data
                  },
                  { where }
                );
              }
            }

            console.log(`✅ Successfully processed ${coinObj.name} (${coinObj.symbol})`);

            // Add delay only if this is not the last coin
            if (i < cmcIds.length - 1) {
              console.log("⏱️ Waiting 1second before processing next coin...");
              await new Promise(resolve => setTimeout(resolve, 1000));
            }

          } catch (coinError: any) {
            console.error(`❌ Error processing coin with CMC ID ${cmcId}:`, coinError);
            
            // Check if it's a rate limit error and log which key was being used
            if (coinError.response?.status === 429) {
              const usedKeyIndex = i % API_KEYS.length;
              console.error(`🚫 Rate limit exceeded for API Key ${usedKeyIndex + 1} on coin ${i + 1}`);
              console.log(`💡 Tip: Consider increasing delay between requests or adding more API keys`);
            }
            
            // Continue with next coin even if current one fails
            continue;
          }
        }

        console.log("🎉 Finished processing all coins!");
      }

    } catch (error) {
      console.error("❌ updateFiatPrice error", error);
    }
  };



}

export const factPriceUpdateHelper = new FactPriceUpdateHelpers()
