export interface NotificationInterface {
  notification_id?: number;
  message: string | null;
  amount: number;
  from_user_id: number;
  to_user_id?: number | null;
  notification_type: string;
  tx_id?: number | null;
  tx_type?: string | null;
  coin_symbol: string | null;
  coin_family: number;
  coin_id: number;
  view_status?: number | null;
  state: string | null;
  wallet_address?: string | null;
  created_at: Date,
  updated_at: Date
}
