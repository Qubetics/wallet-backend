import { Request, Response } from "express";
import { OnlyControllerInterface } from "../../../interfaces/controller.interface";
import dbHelper from "../../../helpers/dbHelper";
import { config } from "../../../config";
import { bigNumberSafeMath, handleErrorMessage } from "../../../helpers/common/globalFunctions";
import * as Models from '../../../models/model/index';
import { language } from "../../../constants";
import response from "../../../helpers/response/response.helpers";
import { ticsEther } from "../../../helpers/common/ether_tics_helpers";
import commonHelper from "../../../helpers/common/common.helpers";
import { AbiItem } from "../../../interfaces/ether.interface";
import { GlblBlockchainTxStatusEnum, TokenType } from "../../../constants/global_enum";
import { ethers } from "ethers";

class TicsController implements OnlyControllerInterface {
  constructor() {
    this.initialize();
  }

  public initialize() { }

  public async getNonce(req: Request, res: Response): Promise<Response> {
    let lang: any = req.headers['content-language'] || 'en';
    console.log("req body tics nonce >>>", req.body)
    const { wallet_address }: { wallet_address: string } = req.body;
    try {
      const walletNonce = await ticsEther.getWalletNonce(wallet_address);
      return response.success(res, {
        data: {
          status: true,
          data: {
            nonce: walletNonce,
          },
          message: language[lang].GET_NONCE,
        },
      });

    } catch (err: any) {
      console.error("error in tics getting nonce", err);
      await commonHelper.save_error_logs("tics_getNonce", err.message);
      return response.error(res, {
        data: {
          status: false,
          message: language[lang].CATCH_MSG,
          data: {},
        },
      });
    }
  }
  public async getEstimationGas(
    req: Request,
    res: Response
  ): Promise<Response | undefined> {
    const lang: any = req.headers['content-language'] || 'en';

    try {
      // If coininfo absent -> return error early
      if (!req.coininfo) {
        return response.error(res, {
          data: { status: false, message: language[lang].CATCH_MSG },
        });
      }

      // Gas estimation is 0 for coins other than TICS
      if (req.coininfo.coin_family !== config.STATIC_COIN_FAMILY.TICS) {
        return response.success(res, {
          data: { status: true, gas_estimate: 0, gas_gwei_price: 0 },
        });
      }

      // For TICS family proceed
      // Ensure estimationRes is always defined with a default
      let estimationRes: {
        status: boolean;
        gas_estimate: number;
        message?: string;
      } = { status: false, gas_estimate: 0, message: '' };

      const { from, to, amount, token_value }: { from: string; to: string; amount?: number; token_value?: string } = req.body;
      const { token_address, token_abi, is_token, token_type } = req.coininfo;

      if (is_token && token_address) {
        // ERC20
        if (token_type === TokenType.ERC20) {
          // (ensure token_abi present if your helper requires it)
          estimationRes = await ticsEther.getErc20TokenTransferGasEstimationCost(
            token_address,
            token_abi,
            from,
            to,
            lang
          );
        }
        // ERC721
        else if (token_type === TokenType.ERC721) {
          if (token_value) {
            // token_value is usually tokenId for ERC721
            estimationRes = await ticsEther.getErc721TokenTransferGasEstimationCost(
              from,
              to,
              token_value,
              token_address,
              lang
            );
          } else {
            return response.error(res, {
              data: { status: false, message: language[lang].CATCH_MSG },
            });
          }
        }
        // ERC1155
        else if (token_type === TokenType.ERC1155) {
          if (token_value && amount) {

            // amount must be provided for ERC1155
            estimationRes = await ticsEther.getErc1155TokenTransferGasEstimationCost(
              from,
              to,
              token_value,
              token_address,
              amount,
              lang
            );

          } else {
            return response.error(res, {
              data: { status: false, message: language[lang].CATCH_MSG },
            });
          }
        } else {
          // Unknown token type -> default/fallback
          estimationRes = { status: false, gas_estimate: 0, message: 'Unsupported token type' };
        }
      } else {
        // Native TICS transfer (non-token)
        estimationRes = await ticsEther.getTicsGasLimit(from, to, lang);
      }

      const gas_price = await ticsEther.getGasPrice(true);

      return response.success(res, {
        data: {
          status: true,
          gas_estimate: estimationRes?.gas_estimate ?? 0,
          gas_price: gas_price ?? 0,
        },
      });
    } catch (err: any) {
      await commonHelper.save_error_logs('tics_getEstimationGas', err.message);
      return response.error(res, {
        data: { status: false, message: language[lang].CATCH_MSG },
      });
    }
  }


  public async send(req: Request, res: Response) {
    let lang: any = req.headers['content-language'] || 'en';
    try {
      const { token_address: contractAddress, token_abi: ABI, coin_family: coin_family } = req.coininfo;
      const dapp_transaction: any = req.body.add_amount;
      const {
        gas_estimate,
        amount,
        gas_price,
        from,
        tx_raw,
      } = req.body;
      const maxGas = await bigNumberSafeMath(gas_price, '*', gas_estimate);
      const gasInTics = await ticsEther.convertWeiToTics(maxGas);
      // TICS only
      if (req.coininfo.is_token == false && req.coininfo.coin_symbol == "tics") {
        let withdrawAmount;
        if (dapp_transaction == 1) {
          withdrawAmount = bigNumberSafeMath('0', "+", gasInTics);
        } else {
          withdrawAmount = bigNumberSafeMath(amount, "+", gasInTics);
        }
        const ticsBalance = await ticsEther.get_coin_balance(from, true);
        console.log("🚀 ~ TicsController ~ send ~ ticsBalance:", ticsBalance)
        console.log("🚀 ~ TicsController ~ send ~ withdrawAmount:", withdrawAmount)
        if (Number(ticsBalance) < Number(withdrawAmount)) {
          return response.error(res, {
            data: { status: false, message: language[lang].INSUFFICIENT },
          });
        }
      } else if (
        req.coininfo.coin_family == config.STATIC_COIN_FAMILY.TICS &&
        req.coininfo.is_token == true &&
        req.coininfo.token_type === TokenType.ERC20
      ) {
        const ticsBalance = await ticsEther.get_coin_balance(from, true);
        const ERC20TokenBalance = await ticsEther.get_erc20_token_balance(
          contractAddress,
          ABI as AbiItem[],
          req.body.from
        );
        if (Number(ticsBalance) < Number(gasInTics)) {
          return response.error(res, {
            data: {
              status: false,
              message: language[lang].INSUFFICIENTTICS
            },
          });
        } else if (Number(ERC20TokenBalance) < Number(amount)) {
          return response.error(res, {
            data: {
              status: false,
              message: language[lang].ETH_INSUFFICIENT(req.coininfo.coin_symbol)
            },
          });
        }
      } else if (
        req.coininfo.coin_family == config.STATIC_COIN_FAMILY.TICS &&
        req.coininfo.is_token == true &&
        (req.coininfo.token_type === TokenType.ERC721 || req.coininfo.token_type === TokenType.ERC1155)
      ) {
        const ticsBalance = await ticsEther.get_coin_balance(from, true);
        if (Number(ticsBalance) < Number(gasInTics)) {
          return response.error(res, {
            data: {
              status: false,
              message: language[lang].ETH_GAS(gasInTics, 'TICS')
            },
          });
        }
      }
      await ticsEther.sendTicsOrTokens(
        req,
        lang,
        tx_raw,
        async (err: Error, txid: string) => {
          if (err) {

            const filteredMessage = await handleErrorMessage(err)
            return response.error(res, {
              data: {
                status: false,
                message: filteredMessage
              },
            });

          } else {

            req.body.tx_hash = txid;
            req.body.tx_status = "completed";
            req.body.tx_fee = gasInTics;
            const resultStatus: any = await dbHelper.saveWithdrawTxDetails(req);

            if (
              req.coininfo.is_token == true &&
              (req.coininfo.token_type === TokenType.ERC721 || req.coininfo.token_type === TokenType.ERC1155)
            ) {

              await Models.NFTModelModel.update(
                {
                  available: 0,
                },
                { where: { token_address: req.coininfo.token_address as string, coin_family: coin_family } }
              );
            }

            if (resultStatus.status && resultStatus.status == true) {
              if (req.body.tx_type == 'Approve') {

                return response.success(res, {
                  data: {
                    status: true,
                    message: language[lang].APPROVE_REQUEST,
                    tx_hash: txid,
                  },
                });
              } else if (req.body.tx_type == 'withdraw') {

                return response.success(res, {
                  data: {
                    status: true,
                    message: language[lang].WITHDRAW_REQUEST_ETH(req.body.amount, req.coininfo.coin_symbol),
                    tx_hash: txid,
                  },
                });
              } else {
                return response.success(res, {
                  data: {
                    status: true,
                    message: language[lang].SWAP_REQUEST_ETH(req.body.amount, req.coininfo.coin_symbol),
                    tx_hash: txid,
                  },
                });
              }
            } else {
              return response.error(res, {
                data: {
                  status: false,
                  message: language[lang].TRANSACTION_REQUEST
                },
              });
            }
          }
        }
      );
    } catch (err: any) {
      console.error("Error in QUBETICS send API >>>>>", err)
      await commonHelper.save_error_logs("tics_send", err.message);
      return response.error(res, {
        data: {
          status: false,
          message: language[lang].CATCH_MSG
        },
      });
    }
  }

  public async sendNative(req: Request, res: Response) {
    let lang: any = req.headers['content-language'] || 'en';
    try {
      const prefixedRawTx = req?.body?.txid.startsWith('0x') ? req?.body?.txid : ('0x' + req?.body?.txid);
      req.body.tx_hash = prefixedRawTx;
      req.body.tx_status = "completed";
      const resultStatus: any = await dbHelper.saveWithdrawTxDetails(req);

      if (resultStatus.status && resultStatus.status == true) {
        if (req.body.tx_type == "withdraw") {
          return response.success(res, {
            data: {
              status: true,
              message: language[lang].WITHDRAW_REQUEST_ETH(
                req.body.amount,
                req.coininfo.coin_symbol
              ),
              tx_hash: prefixedRawTx,
            },
          });
        } else {
          return response.success(res, {
            data: {
              status: true,
              message: language[lang].SWAP_REQUEST_ETH(
                req.body.amount,
                req.coininfo.coin_symbol
              ),
              tx_hash: prefixedRawTx,
            },
          });
        }
      } else {
        return response.error(res, {
          data: {
            status: false,
            message: language[lang].TRANSACTION_REQUEST,
          },
        });
      }
    } catch (err: any) {
      console.error("Error in TICS NATIVE send API >>>>>", err);
      await commonHelper.save_error_logs("tics_native_send", err.message);
      return response.error(res, {
        data: {
          status: false,
          message: language[lang].CATCH_MSG,
        },
      });
    }
  }

  public async getEstimationGasNative(req: Request, res: Response) {
    let lang: any = req.headers["content-language"] || "en";
    try {
      const gasEstimate = 111348;
      const gasPrice = '90000000000tics';
      const bufferedGasEstimate = gasEstimate * 2;
      const bufferedGasPrice = 90;
      return response.success(res, {
        data: {
          status: true,
          message: language[lang].DATA_FETCHED,
          data: {
            gas_estimate: gasEstimate,
            gas_price: gasPrice,
            buffered_gas_estimate: bufferedGasEstimate,
            buffered_gas_price: bufferedGasPrice,
          },
        },
      });
    } catch (err: any) {
      console.error("Error in TICS NATIVE gas estimation API >>>>>", err);
      await commonHelper.save_error_logs("tics_native_gas_estimation", err.message);
      return response.error(res, {
        data: {
          status: false,
          message: language[lang].CATCH_MSG,
        },
      });
    }
  }

  public async saveTransaction(req: Request, res: Response) {
    try {
      const transactionHash = req.body.tx_hash;
      const {
        gas_estimate,
        gas_price
      } = req.body;
      
      const gasPriceWei = ethers.parseUnits(gas_price.toString(), "gwei"); // BigInt in Wei

      // // Multiply with gas estimate
      const maxGas = gasPriceWei * BigInt(gas_estimate); // stays as BigInt

      // // Now convert to ETH or TICS for display
      const gasInTics = ethers.formatEther(maxGas); // converts BigInt -> string ETH


      if (req.coininfo.is_token == false && req.coininfo.coin_symbol == "tics") {
       
      } else if (
        req.coininfo.coin_family == config.STATIC_COIN_FAMILY.TICS &&
        req.coininfo.is_token == true &&
        req.coininfo.token_type === "ERC20"
      ) {
     

      } else if (
        req.coininfo.coin_family == config.STATIC_COIN_FAMILY.TICS &&
        req.coininfo.is_token == true &&
        req.coininfo.token_type === "ERC721"
      ) {
        

       }

        req.body.tx_hash = transactionHash;
        req.body.tx_status = "pending";
        req.body.tx_fee = gasInTics;
        req.body.blockchain_status = GlblBlockchainTxStatusEnum.CONFIRMED;

        const resultStatus: any = await dbHelper.saveWithdrawTxDetails(req);

        if (
          req.coininfo.is_token == true &&
          req.coininfo.token_type === "ERC721"
        ) {
          await Models.NFTModelModel.update(
            {
              available: 0,
            },
            { where: { token_address: req.coininfo.token_address as string } }
          );
        }

        if (resultStatus.status && resultStatus.status == true) {
          if (req.body.tx_type == 'Approve') {

            return response.success(res, {
              data: {
                status: true,
                message: "Transaction saved successfully",
                tx_hash: transactionHash,
              },
            });
          } else if (req.body.tx_type == 'withdraw') {

            return response.success(res, {
              data: {
                status: true,
                message: "Transaction saved successfully",
                tx_hash: transactionHash,
              },
            });
          } else {
            return response.success(res, {
              data: {
                status: true,
                message: "Transaction saved successfully",
                tx_hash: transactionHash,
              },
            });
          }
        } else {
          return response.error(res, {
            data: {
              status: false,
              message: "Transaction save failed",
            },
          });
        }

    } catch (err: any) {
      return response.error(res, {
        data: {
          status: false,
          message: "Transaction save failed",
        },
      });
    }
  }

  public async updateTransactionStatus(req: Request, res: Response) {
    try {
      
      const { tx_status, tx_hash } = req.body;

      if(!tx_hash || !tx_status) {
        return response.error(res, {
          data: {
            status: false,
            message: "Transaction hash and status are required",
          },
        });
      }
      const  transaction: any = await dbHelper.getTrnxHistoryByTxId(tx_hash);

      if(!transaction) {
        return response.error(res, {
          data: {
            status: false,
            message: "Transaction not found",
          },
        });
      }
      
      let TX_STATUS = 'pending'
      if(tx_status == 1 || tx_status == 'confirmed' || tx_status == 'completed'){
        TX_STATUS = 'completed'
      }else if(tx_status == 0 || tx_status == 'failed'){
        TX_STATUS = 'failed'
      }


      if(transaction) {
        await Models.TrnxHistoryModel.update(
          { status: TX_STATUS },
          { where: { tx_id: tx_hash, id : transaction.id } }
        );
      }

      return response.success(res, {
        data: {
          status: true,
          message: "Transaction status updated successfully",
        },
      });
    }
    catch (err: any) {
      return response.error(res, {
        data: {
          status: false,
          message: "Transaction status update failed",
        },
      });
    }
  }  
}

export const TicsControllers = new TicsController();
