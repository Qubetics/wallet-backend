export interface IOnOffRampLog {
    id?: number;
    slug: string;
    merchant_id: string | null;
    order_id: string | null;
    data: string;
}