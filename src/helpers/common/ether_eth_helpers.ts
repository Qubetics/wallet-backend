import { config } from "../../config";
import { CoinInterface } from "../../models";
import { TokenData } from "../../interfaces/global.interface";
import { bigNumberSafeMath, exponentialToDecimal } from "./globalFunctions";
import { language } from "../../constants";
import { ethers } from "ethers";
import commonHelper from "./common.helpers";
import { AbiItem } from "../../interfaces/ether.interface";
class EthEther {
  public provider: ethers.JsonRpcProvider;
  public abi: AbiItem[] | string;

  constructor(abi: AbiItem[] | string = "") {
    this.provider = new ethers.JsonRpcProvider(config.NODE.ETH_RPC_URL || "");
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
      console.error("searchToken_eth", err);
      await commonHelper.save_error_logs("searchToken_eth", err.message);
      throw new Error(language[lang].ERC20_TOKEN_SEARCH);
    }
  }

  public async validate_eth_address(address: string) {
    try {
      return ethers.isAddress(address);
    } catch (err: any) {
      console.error("Error in validate_eth_address", err);
      await commonHelper.save_error_logs("validate_eth_address", err.message);
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
      console.error("Error in get_erc20_token_balance_eth of eth.", err);
      await commonHelper.save_error_logs("get_erc20_token_balance_eth", err.message);
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
      console.error("Error in get_balance of eth", err);
      await commonHelper.save_error_logs("get_balance_eth", err.message);
      return null;
    }
  }

  public async getBalance(coinData: CoinInterface, address: string) {
    try {
      let balance: string = "0";

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

      if (typeof balance !== "boolean" && balance !== "false") {
        balance = exponentialToDecimal(balance);
      }

      return balance;
    } catch (err: any) {
      console.error("Error in getBalance of eth", err);
      await commonHelper.save_error_logs("getBalance_eth", err.message);
      throw err;
    }
  }

  public async get_coin_balance(address: string, inEth: boolean) {
    try {
      const balanceInWei = await this.provider.getBalance(address);
      if (inEth) {
        return ethers.formatEther(balanceInWei);
      }
      return balanceInWei.toString();
    } catch (err: any) {
      console.error("Error in get_coin_balance of eth", err);
      await commonHelper.save_error_logs("get_coin_balance_eth", err.message);
      throw err;
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
          this.provider
        );
        const tokenValue = await contract.balanceOf(fromAddress);
        if (tokenValue == BigInt(0)) {
          return {
            status: false,
            gas_estimate: 60000,
            message: language[lang].ESTIMATE_TRANSFER_GAS_FEE('ETH')
          };
        }
        gasLimit = await contract.transfer.estimateGas(toAddress, tokenValue, { from: fromAddress })
        gasLimit = BigInt(gasLimit.toString()) * BigInt(300) / BigInt(100);
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
      const amount = await this.get_coin_balance(from, true);
      const amountWei = ethers.parseEther(amount);
      const gasLimit = await this.provider.estimateGas({
        from: from,
        to: to,
        value: amountWei,
      });

      return {
        status: true,
        gas_estimate: gasLimit > BigInt(30000) ? Math.floor(Number(gasLimit)) : 30000,
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
  public async sendEthOrTokens(
    req: any,
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

export const ethEther = new EthEther();