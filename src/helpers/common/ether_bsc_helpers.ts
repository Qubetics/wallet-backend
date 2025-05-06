import { config } from "../../config";
import { CoinInterface } from "../../models";
import { TokenData } from "../../interfaces/global.interface";
import { bigNumberSafeMath, exponentialToDecimal } from "./globalFunctions";
import { language } from "../../constants";
import { ethers } from "ethers";
import commonHelper from "./common.helpers";
import { AbiItem } from "../../interfaces/ether.interface";
class BSCWeb3 {
  public provider: ethers.JsonRpcProvider;
  public abi: AbiItem[] | string;

  constructor(abi: AbiItem[] | string = "") {
    this.provider = new ethers.JsonRpcProvider(config.NODE.BNB_RPC_URL || "");
    this.abi = abi;
    this.initialize();
  }

  public initialize() {}

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
      
      if (!data) throw new Error(language[lang].BSC_TOKEN_SEARCH);
      return data;
    } catch (err: any) {
      console.error("searchToken_bsc", err)
      await commonHelper.save_error_logs("searchToken_bsc", err.message);
      throw new Error(language[lang].BSC_TOKEN_SEARCH);
    }
  }

  public async validate_bnb_address(address: string) {
    try {
      return ethers.isAddress(address);
    } catch (err: any) {
      console.error("Error in validate_bnb_address", err);
      await commonHelper.save_error_logs("validate_bnb_address", err.message);
      return false;
    }
  }

  public async get_bep20_token_balance(
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

      return Number(tokenBalance);
    } catch (err: any) {
        console.error("Error in get_bep20_token_balance of bsc.", err)
        await commonHelper.save_error_logs("get_bep20_token_balance_bsc", err.message);
        throw err;
    }
  }

  public async get_balance(coinData: CoinInterface, address: string) {
    try {
      let balance = "0";

      if (coinData.is_token) {
        balance = (
          await this.get_bep20_token_balance(
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
        console.error("Error in get_balance of bnb", err)
        await commonHelper.save_error_logs("get_balance_bnb", err.message);
        throw err;
    }
  }

  public async getBalance(coinData: CoinInterface, address: string) {
    try {
      let balance = "0";

      if (coinData.is_token) {
        balance = (
          await this.get_bep20_token_balance(
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
        console.error("Error in getBalance of bnb", err)
        await commonHelper.save_error_logs("getBalance_bnb", err.message);
        throw err;
    }
  }

  public async get_coin_balance(address: string, inBsc: boolean) {
    try {
      const balanceInWei = await this.provider.getBalance(address);
      if (inBsc) {
        return ethers.formatEther(balanceInWei);
      }
      return balanceInWei.toString();
    } catch (err: any) {
      console.log("get_coin_balance _bsc", err);
      await commonHelper.save_error_logs("get_coin_balance_bnb", err.message);
      throw err;
    }
  }




    // Used in bsc 
    public async getBep20TokenTransferGasEstimationCost(
        token_contract: string | null | undefined,
        token_abi: AbiItem[] | string,
        fromAdress: string,
        toAddress: string,
        lang: string
    ) {
        try {
          if (token_contract) {
            const contract = new ethers.Contract(token_contract, token_abi, this.provider);
            
            const tokenValue = await contract.balanceOf(fromAdress);
            if (tokenValue == 0) {
                return {
                    status: false,
                    gas_estimate: 0,
                    message: language[lang].BSC_UNABLE_TO_ESTIMATE,
                };
            }
            const signer = await this.provider.getSigner(fromAdress);
            const contractWithSigner = contract.connect(signer);
            
            const gasLimit = await contractWithSigner.getFunction("transfer").estimateGas(toAddress, tokenValue);
            
            const adjustedGasLimit = gasLimit * BigInt(2);
            return adjustedGasLimit === BigInt(0) ? 60000 : adjustedGasLimit;
        }
        return 60000;
        } catch (err: any) {
            console.error("🔥 ~ ~ getBep20TokenTransferGasEstimationCost node.bsc.helper.ts error", err);
            await commonHelper.save_error_logs("getBep20TokenTransferGasEstimationCost_bsc", err.message);
            return 0;
        }
    }
    public async getBscGasLimit(from: string, to: string) {
        try {
          const amount: any = await this.get_coin_balance(from, true);
          const amountWei = ethers.parseEther(amount.toString());
          const gasLimit = await this.provider.estimateGas({
            from: from,
            to: to,
            value: amountWei
          });
          return Math.floor(Number(gasLimit) * 1.5);
        } catch (err: any) {
            console.error("getBscGasLimit_bsc", err)
            await commonHelper.save_error_logs("getBscGasLimit_bsc", err.message);
            return 0;
        }
    }
    public async getWalletNonce(wallet: string) {
        try {
          return await this.provider.getTransactionCount(wallet, "pending");
        } catch (err: any) {
            console.error("getWalletNonce_bsc", err)
            await commonHelper.save_error_logs("getWalletNonce_bsc", err.message);
            throw err;
        }
    }

}

export const bscWeb3 = new BSCWeb3();