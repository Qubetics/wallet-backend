
// import { config } from "../../../config";
// import { AbiItem } from "../../../interfaces/ether.interface";
// import { TokenType } from "../../../constants/global_enum";
// import { bscWeb3 } from "../../../helpers/common/ether_bsc_helpers";
// import commonHelper from "../../../helpers/common/common.helpers";
// import { bigNumberSafeMath } from "../../../helpers/common/globalFunctions";
// import { language } from "../../../constants";
// import { ethers } from "ethers";



// class BscHelpers {

//     public initialize() { }

//     public async get_fee_price(coin_info: any, body: any, lang: string) {
//         try {
//             const { from, to }: { from: string; to: string } = body;
//             let estimateGas: any;
//             let set_token_type = coin_info.token_type !== undefined ? coin_info.token_type : TokenType.BEP20;
//             if (coin_info.is_token) {
//                 if (set_token_type == TokenType.BEP20) {
//                     estimateGas = await bscWeb3.getBep20TokenTransferGasEstimationCost(coin_info.token_address, config.CONTRACT_ABI as AbiItem[], from, to, lang);
//                 } else {
//                     console.log("is_token can't be 0 ")
//                 }
//             } else {
//                 estimateGas = await bscWeb3.getBscGasLimit(from, to);
//             }

//             return {
//                 gas_estimate: estimateGas,
//             }
//         } catch (err: any) {
//             await commonHelper.save_error_logs("bsc_send", err.message);
//             console.error("err", err as Error);
//         }

//     }
//   public async convertWeiToEth(value: number | bigint | string): Promise<string> {
//     try {
//       const valueAsString = value.toString();
//       return ethers.formatEther(valueAsString);;
//     } catch (error) {
//       console.error("convertWeiToEth error:", error);
//       throw error;
//     }
//   }
//     public async getUserBEP20TokenBalance(
//         tokenAddress: string | null | undefined,
//         tokenAbi: AbiItem[],
//         walletAddress: string
//     ): Promise<number> {
//         try {
//             if (!tokenAddress) return 0;

//             const contract = new ethers.Contract(tokenAddress, tokenAbi, bscWeb3.provider);
//             const [decimals, balanceRaw] = await Promise.all([
//                 contract.decimals(),
//                 contract.balanceOf(walletAddress)
//             ]);

//             let tokenBalance: string;
//             if (Number(decimals) === 18) {
//               tokenBalance = ethers.formatUnits(balanceRaw, 18);
//             } else {
//               tokenBalance = (await bigNumberSafeMath(balanceRaw.toString(), "/", Math.pow(10, Number(decimals)))).toString();
//             }
//             return Number(tokenBalance);
//         } catch (error) {
//             console.log("getUserBEP20TokenBalance catch error: ", error);
//             return 0;
//         }
//     }
//     public async broadcastBscRawTx(rawTx: string, cb: CallableFunction) {
//     try {
//       const prefixedRawTx = rawTx.startsWith('0x') ? rawTx : '0x' + rawTx;
//       const txResponse = await bscWeb3.provider.broadcastTransaction(prefixedRawTx);
      
//       cb(null, txResponse.hash);
//       return txResponse;
//     } catch (error) {
//       console.error("broadcastEthRawTx error:", error);
//       // Call callback with error
//       cb(error, null);
//       throw error;
//     }
//   }
//     public async sendBscOrTokens(
//         req: any,
//         lang: string,
//         rawTrnx: string,
//         cb: CallableFunction
//     ) {
//         try {
//             if (req.coininfo) {
//                 if (rawTrnx) {
//                     await this.broadcastBscRawTx(
//                         rawTrnx,
//                         async (error: Error, txid: string) => {
//                             if (error) {
//                                 console.error("txid callback error ------ ", error);
//                                 cb(error, null);
//                             } else {
//                                 console.log("txid callback ------ ", txid);
//                                 cb(null, txid);
//                             }
//                         }
//                     );
//                 } else {
//                     cb(language[lang].TRNX_NOT_FOUND, null);
//                 }
//             }
//         } catch (err: any) {
//             console.error("Error, sendBscOrToken===>", err);
//         }
//     }

// };

// export const BscHelper = new BscHelpers();
