import { Request } from "express";
import { config } from "../../../config";
import { HelpersInterface } from "../../../interfaces/helpers.interface";
import { ethWeb3 } from "../../../helpers/common/ether_eth_helpers";
import { language } from "../../../constants";
import commonHelper from "../../../helpers/common/common.helpers";
import { ethers } from "ethers";

class EthHelpers implements HelpersInterface {

  public initialize() { }


  public async searchToken(token_contract: string) {
    try {
      const contract = new ethers.Contract(token_contract, config.CONTRACT_ABI, ethWeb3.provider);
      const [decimals, name, symbol] = await Promise.all([
        contract.decimals(),
        contract.name(),
        contract.symbol()
      ]);
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
    try {
      return await ethWeb3.provider.getTransactionCount(wallet, "pending");
    } catch (err: any) {
      console.error("getWalletNonce_eth", err);
      throw err;
    }
  }

  async getErc20TokenTransferGasEstimationCost(
    token_contract: string | null | undefined,
    token_abi: any,
    fromAddress: string,
    toAddress: string,
    lang: string
  ) {
    try {
      let gasLimit = BigInt(0);
      
      if (token_contract) {
        const contract = new ethers.Contract(
          token_contract,
          token_abi,
          ethWeb3.provider
        );
        const tokenValue = await contract.balanceOf(fromAddress);
        if (tokenValue == BigInt(0)) {
          return {
            status: false,
            gas_estimate: 60000,
            message: language[lang].ESTIMATE_TRANSFER_GAS_FEE('ETH')
          };
        }
        
        gasLimit = await contract.getFunction("transfer").estimateGas(
          toAddress, 
          tokenValue,
          { from: fromAddress }
        );
        
        gasLimit = gasLimit * BigInt(3);
      }
      
      return {
        status: true,
        gas_estimate: 
          gasLimit == BigInt(0) ? 60000 : Math.floor(Number(gasLimit)),
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
  public async getErc721TokenTransferGasEstimationCost(
    toAddress: string,
    fromAddress: string,
    tokenValue: string,
    tokenAddress: string,
    lang: string
  ) {
    try {
    const nonce = await ethWeb3.provider.getTransactionCount(fromAddress, 'pending');
    
    const contract = new ethers.Contract(
      tokenAddress,
      config.ERC721ABI,
      ethWeb3.provider
    );

    const data = contract.interface.encodeFunctionData(
      "transferFrom", 
      [fromAddress, toAddress, tokenValue]
    );
    const gasLimit = await ethWeb3.provider.estimateGas({
      from: fromAddress,
      nonce: nonce,
      to: tokenAddress,
      data: data,
    });
    return {
      status: true,
      gas_estimate:
        gasLimit == BigInt(0) ? 120000 : Math.floor(Number(gasLimit)),
      message: language[lang].ESTIMATE_TRANSFER_GAS_FEE('ETH')
    };
    } catch (error) {
      console.error("🔥 ~ ~ getErc721TokenTransferGasEstimationCost node.eth.helper.ts error")
      return {
        status: false,
        gas_estimate: 120000,
        message: language[lang].ESTIMATE_TRANSFER_GAS_FEE('ETH')
      };
    }
  }

  public async getErc1155TokenTransferGasEstimationCost(
    toAddress: string,
    fromAddress: string,
    tokenValue: string,
    tokenAddress: string,
    tokenAmount: number,
    lang: string
  ) {
    try {
      const nonce = await ethWeb3.provider.getTransactionCount(fromAddress, 'pending');
    
      const contract = new ethers.Contract(
        tokenAddress,
        config.ERC1155ABI,
        ethWeb3.provider
      );
      
      const data = contract.interface.encodeFunctionData(
        "safeTransferFrom", 
        [fromAddress, toAddress, tokenValue, tokenAmount, '0x0']
      );
      
      const gasLimit = await ethWeb3.provider.estimateGas({
        from: fromAddress,
        nonce: nonce,
        to: tokenAddress,
        data: data,
      });
      return {
        status: true,
        gas_estimate:
          gasLimit == BigInt(0) ? 120000 : Math.floor(Number(gasLimit)),
        message: language[lang].ESTIMATE_TRANSFER_GAS_FEE('ETH')
      };
    } catch (error) {
      console.error("🔥 ~ ~ getErc1155TokenTransferGasEstimationCost node.eth.helper.ts error")
      return {
        status: false,
        gas_estimate: 120000,
        message: language[lang].ESTIMATE_TRANSFER_GAS_FEE('ETH')
      };
    }
  }

  async getEthGasLimit(from: string, to: string, lang: string) {
    try {
      const amount = await ethWeb3.get_coin_balance(from, true);
      const amountWei = ethers.parseEther(amount);
      const gasLimit = await ethWeb3.provider.estimateGas({
        from: from,
        to: to,
        value: amountWei,
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
    try {
      const prefixedRawTx = rawTx.startsWith('0x') ? rawTx : '0x' + rawTx;
      const txResponse = await ethWeb3.provider.broadcastTransaction(prefixedRawTx);
      
      cb(null, txResponse.hash);
      return txResponse;
    } catch (error) {
      console.error("broadcastEthRawTx error:", error);
      // Call callback with error
      cb(error, null);
      throw error;
    }
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
  public async convertWeiToEth(value: number | bigint | string): Promise<string> {
    try {
      const valueAsString = value.toString();
      return ethers.formatEther(valueAsString);;
    } catch (error) {
      console.error("convertWeiToEth error:", error);
      throw error;
    }
  }

}

export const EthHelper = new EthHelpers();
