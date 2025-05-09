// import { Request } from "express";
// import { AbiItem } from "web3-utils";
// import { config } from "../../../config";
// import { exponentialToDecimal } from "../../../helpers/common/globalFunctions";
// import { HelpersInterface } from "../../../interfaces/helpers.interface";
// import { ticsWeb3 } from "../../../helpers/common/web3_tics_helpers";
// import { language } from "../../../constants";
// import commonHelper from "../../../helpers/common/common.helpers";

// class TicsHelpers implements HelpersInterface {

//   public initialize() { }

//   public async getGasPrice(inTics: boolean): Promise<string | number> {
//     try {
//       let gasPrice = await ticsWeb3.web3.eth.getGasPrice();
//       if (inTics == true) {
//         gasPrice = ticsWeb3.web3.utils.fromWei(gasPrice, "gwei");
//       }
//       return gasPrice;
//     } catch (error) {
//       console.log('🔥 ~ ~ getGasPrice node.avax.helper.ts error', error);
//       throw error;
//     }
//   }

//   public async searchToken(token_contract: string) {
//     try {
//       let { Contract }: any = ticsWeb3.web3.eth;
//       let contract: any = new Contract(config.CONTRACT_ABI as AbiItem[], token_contract as string);
//       let decimals: number = await contract.methods.decimals().call();
//       let name: string = await contract.methods.name().call();
//       let symbol: string = await contract.methods.symbol().call();
//       if (!decimals) {
//         return { decimals: 0, name: "", symbol: "" };
//       }
//       return { decimals: decimals, name: name, symbol: symbol };
//     } catch (err: any) {
//       console.error("Error in searchToken in tics case", err)
//       await commonHelper.save_error_logs("searchToken_tics", err.message);
//       return { decimals: 0, name: "", symbol: "" };
//     }
//   }

//   public async getWalletNonce(wallet: string): Promise<number> {
//     return await ticsWeb3.web3.eth.getTransactionCount(wallet, "pending");
//   }
//   async getErc20TokenTransferGasEstimationCost(
//     token_contract: string | null | undefined,
//     token_abi: AbiItem[] | string,
//     fromAdress: string,
//     toAddress: string,
//     lang: string
//   ) {
//     try {
//       if (token_contract) {
//         let contract = new ticsWeb3.web3.eth.Contract(
//           token_abi as AbiItem[],
//           token_contract
//         );
//         var tokenValue = await contract.methods.balanceOf(fromAdress).call();
//         tokenValue = await exponentialToDecimal(tokenValue as number);
//         var gasLimit = await contract.methods
//           .transfer(toAddress, tokenValue)
//           .estimateGas({ from: fromAdress });
//         gasLimit = gasLimit * 3;
//       }
//       return {
//         status: true,
//         gas_estimate:
//           gasLimit == 0 ? 60000 : Math.floor(parseFloat(gasLimit.toString())),
//         message: language[lang].ESTIMATE_TRANSFER_GAS_FEE('TICS')
//       };

//     } catch (err: any) {
//       await commonHelper.save_error_logs("tics_getErc20TokenTransferGasEstimationCost", err.message);
//       console.error("error, for try catch", err);
//       return {
//         status: false,
//         gas_estimate: 60000,
//         message: language[lang].ESTIMATE_TRANSFER_GAS_FEE('TICS')
//       };
//     }
//   }
//   async getTicsGasLimit(from: string, to: string, lang: string) {
//     try {
//       var amount = await ticsWeb3.get_coin_balance(from, true);
//       var amountWei = await ticsWeb3.web3.utils.toWei(amount.toString(), "ether");
//       var amountHex = await ticsWeb3.web3.utils.toHex(amountWei);
//       var gasLimit = await ticsWeb3.web3.eth.estimateGas({
//         from: from,
//         to: to,
//         value: amountHex,
//       });

//       return {
//         status: true,
//         gas_estimate: gasLimit > 30000 ? gasLimit : 30000,
//         message: language[lang].ESTIMATE_TRANSFER_GAS_FEE('TICS')
//       };
//     } catch (err: any) {
//       console.error("error, for try catch", err);
//       return {
//         status: false,
//         gas_estimate: 30000,
//         message: language[lang].ESTIMATE_TRANSFER_GAS_FEE('TICS')
//       };
//     }
//   }
//   public async broadcastTicsRawTx(rawTx: string, cb: CallableFunction) {
//     var sendRawRes = await ticsWeb3.web3.eth
//       .sendSignedTransaction("0x" + rawTx)
//       .on("transactionHash", (txHash) => {
//         cb(null, txHash);
//       })
//       .on("error", (err) => {
//         console.error("err:: ", err);
//         cb(err, null);
//       });
//   }
//   public async sendTicsOrTokens(
//     req: Request,
//     lang: string,
//     rawTrnx: string,
//     cb: CallableFunction
//   ) {
//     try {
//       if (req.coininfo) {
//         // Broadcast TICS/ERC20 transaction
//         if (rawTrnx) {
//           await this.broadcastTicsRawTx(
//             rawTrnx,
//             async (error: Error, txid: string) => {
//               if (error) {
//                 console.error("txid callback error ------ ", error);
//                 cb(error, null);
//               } else {
//                 console.log("txid callback ------ ", txid);
//                 cb(null, txid);
//               }
//             }
//           );
//         } else {
//           cb(language[lang].TRNX_NOT_FOUND, null);
//         }
//       }
//     } catch (err: any) {
//       console.error("Error, sendTicsOrToken===>", err);

//     }
//   }
//   public async convertWeiToTics(value: number): Promise<string> {
//     let valueInTics: any = await ticsWeb3.web3.utils.fromWei(value.toString(), "ether");
//     return valueInTics;
//   }

// }

// export const TicsHelper = new TicsHelpers();
