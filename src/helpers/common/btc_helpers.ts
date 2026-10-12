import { config } from "../../config";
import axios, { AxiosInstance } from "axios";
import { global_helper } from "./global_helper";
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

    //mainnet endpoint
    public async get_balance(address: string) {
        try {

            const TESTNET = true;

            if (TESTNET == true) {
                return this.getBalance(address)
            }

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

    //testnet endpoint
    public async getBalance(address: string) {
        try {
            // 1. Try Blockstream API first
            console.log("Getting balance from Mempool.space getBalance for BTC address ---->", address)
            return await this.fetchMempoolBalance(address);
        } catch (err) {

            console.warn("Mempool.space failed, trying BlockCypher...");
            try {
                // 2. Fallback: Mempool.space API
                return await this.fetchBlockstreamBalance(address);
            } catch (err2) {
                try {
                    console.warn("Blockstream failed, trying Mempool.space...");
                    // 3. Fallback: BlockCypher API
                    return await this.fetchBlockCypherBalance(address);
                } catch (err3) {
                    console.warn("BlockCypher failed, trying RPC...");
                    try {
                        // 4. Fallback: Your existing RPC scan
                        const scanResult = await this.makeRpcCall('scantxoutset', ['start', [`addr(${address})`]]);
                        return scanResult.total_amount || 0;
                    } catch (fallbackError) {
                        console.error("All balance fetch methods failed:", fallbackError);
                        return null;
                    }
                }
            }
        }
    }


    public async fetchMempoolBalance(address: string) {
        try {
            const url = `https://mempool.space/testnet/api/address/${address}`;
            const response = await axios.get(url, {
                timeout: 5000,
            });

            const { chain_stats } = response.data || {};

            // ✅ confirmed only
            const funded = chain_stats?.funded_txo_sum || 0;
            const spent = chain_stats?.spent_txo_sum || 0;

            return (funded - spent) / 1e8;
        } catch (err: any) {
            console.error("Error fetching balance from mempool.space:", err);
            return null;
        }
    }

    private async fetchBlockstreamBalance(address: string) {
        const url = `https://blockstream.info/testnet/api/address/${address}`;
        const response = await axios.get(url, { timeout: 5000 });
        const { chain_stats, mempool_stats } = response.data || {};

        const funded = (chain_stats?.funded_txo_sum || 0) + (mempool_stats?.funded_txo_sum || 0);
        const spent = (chain_stats?.spent_txo_sum || 0) + (mempool_stats?.spent_txo_sum || 0);

        return (funded - spent) / 1e8;
    }


    private async fetchBlockCypherBalance(address: string) {
        const url = `https://api.blockcypher.com/v1/btc/test3/addrs/${address}/balance`;
        const response = await axios.get(url, { timeout: 5000 });
        return (response.data?.balance || 0) / 1e8;
    }

    private async makeRpcCall(method: string, params: any[] = []) {
        try {
            const requestData = {
                jsonrpc: '2.0',
                method: method,
                params: params,
                id: 1
            };

            const response = await axios({
                ...this.config,
                data: requestData
            });

            if (response.data.error) {
                console.log("🚀 ~ utxo ~ makeRpcCall ~ err  :", { method, error: response.data.error })
                throw new Error(`RPC Error: ${response.data.error.message}`);
            }
            console.log("🚀 ~ utxo ~ makeRpcCall ~ response:", { method, result: response.data.result })

            return response.data.result;
        } catch (err: any) {
            console.error(`Error in RPC call ${method}:`, err);
            throw err;
        }
    }


}

export const utxobtc = new utxo();
