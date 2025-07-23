import { config } from "../../config";
import axios, { AxiosInstance } from "axios";
import { global_helper } from "./global_helper";
import commonHelper from "./common.helpers";

class utxo {
    public config: any;
    private rpcConfig: any;
    
    constructor() {
        this.config = {
            method: 'get',
            headers: {
                'apikey': `${config.NODE.BTC_API_KEY}`,
                'Content-Type': 'application/json',
            }
        };
         // Configuration for testnet RPC calls
         this.rpcConfig = {
            method: 'post',
            url: 'https://bitcoin-testnet-rpc.publicnode.com',
            headers: {
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
            // throw err;
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

    private async makeRpcCall(method: string, params: any[] = []) {
        try {
            const requestData = {
                jsonrpc: '2.0',
                method: method,
                params: params,
                id: 1
            };

            const response = await axios({
                ...this.rpcConfig,
                data: requestData
            });

            if (response.data.error) {
                console.log("🚀 ~ utxo ~ makeRpcCall ~ err  :", { method , error: response.data.error })
                throw new Error(`RPC Error: ${response.data.error.message}`);
            }
            console.log("🚀 ~ utxo ~ makeRpcCall ~ response:", { method , result: response.data.result })

            return response.data.result;
        } catch (err: any) {
            console.error(`Error in RPC call ${method}:`, err);
            throw err;
        }
    }

    public async getUnspent(address: string) {
        try {
            // For public nodes, use scantxoutset to get unspent outputs for any address
            const scanResult = await this.makeRpcCall('scantxoutset', ['start', [`addr(${address})`]]);
            
            if (scanResult && scanResult.success && scanResult.unspents && scanResult.unspents.length > 0) {
                // Transform scantxoutset result to match listunspent format
                return scanResult.unspents.map((utxo: any) => ({
                    txid: utxo.txid,
                    vout: utxo.vout,
                    amount: utxo.amount,
                    confirmations: scanResult.height - utxo.height + 1,
                    height: utxo.height,
                    scriptPubKey: utxo.scriptPubKey
                }));
            }
            
            return [];
        } catch (err: any) {
            // Fallback to listunspent if available
            try {
                const unspent = await this.makeRpcCall('listunspent', [0, 9999999, [address]]);
                return unspent;
            } catch (fallbackError) {
                console.error("Error in getUnspent of BTC", err);
                return null;
            }
        }
    }

    public async getTransactionDetails(txid: string) {
        try {
            const transaction = await this.makeRpcCall('getrawtransaction', [txid, true]);
            return transaction;
        } catch (err: any) {
            console.error("Error in getTransactionDetails of BTC", err);
            return null;
        }
    }
    public async sendRpcRawTransaction(raw: string) {
        try {
            const txid = await this.makeRpcCall('sendrawtransaction', [raw]);
            return { status: true, data: txid };
        } catch (err: any) {
            console.error("Error in sendRawTransaction of BTC", err);
            
            if (err.message && err.message.includes('dust')) {
                return { status: false, custom_err_msg: "Entered amount is too low." };
            }

            return { status: false, data: err.message };
        }
    }

    public async getBalance(address: string) {
        try {
            const scanResult = await this.makeRpcCall('scantxoutset', ['start', [`addr(${address})`]]);
            return scanResult.total_amount || 0;
        } catch (err: any) {
            try {
                const unspent = await this.makeRpcCall('listunspent', [0, 9999999, [address]]);
                const balance = unspent.reduce((total: number, utxo: any) => total + utxo.amount, 0);
                return balance;
            } catch (fallbackError) {
                console.error("Both scantxoutset and listunspent failed for balance:", err);
                return null;
            }
        }
    }

    public async validateBtcAddress(address: string) {
        try {
            const result = await this.makeRpcCall('validateaddress', [address]);
            
            if (result && typeof result.isvalid === 'boolean') {
                return result.isvalid;
            }
            
            return false;
        } catch (err: any) {
            console.error("Error in validation BTC address", err);
            return false;
        }
    }
}

export const utxobtc = new utxo();
