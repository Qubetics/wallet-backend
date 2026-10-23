export interface MpcWalletsInterface {
    id?: number;
    wallet_id: number;
    user_id: number;
    coin_family: number;
    wallet_address: string;
    balance: number | string;
    created_at?: Date;
    updated_at?: Date;
  }
  