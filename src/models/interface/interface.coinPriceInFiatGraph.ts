export interface CoinPriceInFiatGraphInterface {
  id: number;
  // coin_id: number;
  cmc_id?: number;
  // coin_type: string;
  fiat_type: string;
  // value: number | 0;
  sparkline?: string;
  type?: String;
  // price_change_24h?: number | 0;
  // price_change_percentage_24h?: number | 0;
  latest_price: string | null;
  latest_price_source: string | null;
}
