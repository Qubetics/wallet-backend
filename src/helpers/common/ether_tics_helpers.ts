import { config } from "../../config";
import { CoinInterface } from "../../models";
import { TokenData } from "../../interfaces/global.interface";
import { bigNumberSafeMath, exponentialToDecimal } from "./globalFunctions";
import { language } from "../../constants";
import { ethers } from "ethers";
import commonHelper from "./common.helpers";
import { AbiItem } from "../../interfaces/ether.interface";
import { fromBech32 } from "@cosmjs/encoding";

class TicsEther {
  public provider: ethers.JsonRpcProvider;
  public abi: AbiItem[] | string;

  constructor(abi: AbiItem[] | string = "") {
    this.provider = new ethers.JsonRpcProvider(config.NODE.TICS_RPC_URL || "");
    this.abi = abi;
    this.initialize();
  }

  public initialize() { }

  public async searchToken(token_contract: string, lang: string) {
    try {
      const contract = new ethers.Contract(token_contract, config.CONTRACT_ABI, this.provider);
      const [decimals, name, symbol] = await Promise.all([
        contract.decimals(),
        contract.name(),
        contract.symbol()
      ]);

      const data: TokenData = {
        decimals: Number(decimals),
        name,
        symbol
      };

      if (!data) throw new Error(language[lang].ERC20_TOKEN_SEARCH);
      return data;
    } catch (err: any) {
      console.error("searchToken_tics", err)
      await commonHelper.save_error_logs("searchToken_tics", err.message);
      throw new Error(language[lang].ERC20_TOKEN_SEARCH);
    }
  }

  public async validate_tics_address(address: string) {
    try {
      if (address.startsWith("qubetics")) {
        return await this.isValidCosmosAddress(address, "qubetics");
      } else {
        return ethers.isAddress(address);
      }
    } catch (err: any) {
      console.error("Error in validate_tics_address", err);
      await commonHelper.save_error_logs("validate_tics_address", err.message);
      return false;
    }
  }

  private async isValidCosmosAddress(address: string, expectedPrefix: string = "qubetics"): Promise<boolean> {
    try {
      // @cosmjs/encoding 0.39 passes Infinity as the default length limit, which its bech32 library now rejects;
      // 90 is the standard bech32 maximum length
      const decoded = fromBech32(address, 90);
      return decoded.prefix === expectedPrefix;
    } catch (err: any) {
      console.error("Bech32 decoding failed:", err.message);
      await commonHelper.save_error_logs("isValidBech32Address", err.message);
      return false;
    }
  }

  public async get_erc20_token_balance(
    token_address: string | null | undefined,
    tokenAbi: AbiItem[],
    wallet_address: string
  ) {
    try {
      if (!token_address) return 0;

      const contract = new ethers.Contract(token_address, tokenAbi, this.provider);
      const [decimals, balanceRaw] = await Promise.all([
        contract.decimals(),
        contract.balanceOf(wallet_address)
      ]);

      let tokenBalance: string;
      if (Number(decimals) === 18) {
        tokenBalance = ethers.formatUnits(balanceRaw, 18);
      } else {
        tokenBalance = (await bigNumberSafeMath(balanceRaw.toString(), "/", Math.pow(10, Number(decimals)))).toString();
      }

      return tokenBalance;
    } catch (err: any) {
      console.error("Error in get_erc20_token_balance_tcs of tics.", err)
      await commonHelper.save_error_logs("get_erc20_token_balance_tics", err.message);
      throw err;
    }
  }

  public async get_balance(coinData: CoinInterface, address: string) {
    try {
      let balance = "0";

      if (coinData.is_token) {
        balance = (
          await this.get_erc20_token_balance(
            coinData.token_address,
            config.CONTRACT_ABI as AbiItem[],
            address
          )
        ).toString();
      } else {
        balance = (await this.get_coin_balance(address, true)).toString();
      }

      balance = exponentialToDecimal(Number(balance));
      return balance;
    } catch (err: any) {
      console.error("Error in get_balance of tics", err)
      await commonHelper.save_error_logs("get_balance_tics", err.message);
      return null;
    }
  }

  public async getBalance(coinData: CoinInterface, address: string) {
    try {
      let balance = "0";

      if (coinData.is_token) {
        balance = (
          await this.get_erc20_token_balance(
            coinData.token_address,
            config.CONTRACT_ABI as AbiItem[],
            address
          )
        ).toString();
      } else {
        balance = (await this.get_coin_balance(address, true)).toString();
      }

      balance = exponentialToDecimal(balance);
      return balance;
    } catch (err: any) {
      console.error("Error in get_balance of tics", err)
      await commonHelper.save_error_logs("get_balance_tics", err.message);
      throw err;
    }
  }

  public async get_coin_balance(address: string, inTics: boolean) {
    try {
      const balanceInWei = await this.provider.getBalance(address);
      if (inTics) {
        return ethers.formatEther(balanceInWei);
      }
      return balanceInWei.toString();
    } catch (err: any) {
      console.error("Error in get_coin_balance of tics", err)
      await commonHelper.save_error_logs("get_coin_balance_tics", err.message);
      throw err;
    }
  }

  public async getGasPrice(inTics: boolean): Promise<string | bigint> {
    try {
      const feeData = await this.provider.getFeeData();
      const gasPrice = feeData.gasPrice;

      if (inTics === true && gasPrice) {
        return ethers.formatUnits(gasPrice, "gwei");
      }
      return gasPrice || BigInt(0);
    } catch (error) {
      console.log('🔥 ~ ~ getGasPrice node.avax.helper.ts error', error);
      throw error;
    }
  }

  public async getWalletNonce(wallet: string): Promise<number> {
    try {
      return await this.provider.getTransactionCount(wallet, "pending");
    } catch (err: any) {
      console.error("getWalletNonce_eth", err);
      throw err;
    }
  }

  async getErc20TokenTransferGasEstimationCost(
    token_contract: string | null | undefined,
    token_abi: AbiItem[] | string,
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
          this.provider
        );
        const tokenValue = await contract.balanceOf(fromAddress);
        if (tokenValue == BigInt(0)) {
          return {
            status: false,
            gas_estimate: 60000,
            message: language[lang].ESTIMATE_TRANSFER_GAS_FEE('TICS')
          };
        }
        gasLimit = await contract.transfer.estimateGas(toAddress, tokenValue, { from: fromAddress });
        gasLimit = BigInt(gasLimit.toString()) * BigInt(300) / BigInt(100);
      }
      return {
        status: true,
        gas_estimate:
          gasLimit == BigInt(0) ? 60000 : Math.floor(parseFloat(gasLimit.toString())),
        message: language[lang].ESTIMATE_TRANSFER_GAS_FEE('TICS')
      };

    } catch (err: any) {
      await commonHelper.save_error_logs("tics_getErc20TokenTransferGasEstimationCost", err.message);
      console.error("error, for try catch", err);
      return {
        status: false,
        gas_estimate: 60000,
        message: language[lang].ESTIMATE_TRANSFER_GAS_FEE('TICS')
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

      const contract = new ethers.Contract(
        tokenAddress,
        config.ERC721ABI,
        this.provider
      );
      const gasLimit = await contract.transferFrom.estimateGas(fromAddress, toAddress, tokenValue, { from: fromAddress });
      return {
        status: true,
        gas_estimate:
          gasLimit == BigInt(0) ? 120000 : Math.floor(Number(gasLimit)),
        message: language[lang].ESTIMATE_TRANSFER_GAS_FEE('TICS')
      };
    } catch (error) {
      console.error("🔥 ~ ~ getErc721TokenTransferGasEstimationCost ether.tics.helper.ts error")
      return {
        status: false,
        gas_estimate: 120000,
        message: language[lang].ESTIMATE_TRANSFER_GAS_FEE('TICS')
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

      const contract = new ethers.Contract(
        tokenAddress,
        config.ERC1155ABI,
        this.provider
      );
      const gasLimit = await contract.safeTransferFrom.estimateGas(fromAddress, toAddress, tokenValue, tokenAmount, { from: fromAddress });
      return {
        status: true,
        gas_estimate:
          gasLimit == BigInt(0) ? 120000 : Math.floor(Number(gasLimit)),
        message: language[lang].ESTIMATE_TRANSFER_GAS_FEE('TICS')
      };
    } catch (error) {
      console.error("🔥 ~ ~ getErc1155TokenTransferGasEstimationCost ether.tics.helper.ts error")
      return {
        status: false,
        gas_estimate: 120000,
        message: language[lang].ESTIMATE_TRANSFER_GAS_FEE('TICS')
      };
    }
  }

  async getTicsGasLimit(from: string, to: string, lang: string) {
    try {
      const amount = await this.get_coin_balance(from, true);
      const amountWei = ethers.parseEther(amount);
      const gasLimit = await this.provider.estimateGas({
        from: from,
        to: to,
        value: amountWei,
      });

      return {
        status: true,
        gas_estimate: gasLimit > BigInt(30000) ? Math.floor(Number(gasLimit) - 10000) : 20000,
        message: language[lang].ESTIMATE_TRANSFER_GAS_FEE('TICS')
      };
    } catch (err: any) {
      console.error("error, for try catch", err);
      return {
        status: false,
        gas_estimate: 30000,
        message: language[lang].ESTIMATE_TRANSFER_GAS_FEE('TICS')
      };
    }
  }

  public async broadcastTicsRawTx(rawTx: string, cb: CallableFunction) {
    try {
      const prefixedRawTx = rawTx.startsWith('0x') ? rawTx : '0x' + rawTx;
      const txResponse = await this.provider.broadcastTransaction(prefixedRawTx);

      cb(null, txResponse.hash);
      return txResponse;
    } catch (error) {
      console.error("broadcastEthRawTx error:", error);
      // Call callback with error
      cb(error, null);
      throw error;
    }
  }

  public async sendTicsOrTokens(
    req: any,
    lang: string,
    rawTrnx: string,
    cb: CallableFunction
  ) {
    try {
      if (req.coininfo) {
        // Broadcast TICS/ERC20 transaction
        if (rawTrnx) {
          await this.broadcastTicsRawTx(
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
      console.error("Error, sendTicsOrToken===>", err);

    }
  }

  public async convertWeiToTics(value: number | bigint | string): Promise<string> {
    try {
      const valueAsString = value.toString();
      return ethers.formatEther(valueAsString);;
    } catch (error) {
      console.error("convertWeiToEth error:", error);
      throw error;
    }
  }

}

export const ticsEther = new TicsEther();