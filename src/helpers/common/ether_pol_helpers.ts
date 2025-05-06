import { ethers } from "ethers";
import { config } from "../../config";
import { CoinInterface } from "../../models";
import { TokenData } from "../../interfaces/global.interface";
import { bigNumberSafeMath, exponentialToDecimal } from "./globalFunctions";
import { language } from "../../constants";
import commonHelper from "./common.helpers";
import { AbiItem } from "../../interfaces/ether.interface";

class PolWeb3 {
  public provider: ethers.JsonRpcProvider;
  public abi: AbiItem[] | string;

  constructor(abi: AbiItem[] | string = "") {
    this.provider = new ethers.JsonRpcProvider(config.NODE.POL_RPC_URL || "");
    this.abi = abi != "" ? abi : "";
    this.initialize();
  }

  public initialize() {}

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
      throw err;
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
      balance = exponentialToDecimal(Number(balance));
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
}

export const polWeb3 = new PolWeb3();