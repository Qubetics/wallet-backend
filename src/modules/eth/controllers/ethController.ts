import { Request, Response } from "express";
import { OnlyControllerInterface } from "../../../interfaces/controller.interface";
import dbHelper from "../../../helpers/dbHelper";
import { config } from "../../../config";
import { bigNumberSafeMath, handleErrorMessage } from "../../../helpers/common/globalFunctions";
import * as Models from '../../../models/model/index';
import { language } from "../../../constants";
import response from "../../../helpers/response/response.helpers";
import { ethEther } from "../../../helpers/common/ether_eth_helpers";
import commonHelper from "../../../helpers/common/common.helpers";
import { TokenType } from "../../../constants/global_enum";
import { AbiItem } from "../../../interfaces/ether.interface";

class EthController implements OnlyControllerInterface {
  constructor() {
    this.initialize();
  }

  public initialize() { }

  public async getNonce(req: Request, res: Response): Promise<Response> {
    let lang: any = req.headers['content-language'] || 'en';
    const { wallet_address }: { wallet_address: string } = req.body;
    try {
      const walletNonce = await ethEther.getWalletNonce(wallet_address);
      const nonce_val: number = walletNonce;
      return response.success(res, {
        data: {
          status: true,
          data: {
            nonce: nonce_val,
          },
          message: language[lang].GET_NONCE,
        },
      });

    } catch (err: any) {
      console.error("error in eth getting nonce", err);
      await commonHelper.save_error_logs("eth_getNonce", err.message);
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
    let lang: any = req.headers['content-language'] || 'en';
    try {
      //Gas estimation 0 for coins other than BSC/BEP20
      if (
        req.coininfo &&
        req.coininfo.coin_family !== config.STATIC_COIN_FAMILY.ETH
      ) {
        return response.success(res, {
          data: { status: true, gas_estimate: 0, gas_gwei_price: 0 },
        });
      } else if (req.coininfo) {
        let estimationRes: {
          status: boolean;
          gas_estimate: any;
          message: any;
        } = { status: true, gas_estimate: 0, message: '' }
        const { from, to, amount, token_value }: { from: string; to: string, amount: number, token_value: string } = req.body;
        const { token_address, token_abi, is_token, token_type } = req.coininfo;
        if (is_token && token_address) {
          if (token_type == TokenType.ERC20) {
            estimationRes =
              await ethEther.getErc20TokenTransferGasEstimationCost(
                token_address,
                token_abi,
                from,
                to,
                lang
              );
          } else if (token_type == TokenType.ERC721) {
            estimationRes = await ethEther.getErc721TokenTransferGasEstimationCost(to, from, token_value, token_address, lang);
          } else if (amount) {
            estimationRes = await ethEther.getErc1155TokenTransferGasEstimationCost(to, from, token_value, token_address, amount, lang);
          }
        } else {
          estimationRes = await ethEther.getEthGasLimit(from, to, lang);
        }
        const resultList: any = await Models.GasPriceModel.findOne({
          where: {
            coin_family: config.STATIC_COIN_FAMILY.ETH
          }
        })
        return response.success(res, {
          data: {
            status: true,
            gas_estimate: estimationRes.gas_estimate,
            resultList,
          },
        });
      }
    } catch (err: any) {
      await commonHelper.save_error_logs("eth_getEstimationGas", err.message);
      return response.error(res, {
        data: { status: false, message: language[lang].CATCH_MSG },
      });
    }
  }

  public async send(req: Request, res: Response) {
    let lang: any = req.headers['content-language'] || 'en';
    try {
      const { token_address: contractAddress, token_abi: ABI } = req.coininfo;
      const dapp_transaction: any = req.body.add_amount;
      const {
        gas_estimate,
        amount,
        gas_price,
        from,
        tx_raw,
      } = req.body;
      const maxGas = await bigNumberSafeMath(gas_price, '*', gas_estimate)
      const gasInETH = await ethEther.convertWeiToEth(maxGas);
      // ETH only
      if (req.coininfo.is_token == false && req.coininfo.coin_symbol == "eth") {
        let withdrawAmount;
        if (dapp_transaction == 1) {
          withdrawAmount = bigNumberSafeMath('0', "+", gasInETH);
        } else {
          withdrawAmount = bigNumberSafeMath(amount, "+", gasInETH);
        }
        const ethBalance = await ethEther.get_coin_balance(from, true);
        if (Number(ethBalance) < Number(withdrawAmount)) {
          return response.error(res, {
            data: { status: false, message: language[lang].INSUFFICIENT },
          });
        }
      } else if (
        req.coininfo.coin_family == config.STATIC_COIN_FAMILY.ETH &&
        req.coininfo.is_token == true &&
        req.coininfo.token_type === "ERC20"
      ) {
        const ethBalance = await ethEther.get_coin_balance(from, true);
        const ERC20TokenBalance = await ethEther.get_erc20_token_balance(
          contractAddress,
          ABI as AbiItem[],
          req.body.from
        );
        if (Number(ethBalance) < Number(gasInETH)) {
          return response.error(res, {
            data: {
              status: false,
              message: language[lang].INSUFFICIENTETH
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
        req.coininfo.coin_family == config.STATIC_COIN_FAMILY.ETH &&
        req.coininfo.is_token == true &&
        (req.coininfo.token_type === TokenType.ERC721 || req.coininfo.token_type === TokenType.ERC1155)
      ) {
        const ethBalance = await ethEther.get_coin_balance(from, true);
        if (Number(ethBalance) < Number(gasInETH)) {
          return response.error(res, {
            data: {
              status: false,
              message: language[lang].ETH_GAS(gasInETH, 'ETH')
            },
          });
        }
      }
      await ethEther.sendEthOrTokens(
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
            req.body.tx_fee = gasInETH;
            const resultStatus: any = await dbHelper.saveWithdrawTxDetails(req);

            if (
              req.coininfo.is_token == true &&
              (req.coininfo.token_type === TokenType.ERC721 || req.coininfo.token_type === TokenType.ERC1155)
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
      console.error("Error in ETHEREUM send API >>>>>", err)
      await commonHelper.save_error_logs("eth_send", err.message);
      return response.error(res, {
        data: {
          status: false,
          message: language[lang].CATCH_MSG
        },
      });
    }
  }
}

export const EthControllers = new EthController();
