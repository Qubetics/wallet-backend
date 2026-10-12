import { config } from "../../config";
import axios from "axios";
import commonHelper from "./common.helpers";

class utxo {
    public config: any;

    constructor() {
        this.config = {
            method: 'get',
            headers: {
                'apikey': `${config.NODE.BTC_API_KEY}`,
                'Content-Type': 'application/json',
            }
        };
    }

    public async validate_btc_address(address: string) {
        try {
            this.config.url = `${config.NODE.BTC_RPC_URL}api/v2/address/${address}`
            let validate_data: any = await axios(this.config);
            if (validate_data.data) {
                return true;
            } else {
                return false;
            }
        } catch (err: any) {
            console.error("Error in validation BTC address", err)
            await commonHelper.save_error_logs("validate_btc_address", err.message);
            return false;
        }
    }
    public async get_balance(address: string) {
        try {
            this.config.url = `${config.NODE.BTC_RPC_URL}api/v2/address/${address}`
            let response: any = await axios(this.config);
            return response.data.balance / 100000000;
        } catch (err: any) {
            console.error("Erorr in get balacne of BTC.", err)
            await commonHelper.save_error_logs("get_balance_btc", err.message);
            return null;
        }
    }

    public async sendRawTransaction(raw: string) {
        try {
            this.config.url = `${config.NODE.BTC_RPC_URL}api/v2/sendtx/${raw}`;
            console.log("this config >>>>", this.config)
            let response: any = await axios(this.config);
            return { status: true, data: response.data };
        } catch (err: any) {
            console.error("Error in sendRawTransaction of BTC", err)
            if (err.response && err.response.data && err.response.data.error === '-26: dust') {
                return { status: false, custom_err_msg: "Entered amount is too low." };
            }
    
            return { status: false, data: (err as Error).message };
        }
    }
}

export const utxobtc = new utxo();
