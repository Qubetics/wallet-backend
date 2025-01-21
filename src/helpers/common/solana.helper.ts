import { config } from "../../config";
import { AccountLayout } from "@solana/spl-token";
import { PublicKey, Connection } from "@solana/web3.js";
// import axios from 'axios';
const spltokenReg = require("@solana/spl-token-registry");
import {
  mplTokenMetadata,
  fetchDigitalAsset,
} from "@metaplex-foundation/mpl-token-metadata";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { publicKey } from "@metaplex-foundation/umi";
import { CoinInterface } from "../../models";
import { GlblBooleanEnum } from "../../constants/global_enum";
import commonHelper from "./common.helpers";
import { language } from "../../constants";
import { bigNumberSafeMath } from "./globalFunctions";

class SolanaHelpers {
  public connection: Connection;
  public connectionNew: Connection;
  public connectionPublic: Connection;

  constructor() {
    this.connection = new Connection(
      config.NODE.SOL_RPC_URL || "",
      "confirmed"
    );
    this.connectionNew = new Connection(
      "https://solana-mainnet.g.alchemy.com/v2/REDACTED"
    );
    this.connectionPublic = new Connection(
      "https://api.mainnet-beta.solana.com"
    );
    //this.connectionNew = new Connection("https://api.tatum.io/v3/blockchain/node/solana-mainnet/t-668bc6a95cc8a5001c84cfe5-f77baac94da7436aa48fe793");
    this.initialize();
  }

  public initialize() {}

  public async getUserSolanaBalance(
    wallet: string,
    inSolana: boolean,
    isString: boolean
  ): Promise<string | number> {
    try {
      let balanceInWei = await this.connection.getBalance(
        new PublicKey(wallet)
      );
      // console.log('balanceInWei >>>', balanceInWei);

      if (inSolana == true) {
        let balance = bigNumberSafeMath(
          balanceInWei.toString(),
          "/",
          Math.pow(10, 9)
        );
        // console.log('balance >>>', balance);
        return isString ? balance : Number(balance);
      }
      return balanceInWei;
    } catch (err) {
      // console.log('🔥 ~ ~ getUserSolanaBalance node.solana.helper.ts error', err);
      // try {
      //     let balanceInWei = await this.connectionNew.getBalance(new PublicKey(wallet));
      //     if (inSolana == true) {
      //         return Number(balanceInWei / 1000000000);
      //     }
      //     return balanceInWei;
      // } catch (error) {
      console.log(
        "🔥 ~ ~ getUserSolanaBalance PUBLIC NODE node.solana.helper.ts error",
        err
      );
      return 0;
      // throw err;
      // }
    }
  }

  // public async getUserCRC20TokenBalance(tokenAddress: string, walletAddress: string, isString: boolean): Promise<number> {
  //     try {
  //         const walletPublicKey = new PublicKey(walletAddress);
  //         const mintPublicKey = new PublicKey(tokenAddress);
  //         const tokenAccounts = await this.connectionNew.getTokenAccountsByOwner(walletPublicKey, {
  //             mint: mintPublicKey,
  //         });
  //         if (tokenAccounts.value?.length > 0) {
  //             const tokenAccount = tokenAccounts.value[0].account;
  //             const tokenAccountInfo = AccountLayout.decode(tokenAccount.data);
  //             const amount = tokenAccountInfo.amount;
  //             const mintInfo: any = await this.connectionNew.getParsedAccountInfo(mintPublicKey);
  //             const decimals = mintInfo.value.data.parsed.info.decimals;
  //             let balance = bigNumberSafeMath(amount.toString(), '/', Math.pow(10, decimals))
  //             balance = isString ? balance : Number(balance);
  //             //const balance = Number(amount) / (10 ** decimals);
  //             return balance;
  //         } else {
  //             console.log('🚀 ~ getUserCRC20TokenBalance PUBLIC NODE node.solana.helper.ts');
  //             const tokenAccounts = await this.connectionPublic.getTokenAccountsByOwner(walletPublicKey, {
  //                 mint: mintPublicKey,
  //             });
  //             if (tokenAccounts.value?.length > 0) {
  //                 const tokenAccount = tokenAccounts.value[0].account;
  //                 const tokenAccountInfo = AccountLayout.decode(tokenAccount.data);
  //                 const amount = tokenAccountInfo.amount;
  //                 const mintInfo: any = await this.connectionPublic.getParsedAccountInfo(mintPublicKey);
  //                 const decimals = mintInfo.value.data.parsed.info.decimals;
  //                 const balance = Number(amount) / (10 ** decimals);
  //                 return balance;
  //             } else {
  //                 return 0;
  //             }
  //         }
  //     } catch (error: any) {
  //         console.log('🔥 ~ ~ getUserCRC20TokenBalance node.solana.helper.ts error', error);
  //         try {
  //             const walletPublicKey = new PublicKey(walletAddress);
  //             const mintPublicKey = new PublicKey(tokenAddress);
  //             const tokenAccounts = await this.connectionNew.getTokenAccountsByOwner(walletPublicKey, {
  //                 mint: mintPublicKey,
  //             });
  //             if (tokenAccounts.value?.length > 0) {
  //                 const tokenAccount = tokenAccounts.value[0].account;
  //                 const tokenAccountInfo = await AccountLayout.decode(tokenAccount.data);
  //                 const amount = tokenAccountInfo.amount;
  //                 const mintInfo: any = await this.connectionNew.getParsedAccountInfo(mintPublicKey);
  //                 const decimals = mintInfo.value.data.parsed.info.decimals;
  //                 const balance = Number(amount) / (10 ** decimals);
  //                 return balance;
  //             } else {
  //                 return 0;
  //             }
  //         } catch (err) {
  //             console.log('🔥 ~ ~ getUserCRC20TokenBalance PUBLIC NODE node.solana.helper.ts error', error);
  //             throw error;
  //             return 0;
  //         }
  //     }
  // }

  public async getUserCRC20TokenBalance(
    tokenAddress: string,
    walletAddress: string,
    isString: boolean
  ): Promise<number | string> {
    const fetchTokenAccountBalance = async (
      connection: any
    ): Promise<number | string> => {
      const walletPublicKey = new PublicKey(walletAddress);
      const mintPublicKey = new PublicKey(tokenAddress);

      try {
        const tokenAccounts = await connection.getTokenAccountsByOwner(
          walletPublicKey,
          {
            mint: mintPublicKey,
          }
        );

        if (tokenAccounts.value?.length > 0) {
          const tokenAccount = tokenAccounts.value[0].account;
          const tokenAccountInfo = AccountLayout.decode(tokenAccount.data);
          const amount = tokenAccountInfo.amount;
          const mintInfo: any = await connection.getParsedAccountInfo(
            mintPublicKey
          );
          const decimals = mintInfo.value.data.parsed.info.decimals;
          const balance = Number(amount) / 10 ** decimals;
          return isString ? balance.toString() : balance;
        }
        return 0;
      } catch (error) {
        console.log("🔥 ~ ~ Error fetching token balance:", error);
        return 0;
      }
    };

    let balance = await fetchTokenAccountBalance(this.connectionNew);

    // If no balance from the "new" connection, fall back to public node
    if (balance === 0) {
      console.log("🚀 ~ Falling back to PUBLIC NODE");
      balance = await fetchTokenAccountBalance(this.connectionPublic);
    }

    return balance;
  }

  public async Fetch_Balance(
    address: string,
    coin: CoinInterface,
    isString: boolean
  ) {
    try {
      let balance: number | any = 0;
      if (
        coin.is_token == GlblBooleanEnum.true &&
        coin?.token_address !== null &&
        coin?.token_address !== undefined
      ) {
        balance = await this.getUserCRC20TokenBalance(
          coin?.token_address,
          address,
          isString
        );
      } else {
        console.log("dddddddddddddddddddddddddd");
        balance = await this.getUserSolanaBalance(address, true, isString);
      }
      return balance;
    } catch (err: any) {
      console.error(`Error in Fetch_Balance of sol. `, err);
      await commonHelper.save_error_logs("Fetch_Balance_sol", err.message);
      throw err;
    }
  }

  public searchToken = async (token_address: string, lang: string) => {
    try {
      // try {
      const umi = createUmi(config.NODE.SOL_RPC_URL).use(mplTokenMetadata());
      const myPublicKey = publicKey(token_address);
      const asset = await fetchDigitalAsset(umi, myPublicKey);
      // const imageUrl = await this.fetchMetadata(asset?.metadata?.uri);
      const tokenData: any = {
        name: asset?.metadata?.name,
        symbol: asset?.metadata?.symbol,
        decimals: asset?.mint?.decimals,
        // coin_image: imageUrl?.image || null,
      };
      if (tokenData) {
        return tokenData;
      } else {
        const tokenList = await new spltokenReg.TokenListProvider()
          .resolve()
          .then((tokens: any) => {
            return tokens.filterByClusterSlug("mainnet-beta").getList();
          });
        const foundToken = await tokenList.find(
          (token: any) => token.address == token_address
        );
        return foundToken;
      }
      // } catch (err) {
      // try {
      //     console.log('🔥 ~ ~ searchToken node.solana.helper.ts fetchDigitalAsset error', err);
      //     const tokenList = await new spltokenReg.TokenListProvider().resolve().then((tokens: any) => {
      //         return tokens.filterByClusterSlug("mainnet-beta").getList();
      //     });
      //     const foundToken = await tokenList.find((token: any) => token.address == token_address);
      //     return foundToken;

      //     /*} else {
      //         const result: any = await axios.get(`https://api.phantom.app/tokens/v1/solana:101/address/${token_address}`);
      //         const finalResult: any = {
      //             name: result?.data?.data.name,
      //             symbol: result?.data?.data.symbol,
      //             decimals: result?.data?.data.decimals,
      //         }
      //         return finalResult;
      //     }*/
      // } catch (err1) {
      //     // console.log('🔥 ~ ~ searchToken node.solana.helper.ts filterByClusterSlug error', err);
      //     // const result: any = await axios.get(`https://api.phantom.app/tokens/v1/solana:101/address/${token_address}`);
      //     // const finalResult: any = {
      //     //     name: result?.data?.data.name,
      //     //     symbol: result?.data?.data.symbol,
      //     //     decimals: result?.data?.data.decimals,
      //     // }
      //     // return finalResult;
      // }
      // }
    } catch (error) {
      console.log("🔥 ~ ~ searchToken node.solana.helper.ts error", error);
      throw new Error(language[lang].ERC20_TOKEN_SEARCH);
    }
  };

  public validateSolAddress = async (wallet_address: string) => {
    try {
      let pubkey = new PublicKey(wallet_address);
      const validAddress = PublicKey.isOnCurve(pubkey.toBuffer());
      console.log("🖐️ ~ ~ validateSolAddress", validAddress);
      return validAddress;
    } catch (error: any) {
      console.log("🔥 ~ ~ validateSolAddress error", error);
      return false;
    }
  };
}

export const SolanaHelper = new SolanaHelpers();
