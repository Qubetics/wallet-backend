import axios from "axios";
import { config } from "../../config";
import { ethEther } from "./eth";
import { GlblMessages, TradingSourceResponse } from "../../constants/enum";
import { utxobtc } from "./btc";
import { trxHelper } from "./trx";
import { CoinInterface } from "../../models";
import { AbiItem } from "../../interfaces/ether.interface";
import { exponentialToDecimal } from "./functions";
// import * as Models from '../../models/model/index';
import commonHelper from "./common";
import { bscEther } from "./bsc";
import { URL as _URL, URLSearchParams as _URLSearchParams } from "url";
import { polEther } from "./pol";
import { SolanaHelper } from "./solana";
import cmcHelper from "./cmc";
import { ticsEther } from "./tics";
import firebaseAdmin from 'firebase-admin';
import { fcmServiceAccount } from "../../constants/firebase";
// import { error } from "console";


class GlobalHelper {
    public messaging: firebaseAdmin.messaging.Messaging | undefined;
    constructor() {
        (async () => {
            firebaseAdmin.initializeApp({
                credential: firebaseAdmin.credential.cert(fcmServiceAccount),
            });
            this.messaging = firebaseAdmin.messaging();
        })();
    }

    public async oneInchSwapSupported(tokenAddress: any, coin_family: number) {
        let chain_id = 56;
        if (coin_family == config.STATIC_COIN_FAMILY.ETH) {
            chain_id = 1;
        } else if (coin_family == config.STATIC_COIN_FAMILY.POL) {
            chain_id = 137;
        }
        let config1: any = {
            method: "get",
            maxBodyLength: Infinity,
            url: `https://api.1inch.dev/token/v1.2/${chain_id}/search?query=${tokenAddress}&ignore_listed=false`,
            headers: {
                Authorization: config.ON_CHAIN.ONEINCH_API_KEY,
            },
        };

        try {
            return axios.request(config1).then((response) => {
                console.log(JSON.stringify(response.data));
                if (response.data.length > 0) {
                    return 1;
                }
                return 0;
            }).catch((error) => {
                console.error("Error swapping tokens 222:", error);
                return 0;
            });
        } catch (error) {
            console.error("Error swapping tokens:", error);
            return 0;
        }
    }

    public async returnDecimalsNameSymbol(coin_family: number, token_address: string, lang: string) {
        try {
            console.log('coin_family <<<<', coin_family, typeof coin_family);
            console.log('token_address <<<<', token_address);
            console.log('config.STATIC_COIN_FAMILY', config.STATIC_COIN_FAMILY);
            let tokenDetails: any = { decimals: 0, name: "", symbol: "" }
            switch (coin_family) {
                case config.STATIC_COIN_FAMILY.BNB:
                    tokenDetails = await bscEther.searchToken(token_address, lang);
                    break;
                case config.STATIC_COIN_FAMILY.ETH:
                    tokenDetails = await ethEther.searchToken(token_address, lang);
                    break;
                case config.STATIC_COIN_FAMILY.TRX:
                    tokenDetails = await trxHelper.searchToken(token_address, lang);
                    break;
                case config.STATIC_COIN_FAMILY.POL:
                    tokenDetails = await polEther.searchToken(token_address, lang);
                    break;
                case config.STATIC_COIN_FAMILY.TICS:
                    tokenDetails = await ticsEther.searchToken(token_address, lang);
                    break;
                case config.STATIC_COIN_FAMILY.SOL:
                    tokenDetails = await SolanaHelper.searchToken(token_address, lang);
                    break;
            }
            return tokenDetails;
        } catch (err: any) {
            console.error("Error in returnDecimalsNameSymbol>>", err)
            await commonHelper.saveErrorLogs("returnDecimalsNameSymbol", err.message);
            return (null)
        }
    }

    public async validateAddress(walletAddress: string, coinFamily: number) {
        try {
            switch (coinFamily) {
                case config.STATIC_COIN_FAMILY.BNB:
                    return await bscEther.validateBnbAddress(walletAddress);
                case config.STATIC_COIN_FAMILY.ETH:
                    return await ethEther.validateEthAddress(walletAddress);
                case config.STATIC_COIN_FAMILY.BTC:
                    return await utxobtc.validateBtcAddress(walletAddress);
                case config.STATIC_COIN_FAMILY.POL:
                    return await polEther.validatePolAddress(walletAddress);
                case config.STATIC_COIN_FAMILY.TICS:
                    return await ticsEther.validateTicsAddress(walletAddress);
                case config.STATIC_COIN_FAMILY.TRX:
                    return await trxHelper.validateTrxAddress(walletAddress)
                case config.STATIC_COIN_FAMILY.SOL:
                    return await SolanaHelper.validateSolAddress(walletAddress)
            }
        } catch (err: any) {
            console.error("Error in validateAddress", err)
            await commonHelper.saveErrorLogs("validateAddress", err.message);
            return false;
        }
    }

    public async getNewTokenBalance(coinFamily: number, walletAddress: string, tokenAddress: string) {
        try {
            let tokenBalance: any;
            let userBalance: string = '';
            switch (coinFamily) {
                case config.STATIC_COIN_FAMILY.BNB:
                    tokenBalance = (await bscEther.getBep20TokenBalance(tokenAddress, config.CONTRACT_ABI as AbiItem[], walletAddress))?.toString();
                    userBalance = exponentialToDecimal(Number(tokenBalance))
                    break;
                case config.STATIC_COIN_FAMILY.ETH:
                    tokenBalance = (await ethEther.getErc20TokenBalance(tokenAddress, config.CONTRACT_ABI as AbiItem[], walletAddress))?.toString();
                    userBalance = exponentialToDecimal(Number(tokenBalance))
                    break;
                case config.STATIC_COIN_FAMILY.POL:
                    tokenBalance = (await polEther.getErc20TokenBalance(tokenAddress, config.CONTRACT_ABI as AbiItem[], walletAddress))?.toString();
                    userBalance = exponentialToDecimal(Number(tokenBalance))
                    break;
                case config.STATIC_COIN_FAMILY.TICS:
                    tokenBalance = (await ticsEther.getErc20TokenBalance(tokenAddress, config.CONTRACT_ABI as AbiItem[], walletAddress))?.toString();
                    userBalance = exponentialToDecimal(Number(tokenBalance))
                    break;
                case config.STATIC_COIN_FAMILY.TRX:
                    userBalance = (await trxHelper.trc20TokenBalance(walletAddress, tokenAddress, false))?.toString()
                    break;
                case config.STATIC_COIN_FAMILY.SOL:
                    userBalance = (await SolanaHelper.getUserCRC20TokenBalance(tokenAddress, walletAddress, false))?.toString()
                    break;
                default:
                    throw GlblMessages.INVALID_COIN_FAMILY
            }
            return { status: true, balance: userBalance };
        } catch (err: any) {
            console.error("Error in getNewTokenBalance.", err)
            await commonHelper.saveErrorLogs("getNewTokenBalance", err.message);
            return { status: false, balance: '0' };
        }
    }

    // public async findPlateform(coin_family: number) {
    //     try {
    //         const coingecko_platforms_ids = [
    //             {
    //                 id: "ethereum",
    //                 name: "ethereum",
    //                 shortname: "ETH",
    //                 coin_family: config.STATIC_COIN_FAMILY.ETH,
    //                 symbol: GlblCoins.ETH
    //             },
    //             {
    //                 id: "bitcoin",
    //                 name: "bitcoin",
    //                 shortname: "BTC",
    //                 coin_family: config.STATIC_COIN_FAMILY.BTC,
    //                 symbol: GlblCoins.BTC
    //             },
    //             {
    //                 id: "TRON",
    //                 name: "TRON",
    //                 shortname: "TRON",
    //                 coin_family: config.STATIC_COIN_FAMILY.TRX,
    //                 symbol: GlblCoins.TRX
    //             },
    //             {
    //                 id: "binance",
    //                 name: "BNB",
    //                 shortname: "BNB",
    //                 coin_family: config.STATIC_COIN_FAMILY.BNB,
    //                 symbol: GlblCoins.BNB
    //             },
    //             {
    //                 id: "polygon",
    //                 name: "POL",
    //                 shortname: "POL",
    //                 coin_family: config.STATIC_COIN_FAMILY.POL,
    //                 symbol: GlblCoins.POL
    //             },
    //         ];
    //         const platform_id: any = await coingecko_platforms_ids.find((pd) => pd.coin_family == coin_family);
    //         return platform_id;
    //     } catch (err: any) {
    //         console.error("Error in findPlateForm helper", err)
    //         await commonHelper.saveErrorLogs("findPlateform", err.message);
    //         return null;
    //     }
    // }

    public async updateCmcImgUrl(image_url: string) {
        try {
            console.log('image_url >>>', image_url);
            if (image_url?.includes("img/coins/16x16/")) {
                image_url = image_url.replace('16x16', '200x200');
            } else if (image_url?.includes("img/coins/32x32/")) {
                image_url = image_url.replace('32x32', '200x200');
            } else if (image_url?.includes("img/coins/64x64/")) {
                image_url = image_url.replace('64x64', '200x200');
            } else if (image_url?.includes("img/coins/128x128/")) {
                image_url = image_url.replace('128x128', '200x200');
            }
            return image_url;
        } catch (err: any) {
            console.error(`updateCmcImgUrl error>>> `, err)
            return null;
        }
    }

    public async getWalletBalance(coinData: CoinInterface, wallet_address: string, isString: boolean) {
        try {
            let balance: string | any = '0';
            switch (coinData.coin_family) {
                case config.STATIC_COIN_FAMILY.BNB:
                    balance = (await bscEther.getBalance(coinData, wallet_address, isString))?.toString()
                    break;
                case config.STATIC_COIN_FAMILY.ETH:
                    balance = (await ethEther.getBalance(coinData, wallet_address, isString))?.toString()
                    break;
                case config.STATIC_COIN_FAMILY.BTC:
                    balance = (await utxobtc.getBalance(wallet_address))?.toString()
                    break;
                case config.STATIC_COIN_FAMILY.POL:
                    balance = (await polEther.getBalance(coinData, wallet_address, isString))?.toString()
                    break;
                case config.STATIC_COIN_FAMILY.TICS:
                    balance = (await ticsEther.getBalance(coinData, wallet_address, isString))?.toString()
                    break;
                case config.STATIC_COIN_FAMILY.TRX:
                    balance = (await trxHelper.fetchBalance(wallet_address, coinData, false))?.toString()
                    break;
                case config.STATIC_COIN_FAMILY.SOL:
                    balance = (await SolanaHelper.fetchBalance(wallet_address, coinData, false))?.toString()
                    break;
            }
            if (balance == null) return { status: false, balance: '0' };
            else return { status: true, balance: balance };
        } catch (err: any) {
            console.error("Error in getWalletBalance.", err)
            await commonHelper.saveErrorLogs("getWalletBalance", err.message);
            return { status: false, balance: '0' };
        }
    }

    // public async getWalletBalance(coinData: CoinInterface, wallet_address: string) {
    //     try {
    //         let balance: string | any = '0';
    //         switch (coinData.coin_family) {
    //             case config.STATIC_COIN_FAMILY.BNB:
    //                 balance = (await bscEther.getBalance(coinData, wallet_address))?.toString()
    //                 break;
    //             case config.STATIC_COIN_FAMILY.ETH:
    //                 balance = (await ethEther.getBalance(coinData, wallet_address))?.toString()
    //                 break;
    //             case config.STATIC_COIN_FAMILY.BTC:
    //                 balance = (await utxobtc.get_balance(wallet_address))?.toString()
    //                 break;
    //             case config.STATIC_COIN_FAMILY.POL:
    //                 balance = (await polEther.getBalance(coinData, wallet_address))?.toString()
    //                 break;
    //             case config.STATIC_COIN_FAMILY.TICS:
    //                 balance = (await ticsEther.getBalance(coinData, wallet_address))?.toString()
    //                 break;
    //             case config.STATIC_COIN_FAMILY.TRX:
    //                 balance = (await trxHelper.fetchBalance(wallet_address, coinData, true))?.toString()
    //                 break;
    //             case config.STATIC_COIN_FAMILY.SOL:
    //                 balance = (await SolanaHelper.fetchBalance(wallet_address, coinData, true))?.toString()
    //                 break;
    //         }
    //         return { status: true, balance: balance };
    //     } catch (err: any) {
    //         console.error("Error in get_wallet_balance.", err)
    //         await commonHelper.saveErrorLogs("get_wallet_balance", err.message);
    //         return { status: false, balance: '0' };
    //     }
    // }

    // public async fetchData(method: string, url: string, header: Object) {
    //     try {
    //         let config_data: any = {
    //             method: method,
    //             url: url,
    //             headers: header
    //         }
    //         let return_data: any;
    //         await axios(config_data)
    //             .then(function (response) {
    //                 return_data = response?.data;
    //                 return response?.data;
    //             })
    //             .catch(function (err: any) {
    //                 console.error('axios catch error', err.message);
    //                 return_data = null;
    //                 return null;
    //             });
    //         return return_data;
    //     } catch (err: any) {
    //         console.error('🔥 ~ ~ fetchData error', err);
    //         return null;
    //     }
    // }

    public subtractDays(date: any, days: number) {
        date.setDate(date.getDate() - days);
        return date;
    }

    public subtractMonths(date: any, months: number) {
        date.setMonth(date.getMonth() - months);
        return date;
    }

    // public async saveNotification(object: NotificationInterface) {
    //     try {
    //         await Models.NotificationModel.create(object)
    //         return true;
    //     } catch (err: any) {
    //         console.error("Error in saveNotification>>>>", err)
    //         return false;
    //     }
    // }


    public async sendNotification(data: any) {
        try {
            if (data.token?.length > 0) {
                const notification = {
                    title: data.title,
                    body: data.message,
                };
                if (this.messaging) {
                    this.messaging
                        .sendEachForMulticast({
                            tokens: data.token,
                            notification: notification,
                            data: {
                                body: data.message ? data.message : "",
                                title: data.title ? data.title : "",
                                notification_type: data.notification_type ? data.notification_type : "",
                                tx_id: data.tx_id ? data.tx_id.toString() : "0",
                                tx_type: data.tx_type ? data.tx_type : "",
                                from_user_id: data.from_user_id ? data.from_user_id?.toString() : "0",
                                user_coin_id: data.coin_id ? data.coin_id?.toString() : "0"
                            }
                        })
                        .then((response: any) => {
                            console.log("💥🚀 ~ firebase admin push notification", JSON.stringify(response));
                        })
                        .catch((error: any) => {
                            console.error(
                                "💥 ~ firebase admin sending notification error",
                                error
                            );
                        });
                }
            }
            return true;
        } catch (error) {
            console.error(`🔥 ~ sendNewNotification utility.helper.ts error`, error);
            return false;
        }
    }

    public async getTokenImageFromCmc(data: any) {
        try {
            let params: any = data.symbol ? `info?symbol=${data.symbol}` : data.id ? `info?id=${data.id}` : `info?address=${data.token_address}`;
            let result: any = await cmcHelper.cmcApi(params);

            let id: any = null;
            let imageUrl: any = null;
            if (result.data) {
                let image: any;
                if (data.id) {
                    id = data.id;
                    image = result.data.data[id as keyof typeof String].logo;
                } else {
                    id = result.data.data[data.symbol.toUpperCase() as keyof typeof String][0].id;
                    image = result.data.data[data.symbol.toUpperCase() as keyof typeof String][0].logo;
                }
                imageUrl = await this.updateCmcImgUrl(image);
            }
            return { image: imageUrl, id: id };
        } catch (err: any) {
            console.error("Error in getTokenImageFromCmc", err);
            return null;
        }
    }

    public async getTradingSource(symbol: string): Promise<TradingSourceResponse> {
        console.log('symbol symbol', symbol);
        if (!symbol) return { status: false, graphSource: null, graphPair: '' }; // Exit if no symbol provided

        const exchanges = [
            { name: 'BINANCE', url: (symbol: string) => `https://api.binance.com/api/v3/exchangeInfo?symbol=${symbol}USDT` },
            { name: 'OKX', url: (symbol: string) => `https://www.okx.com/api/v5/market/ticker?instId=${symbol}-USDT` },
            { name: 'BYBIT', url: (symbol: string) => `https://api.bybit.com/v5/market/instruments-info?category=spot&symbol=${symbol}USDT` },
            { name: 'BITGET', url: (symbol: string) => `https://api.bitget.com/api/v2/spot/public/symbols?symbol=${symbol}USDT` },
            { name: 'BITMART', url: (symbol: string) => `https://api-cloud.bitmart.com/spot/quotation/v3/ticker?symbol=${symbol}_USDT` },
            { name: 'COINBASE', url: (symbol: string) => `https://api.coinbase.com/api/v3/brokerage/market/products/?product_ids=${symbol}-USDT` },
            { name: 'MEXC', url: (symbol: string) => `https://api.mexc.com/api/v3/exchangeInfo?symbol=${symbol}USDT` },
            { name: 'GATEIO', url: (symbol: string) => `https://api.gateio.ws/api/v4/spot/currency_pairs/${symbol}_USDT` }
        ];
        const usdtExchanges = [
            { name: 'BINANCE', url: (symbol: string) => `https://api.binance.com/api/v3/exchangeInfo?symbol=${symbol}USD` },
            { name: 'OKX', url: (symbol: string) => `https://www.okx.com/api/v5/market/ticker?instId=${symbol}-USD` },
            { name: 'BYBIT', url: (symbol: string) => `https://api.bybit.com/v5/market/instruments-info?category=spot&symbol=${symbol}USD` },
            { name: 'BITGET', url: (symbol: string) => `https://api.bitget.com/api/v2/spot/public/symbols?symbol=${symbol}USD` },
            { name: 'BITMART', url: (symbol: string) => `https://api-cloud.bitmart.com/spot/quotation/v3/ticker?symbol=${symbol}_USD` },
            { name: 'COINBASE', url: (symbol: string) => `https://api.coinbase.com/api/v3/brokerage/market/products/?product_ids=${symbol}-USD` },
            { name: 'MEXC', url: (symbol: string) => `https://api.mexc.com/api/v3/exchangeInfo?symbol=${symbol}USD` },
            { name: 'GATEIO', url: (symbol: string) => `https://api.gateio.ws/api/v4/spot/currency_pairs/${symbol}_USD` }

        ];

        const symbolUpper = symbol.toUpperCase();
        const graphPair = symbolUpper == 'USDT' ? `${symbolUpper}USD` : `${symbolUpper}USDT`;

        // Helper function to find the exchange source
        const getExchangeSource = async (symbol: string) => {
            const exchangesSource = symbol?.toUpperCase() == 'USDT' ? usdtExchanges : exchanges;
            for (const exchange of exchangesSource) {
                try {
                    const response = await axios.get(exchange.url(symbol));

                    // Simplified exchange response validation
                    if (isValidExchangeResponse(exchange, response)) {
                        return exchange.name;
                    }
                } catch (error: any) {
                    console.error(`Error fetching from ${exchange.name}:`, error.message);
                }
            }
            return null; // No exchange source found
        };

        // Function to validate the response based on exchange name
        const isValidExchangeResponse = (exchange: { name: string }, response: any) => {
            switch (exchange.name) {
                case 'BINANCE':
                    return response.data?.code === undefined;
                case 'OKX':
                    return response.data?.code === "0";
                case 'BYBIT':
                    return response.data?.result?.list?.length > 0;
                case 'BITGET':
                    return response.data.code === '00000' && response.data.data?.length > 0;
                case 'BITMART':
                    return response?.data?.code === 1000 && response?.data?.data !== undefined;
                case 'COINBASE':
                    return response?.data?.products?.length > 0;
                case 'MEXC':
                    return response?.data?.symbols?.length > 0;
                case 'GATEIO':
                    return response?.data?.label === undefined;
                default:
                    return false;
            }
        };

        const graphSource = await getExchangeSource(symbolUpper);
        console.log('graphSource symbol', graphSource);
        return {
            status: graphSource !== null,
            graphSource: graphSource,
            graphPair: graphPair
        };
    }

    public getNftData = async (method: string, url: string, header: Object) => {
        let config_data: any = {
            method: method,
            url: url,
            headers: header
        }
        return new Promise(async function (resolve, reject) {
            return await axios(config_data)
                .then(function (response) {
                    resolve(response?.data);
                })
                .catch(function (error) {
                    console.log('🔥 ~ getNftData axios catch error', error.message);
                    resolve(null);
                });
        })
    }

    public checkNftTokenUri = async (url: string) => {
        return new Promise(async (resolve, reject) => {
            let config_data: any = {
                method: 'get',
                url: url,
                timeout: 20000
            }
            return await axios(config_data)
                .then(function (response) {
                    resolve(response?.data);
                })
                .catch(function (error) {
                    console.log('🔥 ~ checkNftTokenUri catch error', error.message);
                    resolve(null);
                });
        });
    }
    public checkNftImage = async (url: string) => {
        return new Promise(async (resolve, reject) => {
            let imgExtension: any = '';
            let extension = url?.substring(url?.lastIndexOf('.') + 1);
            imgExtension = await this.checkExtension(extension);
            if (imgExtension !== 'text' && imgExtension !== 'undefined' && imgExtension !== undefined) {
                resolve({ status: true, imgExtension: imgExtension, text_data: '' });
            }

            await axios.get(url, { timeout: 20000 })
                .then(async data => {
                    if (data?.status == 200 && data?.statusText?.toUpperCase() == 'OK') {
                        let image_content_type = data.headers['content-type'];
                        imgExtension = await this.checkExtension(image_content_type);
                        let text_data: any = '';
                        if (imgExtension == "text") {
                            text_data = await data.data;
                        }
                        resolve({ status: true, imgExtension: imgExtension, text_data: text_data });
                    } else {
                        resolve({ status: false, imgExtension: '', text_data: '' });
                    }
                })
                .catch(error => {
                    console.log('💥 ~ ~ Request timed out', error);
                    resolve({ status: false, imgExtension: '', text_data: '' });
                });
        });
    }

    public getIpfsImage = async (url: string) => {
        let ipfs_image = '';
        const splitData = url.split("ipfs://");
        if (splitData?.length > 0 && splitData[1]) {
            let newSplitData = splitData[1].split("ipfs/");
            let ips_data = '';
            if (newSplitData?.length > 0 && newSplitData[1]) {
                ips_data = newSplitData[1]
            } else {
                ips_data = splitData[1];
            }
            let check_ips_data = ips_data.split("lootpunksimage");
            if (check_ips_data?.length > 0) {
                ips_data = check_ips_data[0];
            }
            ipfs_image = ips_data ? `https://gateway.ipfs.io/ipfs/${ips_data}` : "";
        } else {
            let newSplitData = splitData[0].split("ipfs/");
            let ips_data = '';
            if (newSplitData?.length > 0 && newSplitData[1]) {
                ips_data = newSplitData[1];
                let check_ips_data = ips_data.split("lootpunksimage");
                if (check_ips_data?.length > 0) {
                    ips_data = check_ips_data[0];
                }
                ipfs_image = ips_data ? `https://gateway.ipfs.io/ipfs/${ips_data}` : '';
            } else {
                ipfs_image = splitData[0];
            }
        }
        return ipfs_image;
    }

    public checkExtension = async (blob: any) => {
        if (blob) {
            if (blob.includes("svg")) {
                return "svg";
            } else if (
                blob.includes("png") ||
                blob.includes("jpg") ||
                blob.includes("jpeg") ||
                blob.includes("gif") ||
                blob.includes("webp") ||
                blob.includes("image")
            ) {
                return "image";
            } else if (
                blob.includes("mp4") ||
                blob.includes("mov") ||
                blob.includes("wmv") ||
                blob.includes("wav") ||
                blob.includes("avi") ||
                blob.includes("avchd") ||
                blob.includes("mkv") ||
                blob.includes("webm") ||
                blob.includes("mpeg") ||
                blob.includes("ogg") ||
                blob.includes("video")
            ) {
                return "video";
            } else if (blob.includes("mp3") || blob.includes("audio")) {
                return "audio";
            } else if (blob.includes("json") || blob.includes("txt")) {
                return "text";
            } else {
                return "undefined";
            }
        }
    };
}
export const globalHelper = new GlobalHelper();
