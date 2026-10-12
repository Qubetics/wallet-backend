import { Request } from "express";
import { AbiItem } from "web3-utils";
import { config } from "../../../config";
import { exponentialToDecimal } from "../../../helpers/common/globalFunctions";
import { HelpersInterface } from "../../../interfaces/helpers.interface";
import { ethWeb3 } from "../../../helpers/common/web3_eth_helpers";
import { language } from "../../../constants";
import commonHelper from "../../../helpers/common/common.helpers";

class EthHelpers implements HelpersInterface {


  public initialize() { }


  public async searchToken(token_contract: string) {
    try {
      let { Contract }: any = ethWeb3.web3.eth;
      let contract: any = new Contract(config.CONTRACT_ABI as AbiItem[], token_contract as string);
      let decimals: number = await contract.methods.decimals().call();
      let name: string = await contract.methods.name().call();
      let symbol: string = await contract.methods.symbol().call();
      if (!decimals) {
        return { decimals: 0, name: "", symbol: "" };
      }
      return { decimals: decimals, name: name, symbol: symbol };
    } catch (err: any) {
      console.error("Error in searchToken in eth case", err)
      await commonHelper.save_error_logs("searchToken_eth", err.message);
      return { decimals: 0, name: "", symbol: "" };
    }
  }

  public async getWalletNonce(wallet: string): Promise<number> {
    return await ethWeb3.web3.eth.getTransactionCount(wallet, "pending");
  }
  async getErc20TokenTransferGasEstimationCost(
    token_contract: string | null | undefined,
    token_abi: AbiItem[] | string,
    fromAdress: string,
    toAddress: string,
    lang: string
  ) {
    try {
      if (token_contract) {
        let contract = new ethWeb3.web3.eth.Contract(
          token_abi as AbiItem[],
          token_contract
        );
        var tokenValue = await contract.methods.balanceOf(fromAdress).call();
        tokenValue = await exponentialToDecimal(tokenValue as number);
        var gasLimit = await contract.methods
          .transfer(toAddress, tokenValue)
          .estimateGas({ from: fromAdress });
        gasLimit = gasLimit * 3;
      }
      return {
        status: true,
        gas_estimate:
          gasLimit == 0 ? 60000 : Math.floor(parseFloat(gasLimit.toString())),
        message: language[lang].ESTIMATE_TRANSFER_GAS_FEE('ETH')
      };

    } catch (err: any) {
      await commonHelper.save_error_logs("eth_getErc20TokenTransferGasEstimationCost", err.message);
      console.error("error, for try catch", err);
      return {
        status: false,
        gas_estimate: 60000,
        message: language[lang].ESTIMATE_TRANSFER_GAS_FEE('ETH')
      };
    }
  }
  async getEthGasLimit(from: string, to: string, lang: string) {
    try {
      var amount = await ethWeb3.get_coin_balance(from, true);
      var amountWei = await ethWeb3.web3.utils.toWei(amount.toString(), "ether");
      var amountHex = await ethWeb3.web3.utils.toHex(amountWei);
      var gasLimit = await ethWeb3.web3.eth.estimateGas({
        from: from,
        to: to,
        value: amountHex,
      });

      return {
        status: true,
        gas_estimate: gasLimit > 30000 ? gasLimit : 30000,
        message: language[lang].ESTIMATE_TRANSFER_GAS_FEE('ETH')
      };
    } catch (err: any) {
      console.error("error, for try catch", err);
      return {
        status: false,
        gas_estimate: 30000,
        message: language[lang].ESTIMATE_TRANSFER_GAS_FEE('ETH')
      };
    }
  }
  public async broadcastEthRawTx(rawTx: string, cb: CallableFunction) {
    await ethWeb3.web3.eth
      .sendSignedTransaction("0x" + rawTx)
      .on("transactionHash", (txHash) => {
        cb(null, txHash);
      })
      .on("error", (err) => {
        console.error("err:: ", err);
        cb(err, null);
      });
  }
  public async sendEthOrTokens(
    req: Request,
    lang: string,
    rawTrnx: string,
    cb: CallableFunction
  ) {
    try {
      if (req.coininfo) {
        // Broadcast ETH/ERC20 transaction
        if (rawTrnx) {
          await this.broadcastEthRawTx(
            rawTrnx,
            async (error: Error, txid: string) => {
              if (error) {
                console.error("txid callback error ------ ", error);
                cb(error, null);
              } else {
                console.log("txid callback ------ ", txid);
                cb(null, txid);
              }
            }
          );
        } else {
          cb(language[lang].TRNX_NOT_FOUND, null);
        }
      }
    } catch (err: any) {
      console.error("Error, sendEthOrToken===>", err);

    }
  }
  public async convertWeiToEth(value: number): Promise<string> {
    let valueInEth: any = await ethWeb3.web3.utils.fromWei(value.toString(), "ether");
    return valueInEth;
  }

}

export const EthHelper = new EthHelpers();
