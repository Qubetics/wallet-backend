export interface DvpnPlansInterface {
    id: number;
    wallet_id: number;
    user_id: number;
    plan_id: string;
    status: string;
    plan_amount: string;
    provider_id: string;
    country_name: string;
    country_code: string;
    country_flag: string;
    server_location: string;    
    created_at?: string;
    updated_at?: string;
}