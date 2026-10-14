import { TronWeb } from 'tronweb';
import TronStation from "tronstation";
import { ethers } from "ethers";
import { config } from "../../config";
import { GlblBooleanEnum } from '../../constants/global_enum';
import { CoinInterface, TrnxBandwidthModel } from '../../models';
import { bigNumberSafeMath, exponentialToDecimal } from './globalFunctions';
import commonHelper from './common.helpers';
import { TokenData } from '../../interfaces/global.interface';
import { language } from "../../constants";
import axios from 'axios';


class TrxHelper {

    public TRX_FULLNODE: string = config.NODE.TRX_RPC_URL
    public TRX_FULLNODE_KEY: string = config.NODE.TRX_API_KEY
    public tronWeb: any;

    constructor() {
        this.tronWeb = new TronWeb({
            fullHost: this.TRX_FULLNODE,
            headers: { apikey: config.NODE.TRX_API_KEY }
        });
    }

    public async searchToken(trc20ContractAddress: string, lang: string) {
        try {
            await this.tronWeb.setAddress(trc20ContractAddress);
            let contract: any = await this.tronWeb.contract(config.TRON_ABI, trc20ContractAddress);
            let coin_name: string = await contract.name().call();
            let coin_symbol: string = await contract.symbol().call();
            let decimals: number = await contract.decimals().call();
            let data: TokenData = { decimals: Number(decimals.toString()), name: coin_name, symbol: coin_symbol };
            let dex: any = decimals.toString()
            if (dex.hex != undefined) {
                dex = await this.tronWeb.toDecimal(dex.hex);
                data.decimals = Number(dex);
            }
            if (!data) throw language[lang].TRON_TOKEN_SEARCH;
            return data;
        } catch (err: any) {
            console.error("searchToken_trx", err);
            await commonHelper.save_error_logs("searchToken_trx", err.message);
            throw language[lang].TRON_TOKEN_SEARCH;
        }
    }
    public async validate_trx_address(address: string) {
        try {
            return await this.tronWeb.isAddress(address);
        } catch (err: any) {
            console.error(`Tron_Helper Validate_Address error >>`, err);
            await commonHelper.save_error_logs("validate_trx_address", err.message);
            return false;
        }
    }
    public async TRC20_Token_Balance(address: string, contract_address: string | null | undefined, is_string: boolean) {
        console.log('address >>.', address);
        console.log('contract_address >>.', contract_address);
        try {
            await this.tronWeb.setAddress(contract_address);
            let contract: any = await this.tronWeb.contract(config.TRON_ABI, contract_address);

            // tronweb 6 returns uint values as bigint (tronweb 4 returned numbers and BigNumber objects)
            let decimals: number = Number((await contract.decimals().call()).toString());

            let balanceOf: any = await contract.balanceOf(address).call();
            let toDecimal: any;
            if (typeof balanceOf === 'bigint') {
                toDecimal = balanceOf.toString();
            } else if (balanceOf._hex != undefined) {
                toDecimal = await this.tronWeb.toDecimal(balanceOf._hex);
            } else {
                toDecimal = await this.tronWeb.toDecimal(balanceOf.balance._hex);
            }
            let expToDecimal: string = exponentialToDecimal(toDecimal);
            let balance = bigNumberSafeMath(expToDecimal, '/', Math.pow(10, decimals))
            balance = is_string ? balance : Number(balance);
            return balance;
        } catch (err: any) {
            console.error(`Tron_Helper TRC20_Token_Balance error >>`, err);
            await commonHelper.save_error_logs("TRC20_Token_Balance", err.message);
            throw err;
        }
    }
    public async Fetch_Balance(address: string, coin: CoinInterface, isString: boolean) {
        try {
            let balance: number | any = 0;
            if (coin.is_token == GlblBooleanEnum.true) {
                balance = await this.TRC20_Token_Balance(address, coin.token_address, isString)
            } else { 
                balance = await this.Coin_Fetch_Balance(address);
            }
            return balance;
        } catch (err: any) {
            console.error(`Error in Fetch_Balance of tron. `, err);
            await commonHelper.save_error_logs("Fetch_Balance_trx", err.message);
            return null;
        }
    }
    public async Coin_Fetch_Balance(address: string) {
        try {
            return await this.tronWeb.trx.getBalance(address).then(async (result: any) => {
                return await this.tronWeb.fromSun(result);
            });
        } catch (err: any) {
            console.error(`Tron_Helper TRX_Fetch_Balance error >>`, err);
            await commonHelper.save_error_logs("Coin_Fetch_Balance", err.message);
            throw err;
        }
    }

    public async getEstimationGas(data: { fromAddress: string, toAddress: string, amount: number, is_bridge: number, coinData: any }) {
        try {
            const { fromAddress, toAddress, amount, is_bridge, coinData } = data;
            const adjustedAmount = Number(amount) * coinData.decimals;

            const resData = await TrnxBandwidthModel.findOne({
                where: { id: 1 },
                raw: true,
            });

            // If bandwidth data is not found, return an appropriate error
            if (!resData) {
                return {
                    status: false,
                    data: {},
                    message: "Bandwidth data not found.",
                };
            }

            // Get the gas estimation for the transaction from the Tron Web API
            const feeData = await trxHelper.Estimation_Gas_Tron(
                toAddress,
                fromAddress,
                resData,
                coinData,
                adjustedAmount,
                is_bridge // Use the provided bridge flag
            );

            console.log("Fee Data:", feeData);

            // Return the success response with the fee data
            return {
                status: true,
                data: feeData,
                message: "Tron fee fetched successfully.",
            };

        } catch (error) {
            // Log the error and return a structured error response
            console.error("Error in getEstimationGas:", error);
            return {
                status: false,
                data: {},
                message: "Something went wrong while fetching Tron fee.",
            };
        }
    }


    private Estimation_Gas_Tron = async (
        toAddress: string,
        fromAddress: string,
        resData: any,
        coininfo: any,
        amount: any,
        isBridge: number
    ) => {
        let energy = 0;
        try {
            console.log('coininfo >>>', coininfo);
            let tronFee: any = {};
            let delegateAmountForSwap: any = {};
            let result: any = await trxHelper.fetchAccountInfo(fromAddress, toAddress);
            console.log("result  tron gasEstimation:>> ", result);

            let getAccount = result[0];
            let getFromAddressAccount = result[1];
            let findUserAccountDetails = result[2];
            let freeBandwidth = (findUserAccountDetails?.freeNetLimit || 0) - (findUserAccountDetails?.freeNetUsed || 0);
            let getUserBandwidth = (findUserAccountDetails?.NetLimit || 0) - (findUserAccountDetails?.NetUsed || 0);
            let requiredBandwidthForTrx = 0;

            // Handling TRC10 token type
            if (coininfo.token_type == "TRC10") {
                requiredBandwidthForTrx = resData.tron_trc10_bandwidth;

                if (getAccount) {
                    let requiredBandwidth = getUserBandwidth - resData.tron_trc10_bandwidth;
                    if (requiredBandwidth >= 0) {
                        tronFee = { is_activate: 0, trx: 0, bandwidth: resData.tron_trc10_bandwidth };
                    } else {
                        let trxAmount = await trxHelper.convertBandwidthIntoTRX(Math.abs(requiredBandwidth));
                        tronFee = { is_activate: 0, trx: trxAmount, bandwidth: getUserBandwidth };
                    }
                } else {
                    let fee = getUserBandwidth - resData.tron_trc10_bandwidth;
                    if (fee >= 0) {
                        tronFee = { is_activate: 1, trx: 0.1, bandwidth: resData.tron_trc10_bandwidth };
                    } else {
                        tronFee = { is_activate: 1, trx: 0.1, bandwidth: getUserBandwidth };
                    }
                }

                // Handling TRC20 token type
            } else if (coininfo.token_type == "TRC20" && coininfo.token_address) {
                requiredBandwidthForTrx = resData.tron_trc20_bandwidth;

                let requiredBandwidth = getUserBandwidth - requiredBandwidthForTrx;
                let calculateEnergy: any = await trxHelper.calculateEnergy(fromAddress, toAddress, coininfo.token_address, amount);
                console.log("calculateEnergy :>> ", calculateEnergy);

                let requiredEnergy = calculateEnergy[0];
                let tokenBalance = calculateEnergy[1];
                energy = calculateEnergy[2];

                if (requiredEnergy > 0) {
                    console.log("tokenBalance :>> ", tokenBalance);
                    if (isBridge == 1 || tokenBalance == 0) {
                        requiredEnergy *= 2.2;
                    } else {
                        requiredEnergy = Math.floor(Number(requiredEnergy) * 1.2);
                    }
                }

                console.log("requiredEnergy ::>> ", requiredEnergy);

                let remainEnergy = energy - requiredEnergy;

                // Handling edge case when no energy is available
                if (requiredEnergy == 0) {
                    remainEnergy = -35500;
                    remainEnergy *= 2.2;
                    requiredEnergy = Math.abs(remainEnergy);
                }

                if (remainEnergy < 0) {
                    let convertEnergyIntoTrx = await trxHelper.convertEnergyIntoTrx(Math.abs(remainEnergy));
                    if (convertEnergyIntoTrx) {
                        tronFee = {
                            trx: convertEnergyIntoTrx,
                            is_activate: 0,
                            bandwidth: resData.tron_trc20_bandwidth,
                            energy: Math.abs(remainEnergy),
                        };
                    }
                } else {
                    if (freeBandwidth > requiredBandwidthForTrx || getUserBandwidth > requiredBandwidthForTrx) {
                        tronFee = { trx: 0, is_activate: 0, bandwidth: 0, energy: 0 };
                    } else {
                        let trxAmount = await trxHelper.convertBandwidthIntoTRX(Math.abs(requiredBandwidth));
                        tronFee = { trx: trxAmount, is_activate: 0, bandwidth: resData.tron_trc20_bandwidth, energy: 0 };
                    }
                }

                // Setting fee limit based on balance
                let trxBalance = result[3];
                tronFee.fee_limit = trxBalance >= 150 ? 150 : trxBalance >= 100 ? 100 : trxBalance >= 50 || requiredEnergy > 50000 ? 50 : trxBalance >= 40 ? 40 : 30;
                tronFee.fee_limit = Math.floor(tronFee.fee_limit);

                // Handling other token types
            } else {
                requiredBandwidthForTrx = resData.tron_bandwidth;
                console.log("requiredBandwidthForTrx::", requiredBandwidthForTrx);

                if (getAccount) {
                    if (freeBandwidth > requiredBandwidthForTrx || getUserBandwidth > requiredBandwidthForTrx) {
                        tronFee = { is_activate: 0, trx: 0, bandwidth: requiredBandwidthForTrx };
                    } else {
                        let trxAmount = await trxHelper.convertBandwidthIntoTRX(Math.abs(requiredBandwidthForTrx));
                        console.log("trxAmount::", trxAmount);
                        tronFee = { is_activate: 0, trx: trxAmount, bandwidth: resData.tron_bandwidth };
                    }
                } else {
                    tronFee = { is_activate: 1, trx: 0.1, bandwidth: resData.tron_bandwidth };
                }
            }

            // Delegate Amount Calculation
            tronFee.is_delegate = false;
            if (Object.keys(delegateAmountForSwap).length && delegateAmountForSwap.max_bandwidth > requiredBandwidthForTrx) {
                requiredBandwidthForTrx = delegateAmountForSwap.max_bandwidth;
                tronFee.bandwidth = delegateAmountForSwap.max_bandwidth;
            } else {
                requiredBandwidthForTrx = tronFee.bandwidth;
            }

            if (Object.keys(delegateAmountForSwap).length && delegateAmountForSwap.max_energy) {
                tronFee.energy = delegateAmountForSwap.max_energy;
            }

            if (tronFee.energy && getFromAddressAccount) {
                if (energy < tronFee.energy) {
                    let requiredDelegateEnergy = 0;
                    if (Object.keys(delegateAmountForSwap).length == 0) {
                        requiredDelegateEnergy = tronFee.energy - energy;
                        tronFee.trx = await trxHelper.convertEnergyIntoTrx(Math.abs(requiredDelegateEnergy));
                    } else {
                        requiredDelegateEnergy = delegateAmountForSwap.max_energy - energy;
                        tronFee.trx = await trxHelper.convertEnergyIntoTrx(Math.abs(requiredDelegateEnergy));
                    }
                }
            }

            console.log("tronFee :>> ", tronFee);
            return tronFee;
        } catch (error: any) {
            console.error("Error in Estimation_Gas_Tron:", error);
            return { success: false, error: error.message };
        }
    }

    private async fetchAccountInfo(fromAddress: string, toAddress: string) {
        try {
            let result = await Promise.all([
                this.getActiveAccountInfo(toAddress),
                this.getActiveAccountInfo(fromAddress),
                this.getAccountResources(fromAddress),
                this.Coin_Fetch_Balance(fromAddress),
            ])
                .then((values) => {
                    console.log(values);
                    return values;
                })
                .catch((error) => {
                    console.error("At least one promise was rejected:", error);
                    return false;
                });
            return result;
        } catch (error) {
            console.log("::Error log:: fetchAccountInfo :>> ", error);
            return false;
        }
    }

    private async getActiveAccountInfo(address: string): Promise<boolean> {
        try {
            if (!address) {
                console.log("getActiveAccountInfo Toaddress is empty.", address);
                return false;
            }
            let getAccount = await this.tronWeb.trx.getAccount(address);
            if (getAccount && Object.keys(getAccount).length === 0) {
                console.log("new account :>> ");
                return false;
            } else {
                return true;
            }
        } catch (error) {
            return false
        }
    }

    private async getAccountResources(address: string) {
        try {
            let getAccountResources = await this.tronWeb.trx.getAccountResources(
                address
            );

            return getAccountResources;
        } catch (error) {

        }
    }

    private async convertEnergyIntoTrx(energy: number) {
        try {
            console.log("energy convertEnergyIntoTrx :>> ", energy);
            const tronStationSDK = new TronStation(this.tronWeb);
            let tronFee = await tronStationSDK.energy.burnedEnergy2Trx(energy);

            console.log("tronFee convertEnergyIntoTrx:>> ", tronFee);

            tronFee = Number(tronFee.toFixed(4));

            return tronFee;
        } catch (error) {
            console.log("::Error log:: getTransactionRequiredEnergy :>> ", error);
            return 0;
        }
    }


    private async convertBandwidthIntoTRX(bandwidth: number) {
        try {
            const sunAmount = bandwidth * 1000;
            let amount = await this.tronWeb.fromSun(sunAmount);

            console.log("convertBandwidthIntoTRX amount:>> ", amount);

            return amount;
        } catch (error) {
            console.log("::Error log:: convertBandwidthIntoTRX :>> ", error);
            return 1;
        }
    }

    private async calculateEnergy(
        fromAddress: string,
        toAddress: string,
        tokenAddress: string,
        amount: number
    ) {
        try {
            let result = await Promise.all([
                this.fetchUseEnergy(fromAddress, tokenAddress, amount),
                this.TRC20_Token_Balance(toAddress, tokenAddress, false),
                this.getUserEnergy(fromAddress),
            ])
                .then((values) => {
                    return values;
                })
                .catch((error) => {
                    console.error(
                        "At least one promise was rejected: calculateEnergy",
                        error
                    );
                    return false;
                });
            return result;
        } catch (error) {
            console.log("::Error log:: calculateEnergy :>> ", error);
            return false;
        }
    }

    private async getUserEnergy(address: string): Promise<number> {
        try {
            let getAccountResources = await this.tronWeb.trx.getAccountResources(
                address
            );
            let EnergyBalance =
                (getAccountResources.EnergyLimit || 0) -
                (getAccountResources.EnergyUsed || 0);
            console.log("EnergyBalance :>> ", EnergyBalance);
            if (!EnergyBalance) {
                return 0;
            }
            return EnergyBalance;
        } catch (error) {
            console.error("::Error log:: getUserEnergy:", error);
            return 0;
        }
    }

    private async fetchUseEnergy(
        fromAddress: string,
        tokenAddress: string,
        amount: number
    ) {
        try {
            let requiredEnergy = 0;
            let hexAddress = await this.addressConversion(tokenAddress);
            let inputs = [
                {
                    type: "address",
                    value: hexAddress,
                },
                { type: "uint256", value: Math.floor(amount) },
            ];
            let parameters = await this.encodeParams(inputs);

            if (parameters) {
                requiredEnergy = await trxHelper.getTransactionRequiredEnergy(
                    fromAddress,
                    tokenAddress,
                    parameters
                );
            }
            return requiredEnergy;
        } catch (error) {
            return 0;
        }
    }

    private async addressConversion(token_address: string) {
        try {
            console.log("token_address :>> ", token_address);
            let tronAddress = await this.tronWeb.address.toHex(token_address);

            console.log("addressConversion tronAddress:>> ", tronAddress);

            return tronAddress;
        } catch (error) {
            console.log("::Error log:: addressConversion :>> ", error);
            return false;
        }
    }

    private async getTransactionRequiredEnergy(
        from_address: string,
        token_address: string,
        parameters: string
    ) {
        try {
            var data = JSON.stringify({
                owner_address: from_address,
                contract_address: token_address,
                function_selector: "transfer(address,uint256)",
                parameter: parameters,
                visible: true,
            });

            var configObj: any = {
                method: "post",
                maxBodyLength: Infinity,
                url: this.TRX_FULLNODE + "/wallet/estimateenergy",
                headers: {
                    "Content-Type": "application/json",
                    apikey: this.TRX_FULLNODE_KEY,
                },
                data: data,
            };

            let energy = await axios(configObj)
                .then(function (response: any) {
                    console.log(
                        "getTransactionRequiredEnergy :",
                        JSON.stringify(response.data)
                    );
                    if (response.data?.energy_required) {
                        return response.data.energy_required;
                    } else {
                        return 0;
                    }
                })
                .catch(function (error: Error) {
                    console.log("::Error log:: getTransactionRequiredEnergy :", error);
                    return 0;
                });

            return energy;
        } catch (error) {
            console.log("::Error log:: getTransactionRequiredEnergy :>> ", error);
            return false;
        }
    }

    private async encodeParams(inputs: any) {
        console.log("encodeParams inputs :", inputs);
        const AbiCoder = ethers.AbiCoder;
        const ADDRESS_PREFIX_REGEX = /^(41)/;
        try {
            let typesValues = inputs;
            let parameters = "";

            if (typesValues.length == 0) return parameters;
            const abiCoder = new AbiCoder();
            let types = [];
            const values = [];

            for (let i = 0; i < typesValues.length; i++) {
                let { type, value } = typesValues[i];
                if (type == "address")
                    value = value.replace(ADDRESS_PREFIX_REGEX, "0x");
                types.push(type);
                values.push(value);
            }

            console.log(types, values);
            try {
                parameters = abiCoder.encode(types, values).replace(/^(0x)/, "");
            } catch (ex) {
                console.log(ex);
                return false;
            }
            return parameters;
        } catch (error) {
            console.log("::Error log:: encodeParams :>> ", error);
            return false;
        }
    }

}

export const trxHelper = new TrxHelper();
