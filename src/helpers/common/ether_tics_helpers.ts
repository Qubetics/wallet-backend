import { config } from "../../config";
import { CoinInterface } from "../../models";
import { TokenData } from "../../interfaces/global.interface";
import { bigNumberSafeMath, exponentialToDecimal } from "./globalFunctions";
import { language } from "../../constants";
import { ethers } from "ethers";
import commonHelper from "./common.helpers";
import { AbiItem } from "../../interfaces/ether.interface";

class TicsWeb3 {
  public provider: ethers.JsonRpcProvider;
  public abi: AbiItem[] | string;

  constructor(abi: AbiItem[] | string = "") {
    this.provider = new ethers.JsonRpcProvider(config.NODE.TICS_RPC_URL || "");
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
      return ethers.isAddress(address);
    } catch (err: any) {
      console.error("Error in validate_tics_address", err);
      await commonHelper.save_error_logs("validate_tics_address", err.message);
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

      return Number(tokenBalance);
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
      throw err;
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

      balance = exponentialToDecimal(Number(balance));
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
}

export const ticsWeb3 = new TicsWeb3();