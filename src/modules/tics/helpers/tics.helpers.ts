// import { Request } from "express";
// import { AbiItem } from "../../../interfaces/ether.interface";
// import { config } from "../../../config";
// import { exponentialToDecimal } from "../../../helpers/common/globalFunctions";
// import { HelpersInterface } from "../../../interfaces/helpers.interface";
// import { ticsWeb3 } from "../../../helpers/common/ether_tics_helpers";
// import { language } from "../../../constants";
// import commonHelper from "../../../helpers/common/common.helpers";
// import { ethers } from "ethers";

// class TicsHelpers implements HelpersInterface {

//   public initialize() { }

//   public async getGasPrice(inTics: boolean): Promise<string | bigint> {
//     try {
//       const feeData = await ticsWeb3.provider.getFeeData();
//       const gasPrice = feeData.gasPrice;
      
//       if (inTics === true && gasPrice) {
//         return ethers.formatUnits(gasPrice, "gwei");
//       }
//       return gasPrice || BigInt(0);
//     } catch (error) {
//       console.log('🔥 ~ ~ getGasPrice node.avax.helper.ts error', error);
//       throw error;
//     }
//   }

//   public async searchToken(token_contract: string) {
//     try {
//       const contract = new ethers.Contract(token_contract, config.CONTRACT_ABI, ticsWeb3.provider);
//             const [decimals, name, symbol] = await Promise.all([
//               contract.decimals(),
//               contract.name(),
//               contract.symbol()
//             ]);
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
//     try {
//       return await ticsWeb3.provider.getTransactionCount(wallet, "pending");
//     } catch (err: any) {
//       console.error("getWalletNonce_eth", err);
//       throw err;
//     }
//   }
//   async getErc20TokenTransferGasEstimationCost(
//     token_contract: string | null | undefined,
//     token_abi: AbiItem[] | string,
//     fromAddress: string,
//     toAddress: string,
//     lang: string
//   ) {
//  try {
//       let gasLimit = BigInt(0);
      
//       if (token_contract) {
//         const contract = new ethers.Contract(
//           token_contract,
//           token_abi,
//           ticsWeb3.provider
//         );
//         const tokenValue = await contract.balanceOf(fromAddress);
//         if (tokenValue == BigInt(0)) {
//           return {
//             status: false,
//             gas_estimate: 60000,
//             message: language[lang].ESTIMATE_TRANSFER_GAS_FEE('ETH')
//           };
//         }
        
//         gasLimit = await contract.getFunction("transfer").estimateGas(
//           toAddress, 
//           tokenValue,
//           { from: fromAddress }
//         );
        
//         gasLimit = gasLimit * BigInt(3);
//       }
//       return {
//         status: true,
//         gas_estimate:
//           gasLimit == BigInt(0) ? 60000 : Math.floor(parseFloat(gasLimit.toString())),
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
//       const amount = await ticsWeb3.get_coin_balance(from, true);
//       const amountWei = ethers.parseEther(amount);
//       const gasLimit = await ticsWeb3.provider.estimateGas({
//         from: from,
//         to: to,
//         value: amountWei,
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
//     try {
//       const prefixedRawTx = rawTx.startsWith('0x') ? rawTx : '0x' + rawTx;
//       const txResponse = await ticsWeb3.provider.broadcastTransaction(prefixedRawTx);
      
//       cb(null, txResponse.hash);
//       return txResponse;
//     } catch (error) {
//       console.error("broadcastEthRawTx error:", error);
//       // Call callback with error
//       cb(error, null);
//       throw error;
//     }
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
//   public async convertWeiToTics(value: number | bigint | string): Promise<string> {
//     try {
//       const valueAsString = value.toString();
//       return ethers.formatEther(valueAsString);;
//     } catch (error) {
//       console.error("convertWeiToEth error:", error);
//       throw error;
//     }
//   }

// }

// export const TicsHelper = new TicsHelpers();
