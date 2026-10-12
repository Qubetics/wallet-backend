export interface WalletInterface {
  wallet_id: number;
  user_id: number;
  wallet_name: string;
  wallet_address: string;
  coin_id: number;
  coin_family?: number;
  balance: number | string;
  status?: number | 0;
  sort_order?: number | null;
  created_at: string;
  updated_at: string;
}
