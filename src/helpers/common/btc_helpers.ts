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
            url: `${config.NODE.BTC_TESTNET_RPC_URL}`,
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
            console.log("INSIDE getUnspent")
            // Use Blockstream testnet API for UTXOs
            const url = `https://blockstream.info/testnet/api/address/${address}/utxo`;
            const response = await axios.get(url);

            if (Array.isArray(response.data)) {
                // Map Blockstream UTXO format to expected format
                return response.data.map((utxo: any) => ({
                    txid: utxo.txid,
                    vout: utxo.vout,
                    amount: utxo.value / 100000000, // value is in satoshis, convert to BTC
                    confirmations: utxo.status && utxo.status.confirmed && utxo.status.block_height
                        ? (Math.max(1, 1)) // Blockstream API does not provide current height, so set to 1 if confirmed
                        : 0,
                    height: utxo.status && utxo.status.block_height ? utxo.status.block_height : 0,
                    scriptPubKey: undefined // Not available from Blockstream UTXO endpoint
                }));
            }
            return [];
        } catch (err: any) {
            try {
            console.log("INSIDE makeRpc")

                const scanResult = await this.makeRpcCall('scantxoutset', ['start', [`addr(${address})`]]);
            
                if (scanResult && scanResult.success && scanResult.unspents && scanResult.unspents.length > 0) {
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
            } catch (fallbackError) {
                console.error("Error in getUnspent of BTC", fallbackError);
                return []
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
    

    private async fetchBlockstreamBalance(address: string) {
        const url = `https://blockstream.info/testnet/api/address/${address}`;
        const response = await axios.get(url, { timeout: 5000 });
        const { chain_stats, mempool_stats } = response.data || {};
    
        const funded = (chain_stats?.funded_txo_sum || 0) + (mempool_stats?.funded_txo_sum || 0);
        const spent = (chain_stats?.spent_txo_sum || 0) + (mempool_stats?.spent_txo_sum || 0);
    
        return (funded - spent) / 1e8;
    }
    
    public async fetchMempoolBalanceOld(address: string) {
        try {
            const url = `https://mempool.space/testnet/api/address/${address}`;
            const response = await axios.get(url, { 
                timeout: 5000
            });
            const { chain_stats, mempool_stats } = response.data || {};

            const funded = (chain_stats?.funded_txo_sum || 0) + (mempool_stats?.funded_txo_sum || 0);
            const spent = (chain_stats?.spent_txo_sum || 0) + (mempool_stats?.spent_txo_sum || 0);

            return (funded - spent) / 1e8;
        } catch (err: any) {
            console.error("Error fetching balance from mempool.space:", err);
            return null;
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
    
    private async fetchBlockCypherBalance(address: string) {
        const url = `https://api.blockcypher.com/v1/btc/test3/addrs/${address}/balance`;
        const response = await axios.get(url, { timeout: 5000 });
        return (response.data?.balance || 0) / 1e8;
    }

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
