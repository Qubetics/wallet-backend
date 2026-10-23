export interface CoinPriceInFiatGraphInterface {
  id: number;
  cmc_id?: number;
  fiat_type: string;
  sparkline?: string;
  type?: String;
  latest_price: string | null;
  latest_price_source: string | null;
}
