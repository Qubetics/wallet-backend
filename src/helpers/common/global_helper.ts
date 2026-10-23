import axios from "axios";
import { config } from "../../config";
import { ethEther } from "./ether_eth_helpers";
import { GlblCoins, GlblMessages, TradingSourceResponse } from "../../constants/global_enum";
import { utxobtc } from "./btc_helpers";
import { trxHelper } from "./trx_helper";
import { CoinInterface } from "../../models";
import { AbiItem } from "../../interfaces/ether.interface";
import { exponentialToDecimal } from "./globalFunctions";
import commonHelper from "./common.helpers";
import { bscEther } from "./ether_bsc_helpers";
import { polEther } from "./ether_pol_helpers";
import { SolanaHelper } from "./solana.helper";
import cmcHelper from "./cmc.helpers";
import { ticsEther } from "./ether_tics_helpers";
import { initializeApp, cert } from 'firebase-admin/app';
import { getMessaging, Messaging } from 'firebase-admin/messaging';


class Global_helper {
    public messaging: Messaging | undefined;
    constructor() {
        (async () => {
            initializeApp({
                credential: cert(config.FIREBASE_SERVICE_ACCOUNT),
            });
            this.messaging = getMessaging();
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

    public async return_decimals_name_symbol(coin_family: number, token_address: string, lang: string) {
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
            console.error("Error in return_decimals_name_symbol>>", err)
            await commonHelper.save_error_logs("return_decimals_name_symbol", err.message);
            return (null)
        }
    }

    public async validate_address(walletAddress: string, coinFamily: number) {
        try {
            switch (coinFamily) {
                case config.STATIC_COIN_FAMILY.BNB:
                    return await bscEther.validate_bnb_address(walletAddress);
                case config.STATIC_COIN_FAMILY.ETH:
                    return await ethEther.validate_eth_address(walletAddress);
                case config.STATIC_COIN_FAMILY.BTC:
                    return await utxobtc.validate_btc_address(walletAddress);
                case config.STATIC_COIN_FAMILY.POL:
                    return await polEther.validate_pol_address(walletAddress);
                case config.STATIC_COIN_FAMILY.TICS:
                    return await ticsEther.validate_tics_address(walletAddress);
                case config.STATIC_COIN_FAMILY.TRX:
                    return await trxHelper.validate_trx_address(walletAddress)
                case config.STATIC_COIN_FAMILY.SOL:
                    return await SolanaHelper.validateSolAddress(walletAddress)
            }
        } catch (err: any) {
            console.error("Error in validate_address", err)
            await commonHelper.save_error_logs("validate_address", err.message);
            return false;
        }
    }

    public async get_new_token_balance(coinFamily: number, walletAddress: string, tokenAddress: string) {
        try {
            let tokenBalance: any;
            let userBalance: string | null | undefined = null;
            switch (coinFamily) {
                case config.STATIC_COIN_FAMILY.BNB:
                    tokenBalance = (await bscEther.get_bep20_token_balance(tokenAddress, config.CONTRACT_ABI as AbiItem[], walletAddress))?.toString();
                    userBalance = exponentialToDecimal(Number(tokenBalance))
                    break;
                case config.STATIC_COIN_FAMILY.ETH:
                    tokenBalance = (await ethEther.get_erc20_token_balance(tokenAddress, config.CONTRACT_ABI as AbiItem[], walletAddress))?.toString();
                    userBalance = exponentialToDecimal(Number(tokenBalance))
                    break;
                case config.STATIC_COIN_FAMILY.POL:
                    tokenBalance = (await polEther.get_erc20_token_balance(tokenAddress, config.CONTRACT_ABI as AbiItem[], walletAddress))?.toString();
                    userBalance = exponentialToDecimal(Number(tokenBalance))
                    break;
                case config.STATIC_COIN_FAMILY.TICS:
                    tokenBalance = (await ticsEther.get_erc20_token_balance(tokenAddress, config.CONTRACT_ABI as AbiItem[], walletAddress))?.toString();
                    userBalance = exponentialToDecimal(Number(tokenBalance))
                    break;
                case config.STATIC_COIN_FAMILY.TRX:
                    userBalance = (await trxHelper.TRC20_Token_Balance(walletAddress, tokenAddress, false))?.toString()
                    break;
                case config.STATIC_COIN_FAMILY.SOL:
                    userBalance = (await SolanaHelper.getUserCRC20TokenBalance(tokenAddress, walletAddress, false))?.toString()
                    break;
                default:
                    throw GlblMessages.INVALID_COIN_FAMILY
            }
            return userBalance ? { status: true, balance: userBalance } : { status: false, balance: 0 };
        } catch (err: any) {
            console.error("Error in get_new_token_balance.", err)
            await commonHelper.save_error_logs("get_new_token_balance", err.message);
            return { status: false, balance: '0' };
        }
    }

    public async find_plateform(coin_family: number) {
        try {
            const coingecko_platforms_ids = [
                {
                    id: "ethereum",
                    name: "ethereum",
                    shortname: "ETH",
                    coin_family: config.STATIC_COIN_FAMILY.ETH,
                    symbol: GlblCoins.ETH
                },
                {
                    id: "bitcoin",
                    name: "bitcoin",
                    shortname: "BTC",
                    coin_family: config.STATIC_COIN_FAMILY.BTC,
                    symbol: GlblCoins.BTC
                },
                {
                    id: "TRON",
                    name: "TRON",
                    shortname: "TRON",
                    coin_family: config.STATIC_COIN_FAMILY.TRX,
                    symbol: GlblCoins.TRX
                },
                {
                    id: "binance",
                    name: "BNB",
                    shortname: "BNB",
                    coin_family: config.STATIC_COIN_FAMILY.BNB,
                    symbol: GlblCoins.BNB
                },
                {
                    id: "polygon",
                    name: "POL",
                    shortname: "POL",
                    coin_family: config.STATIC_COIN_FAMILY.POL,
                    symbol: GlblCoins.POL
                },
            ];
            const platform_id: any = await coingecko_platforms_ids.find((pd) => pd.coin_family == coin_family);
            return platform_id;
        } catch (err: any) {
            console.error("Error in findPlateForm helper", err)
            await commonHelper.save_error_logs("find_plateform", err.message);
            return null;
        }
    }

    public async UpdateCmcImgUrl(image_url: string) {
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
            console.error(`UpdateCmcImgUrl error>>> `, err)
            return null;
        }
    }

    public async get_wallet_balance(coinData: CoinInterface, wallet_address: string) {
        try {
            let balance: string | any = '0';
            switch (coinData.coin_family) {
                case config.STATIC_COIN_FAMILY.BNB:
                    balance = (await bscEther.get_balance(coinData, wallet_address))?.toString()
                    break;
                case config.STATIC_COIN_FAMILY.ETH:
                    balance = (await ethEther.get_balance(coinData, wallet_address))?.toString()
                    break;
                case config.STATIC_COIN_FAMILY.BTC:
                    balance = (await utxobtc.get_balance(wallet_address))?.toString()
                    break;
                case config.STATIC_COIN_FAMILY.POL:
                    balance = (await polEther.get_balance(coinData, wallet_address))?.toString()
                    break;
                case config.STATIC_COIN_FAMILY.TICS:
                    balance = (await ticsEther.get_balance(coinData, wallet_address))?.toString()
                    break;
                case config.STATIC_COIN_FAMILY.TRX:
                    balance = (await trxHelper.Fetch_Balance(wallet_address, coinData, false))?.toString()
                    break;
                case config.STATIC_COIN_FAMILY.SOL:
                    balance = (await SolanaHelper.Fetch_Balance(wallet_address, coinData, false))?.toString()
                    break;
            }
            if (balance == null) return { status: false, balance: '0' };
            else return { status: true, balance: balance };
        } catch (err: any) {
            console.error("Error in get_wallet_balance.", err)
            await commonHelper.save_error_logs("get_wallet_balance", err.message);
            return { status: false, balance: '0' };
        }
    }

    public async getWalletBalance(coinData: CoinInterface, wallet_address: string) {
        try {
            let balance: string | any = '0';
            switch (coinData.coin_family) {
                case config.STATIC_COIN_FAMILY.BNB:
                    balance = (await bscEther.getBalance(coinData, wallet_address))?.toString()
                    break;
                case config.STATIC_COIN_FAMILY.ETH:
                    balance = (await ethEther.getBalance(coinData, wallet_address))?.toString()
                    break;
                case config.STATIC_COIN_FAMILY.BTC:
                    balance = (await utxobtc.get_balance(wallet_address))?.toString()
                    break;
                case config.STATIC_COIN_FAMILY.POL:
                    balance = (await polEther.getBalance(coinData, wallet_address))?.toString()
                    break;
                case config.STATIC_COIN_FAMILY.TICS:
                    balance = (await ticsEther.getBalance(coinData, wallet_address))?.toString()
                    break;
                case config.STATIC_COIN_FAMILY.TRX:
                    balance = (await trxHelper.Fetch_Balance(wallet_address, coinData, true))?.toString()
                    break;
                case config.STATIC_COIN_FAMILY.SOL:
                    balance = (await SolanaHelper.Fetch_Balance(wallet_address, coinData, true))?.toString()
                    break;
            }
            return { status: true, balance: balance };
        } catch (err: any) {
            console.error("Error in get_wallet_balance.", err)
            await commonHelper.save_error_logs("get_wallet_balance", err.message);
            return { status: false, balance: '0' };
        }
    }

    public async fetch_data(method: string, url: string, header: Object) {
        try {
            let config_data: any = {
                method: method,
                url: url,
                headers: header
            }
            let return_data: any;
            await axios(config_data)
                .then(function (response) {
                    return_data = response?.data;
                    return response?.data;
                })
                .catch(function (err: any) {
                    console.error('axios catch error', err.message);
                    return_data = null;
                    return null;
                });
            return return_data;
        } catch (err: any) {
            console.error('🔥 ~ ~ fetch_data error', err);
            return null;
        }
    }


    //TODO : get  from config
    public STATIC_COIN_FAMILY_SYMBOL = {
        1: "BNB",
        2: "ETH",
        3: "BTC",
        4: "POL",
        5: "SOL",
        6: "TRX",
        7: "TICS"
    }

    public STATIC_COIN_FAMILY_NAME = {
        1: ["BNB"],
        2: ["Ethereum"],
        3: ["BTC"],
        4: ["POL (prev. MATIC)", "Polygon", "MATIC"],
        5: ["Solana"],
        6: ["TRON", "Tron"],
        7: ["TICS"]
    }

    public async getTokenImageFromCmcBySymbol(data: any) {
        try {
            const tokenAddress = data.tokenAddress;
            const coinFamily = data.coinFamily as keyof typeof this.STATIC_COIN_FAMILY_SYMBOL;
            const PlatformName = this.STATIC_COIN_FAMILY_NAME[coinFamily];

            if (PlatformName == null) {
                return { image: null, id: null };
            }

            let params: any = `info?symbol=${data.symbol}`;

            let result: any = await cmcHelper.cmcApi(params);
            let id: any = null;
            let imageUrl: any = null;

            if (result.data && result.data.data) {
                let image: any;
                const symbolKey = Object.keys(result.data.data)[0];

                if (symbolKey) {
                    // Get all tokens with this symbol
                    const tokens = result.data.data[symbolKey];

                    // Find the token that matches both symbol and token address
                    for (const token of tokens) {

                        if (token.contract_address) {
                            // Check each contract address entry
                            for (const contract of token.contract_address) {

                                if (contract?.platform &&
                                    contract?.platform?.coin &&
                                    PlatformName.includes(contract?.platform?.coin?.name) &&
                                    contract?.contract_address?.toLowerCase() == tokenAddress.toLowerCase()) {
                                    id = token.id;
                                    image = token.logo;
                                    break;
                                }
                            }
                            if (id) break; // Break outer loop if match found
                        }
                    }

                    if (image) {
                        imageUrl = await this.UpdateCmcImgUrl(image);
                    }
                }
            }

            return { image: imageUrl, id: id };
        } catch (err: any) {
            console.error("Error in getTokenImageFromCmcBySymbol", err);
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

    public get_nft_data = async (method: string, url: string, header: Object) => {
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
                    console.log('🔥 ~ get_nft_data axios catch error', error.message);
                    resolve(null);
                });
        })
    }

    public check_nft_token_uri = async (url: string) => {
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
                    console.log('🔥 ~ check_nft_token_uri catch error', error.message);
                    resolve(null);
                });
        });
    }
    public check_nft_image = async (url: string, coin_family: number) => {
        return new Promise(async (resolve, reject) => {
            let imgExtension: any = '';
            let extension = url?.substring(url?.lastIndexOf('.') + 1);
            imgExtension = await this.checkExtension(extension);
            if (imgExtension !== 'text' && imgExtension !== 'undefined' && imgExtension !== undefined && coin_family != 7) {
                console.log('imgExtension >>>>', imgExtension);
                resolve({ status: true, imgExtension: imgExtension, text_data: '', image: "" });
            }

            const headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36'
            };

            await axios.get(url, { timeout: 20000, headers })
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
                        console.log('imgExtension >>>>', imgExtension);
                        resolve({ status: false, imgExtension: '', text_data: '' });
                    }
                })
                .catch(error => {
                    console.log('💥 ~ ~ Request timed out', error?.message);
                    resolve({ status: false, imgExtension: '', text_data: '' });
                });
        });
    }

    public get_ipfs_image = async (url: string, coin_family: number) => {
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
            ipfs_image = ips_data ? coin_family != 7 ? `https://gateway.ipfs.io/ipfs/${ips_data}` : `https://gateway.lighthouse.storage/ipfs/${ips_data}` : "";
        } else {
            let newSplitData = splitData[0].split("ipfs/");
            let ips_data = '';
            if (newSplitData?.length > 0 && newSplitData[1]) {
                ips_data = newSplitData[1];
                let check_ips_data = ips_data.split("lootpunksimage");
                if (check_ips_data?.length > 0) {
                    ips_data = check_ips_data[0];
                }
                ipfs_image = ips_data ? coin_family != 7 ? `https://gateway.ipfs.io/ipfs/${ips_data}` : `https://gateway.lighthouse.storage/ipfs/${ips_data}` : '';
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
export const global_helper = new Global_helper();
