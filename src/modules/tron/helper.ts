import TronStation from "tronstation";
import * as Models from '../../models/model/index';
import { TokenStandard } from './enum';
import commonHelper from '../../helpers/common/common.helpers';
import { exponentialToDecimal } from '../../helpers/common/globalFunctions';
import { trxHelper } from '../../helpers/common/trx_helper';
import { config } from "../../config";

class TronHelper {
 
    Gas_Fee = async (
        toAddress: string,
        raw: string,
        contract_address: string
    ) => {
        let energy = 0;
        let fee = 0;
        try {
            const token: any = await Models.CoinsModel.findOne({
                where: {
                    token_address: contract_address
                }
            })

            if (!contract_address) {
                let data: any = raw.length * 10
                fee = data / 1000000;
            } else {
                let data: any = raw.length * 10
                fee = data / 1000000;
                let userHasBalance: number = 0;
                token.token_type?.toLowerCase();
                switch (token.token_type) {
                    case TokenStandard.TRC20:
                        userHasBalance = await this.TRC20_Token_Balance(
                            toAddress, //// wallet_address
                            contract_address /// contract_address
                        )
                        break;
                    case TokenStandard.TRC10:
                        userHasBalance = await this.TRC10_Token_Balance(
                            toAddress, //// wallet_address
                            contract_address /// contract_address
                        )
                        break;
                    default:
                        userHasBalance = 0
                        break;
                }
                if (userHasBalance > 0) {
                    energy = 15000;
                } else if (userHasBalance == 0) {
                    energy = 30000;
                }
            }
            let tronBurned = 0;
            if (energy > 0) {
                const tronStationSDK = new TronStation(trxHelper.tronWeb);
                tronBurned = await tronStationSDK.energy.burnedEnergy2Trx(energy);
            }
            return {
                fee: fee,
                energy: energy,
                energyToTron: tronBurned,
                total: fee + tronBurned,
            };
        } catch (err: any) {
            console.error(`Tron_Helper Gas_Fee error >>>`, err);
            await commonHelper.save_error_logs("tron_Gas_Fee", err.message);
            return {
                fee: 0,
                energy: 0,
                energyToTron: 0,
                total: 0,
            };
        }
    }
    BroadcastRawTx = async (
        trnx_raw: any,
        clbk: CallableFunction
    ) => {
        return await trxHelper.tronWeb.trx.sendRawTransaction(trnx_raw).then(async (result: any) => {
            if (result.result == true && result.result != undefined) {
                clbk(null, { result: true, data: result });
            } else {
                clbk(null, { result: false, data: result });
            }
        }).catch((error: Error) => {
            console.error('Tron_Helper-BroadcastRawTx >>> ', error);
            clbk(error, null);
        });
    }

    public getEstimationGas = async (data: { fromAddress: string, toAddress: string, amount: number, is_bridge: number, coinData: any }) => {
        try {
            console.log('getEstimationGas data >>', data);
            return trxHelper.getEstimationGas(data)
        } catch {
            return { status: false, data: {} }
        }

    }

    public async GetConfirmedTransaction(tx_hash: string) {
        try {
            const transaction: {
                status: boolean;
                data: { ret: [{ contractRet: string }] };
            } = await trxHelper.tronWeb.trx.getConfirmedTransaction(tx_hash).then((result: {}) => {
                console.log("trasacntion sytatus >>>>>>>>>true", result)
                return { status: true, data: result };
            }).catch(async (error: {}) => {
                await commonHelper.save_error_logs("tron_GetConfirmedTransaction", error.toString());
                return { status: false, data: error };
            });
            return transaction;
        } catch (err: any) {
            console.error(`Tron_Helper GetConfirmedTransaction error >>`, err);
            await commonHelper.save_error_logs("tron_GetConfirmedTransaction", err.message);
            return { status: false, data: err };
        }
    }
    public async GetTransactionInfo(tx_hash: string) {
        try {
            return await trxHelper.tronWeb.trx.getTransactionInfo(tx_hash).then(async (result: any) => {
                return { status: true, data: result };
            });
        } catch (err: any) {
            console.error(`Tron_Helper GetTransactionInfo error >>`, err);
            await commonHelper.save_error_logs("tron_GetTransactionInfo", err.message);
            return null;
        }
    }
    private TRC20_Token_Balance = async (
        address: string,
        contract_address: string
    ) => {
        try {
            await trxHelper.tronWeb.setAddress(contract_address);
            // let contract = await trxHelper.tronWeb.contract().at(contract_address);
            let contract: any = await trxHelper.tronWeb.contract(config.TRON_ABI, contract_address);


            let decimals = await contract.decimals().call();
            if (decimals._hex != undefined) {
                decimals = await trxHelper.tronWeb.toDecimal(decimals._hex);
            }

            let balanceOf = await contract.balanceOf(address).call();
            let toDecimal = await trxHelper.tronWeb.toDecimal(balanceOf._hex);
            if (balanceOf._hex == undefined) {
                toDecimal = await trxHelper.tronWeb.toDecimal(
                    balanceOf.balance._hex
                );
            }
            let expToDecimal = await exponentialToDecimal(toDecimal);
            let balance = Number(expToDecimal) / Math.pow(10, decimals);
            return balance;
        } catch (err: any) {
            console.error(`Tron_Helper TRC20_Token_Balance error >>`, err);
            await commonHelper.save_error_logs("tron_TRC20_Token_Balance", err.message);
            return 0;
        }
    }
    private TRC10_Token_Balance = async (
        address: string,
        contract_address: string
    ) => {
        try {
            const assetBalance = await trxHelper.tronWeb.trx.getAccount(address);

            var balance: number = 0;
            if (
                assetBalance &&
                assetBalance.assetV2 &&
                assetBalance.assetV2.length > 0
            ) {
                for await (var i of assetBalance.assetV2) {
                    if (i.key == contract_address) {
                        var assetDetails = await trxHelper.tronWeb.trx.getTokenByID(
                            contract_address
                        );
                        var precison = Math.pow(10, assetDetails.precision);
                        balance = i.value / precison;
                        return balance;
                    }
                }
                return balance;
            } else {
                return balance;
            }
        } catch (err: any) {
            console.error(`Tron_Helper TRX_Fetch_Balance error >>`, err);
            await commonHelper.save_error_logs("tron_TRC10_Token_Balance", err.message);
            return 0;
        }
    }

}
export let Tron_Helper = new TronHelper();
