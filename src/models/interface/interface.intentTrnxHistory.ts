export interface IntentTrnxHistoryInterface {
    id: number,
    user_id: number;
    tx_id: string | null;
    status: string | null;
    tx_hash: string | null;
    fees: number;
    created_at?: string;
    updated_at?: string;
}
