import { ethers } from "ethers";
import { config } from "../../config";
import { CoinInterface } from "../../models";
import { TokenData } from "../../interfaces/global.interface";
import { bigNumberSafeMath, exponentialToDecimal } from "./globalFunctions";
import { language } from "../../constants";
import commonHelper from "./common.helpers";
import { AbiItem } from "../../interfaces/ether.interface";

class PolEther {
  public provider: ethers.JsonRpcProvider;
  public abi: AbiItem[] | string;

  constructor(abi: AbiItem[] | string = "") {
    this.provider = new ethers.JsonRpcProvider(config.NODE.POL_RPC_URL || "");
    this.abi = abi != "" ? abi : "";
    this.initialize();
  }

  public initialize() { }

  public async searchToken(
    token_contract: string,
    lang: string,
  ) {
    try {
      const contract = new ethers.Contract(
        token_contract,
        config.CONTRACT_ABI,
        this.provider
      );

      const [decimals, name, symbol] = await Promise.all([
        contract.decimals(),
        contract.name(),
        contract.symbol()
      ]);

      const data: TokenData = {
        decimals: Number(decimals),
        name,
        symbol,
      };

      if (!data) throw new Error(language[lang].ERC20_TOKEN_SEARCH);
      return data;
    } catch (err: any) {
      console.error("searchToken_eth", err)
      await commonHelper.save_error_logs("searchToken_pol", err.message);
      throw new Error(language[lang].ERC20_TOKEN_SEARCH);
    }
  }

  public async validate_pol_address(
    address: string,
  ) {
    try {
      return ethers.isAddress(address);
    } catch (err: any) {
      console.error("Error in validate_pol_address", err);
      await commonHelper.save_error_logs("validate_pol_address", err.message);
      return false;
    }
  }

  public async get_erc20_token_balance(
    token_address: string | null | undefined,
    tokenAbi: AbiItem[],
    wallet_address: string
  ) {
    try {
      if (token_address) {
        const contract = new ethers.Contract(token_address, tokenAbi, this.provider);
        const [decimals, balance] = await Promise.all([
          contract.decimals(),
          contract.balanceOf(wallet_address)
        ]);

        let tokenBalance: number | string = 0;
        if (Number(decimals) === 18) {
          tokenBalance = ethers.formatEther(balance);   // Convert Wei to Ether (assuming 18 decimals for most tokens)
        } else {
          tokenBalance = await bigNumberSafeMath(
            balance.toString(),
            "/",
            Math.pow(10, Number(decimals))
          );
        }
        return tokenBalance;
      }
      return 0;
    } catch (err: any) {
      console.error("Error in get_erc20_token_balance_pol of pol.", err)
      await commonHelper.save_error_logs("get_erc20_token_balance_pol", err.message);
      throw err;
    }
  }

  public async get_balance(coinData: CoinInterface, address: string) {
    try {
      let balance: string | any = "0";
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
      console.error("Error in get_balance of pol", err)
      await commonHelper.save_error_logs("get_balance_pol", err.message);
      return null;
    }
  }

  public async getBalance(coinData: CoinInterface, address: string) {
    try {
      let balance: string | any = "0";
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
      console.error("Error in getBalance of pol", err)
      await commonHelper.save_error_logs("getBalance_pol", err.message);
      throw err;
    }
  }

  public async get_coin_balance(address: string, inPol: boolean) {
    try {
      const balanceInWei = await this.provider.getBalance(address);
      if (inPol) {
        return ethers.formatEther(balanceInWei);
      }
      return balanceInWei.toString();
    } catch (err: any) {
      console.error("Error in get_coin_balance of pol", err)
      await commonHelper.save_error_logs("get_coin_balance_pol", err.message);
      throw err;
    }
  }

  public async getWalletNonce(wallet: string): Promise<number> {
    try {
      return await this.provider.getTransactionCount(wallet, "pending");
    } catch (err: any) {
      console.error("getWalletNonce_pol", err);
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
            message: language[lang].ESTIMATE_TRANSFER_GAS_FEE('POL')
          };
        }
        gasLimit = await contract.transfer.estimateGas(toAddress, tokenValue, { from: fromAddress });
        gasLimit = BigInt(gasLimit.toString()) * BigInt(300) / BigInt(100);
      }

      return {
        status: true,
        gas_estimate:
          gasLimit == BigInt(0) ? 60000 : Math.floor(Number(gasLimit)),
        message: language[lang].ESTIMATE_TRANSFER_GAS_FEE('POL')
      };
    } catch (err: any) {
      await commonHelper.save_error_logs("pol_getErc20TokenTransferGasEstimationCost", err.message);
      console.error("error, for try catch", err);
      return {
        status: false,
        gas_estimate: 60000,
        message: language[lang].ESTIMATE_TRANSFER_GAS_FEE('POL')
      };
    }
  }

  async getPolGasLimit(from: string, to: string, lang: string) {
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
        message: language[lang].ESTIMATE_TRANSFER_GAS_FEE('POL')
      };
    } catch (err: any) {
      console.error("error, for try catch", err);
      return {
        status: false,
        gas_estimate: 30000,
        message: language[lang].ESTIMATE_TRANSFER_GAS_FEE('POL')
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

  public async sendPolOrTokens(
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
      console.error("Error, sendPolOrToken===>", err);
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

export const polEther = new PolEther();