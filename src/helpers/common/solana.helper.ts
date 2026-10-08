import { config } from "../../config";
import { AccountLayout, TOKEN_2022_PROGRAM_ID, getMint, getTokenMetadata, unpackAccount } from "@solana/spl-token";
import { PublicKey, Connection } from "@solana/web3.js";
import {
  mplTokenMetadata,
  fetchDigitalAsset,
} from "@metaplex-foundation/mpl-token-metadata";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { publicKey } from "@metaplex-foundation/umi";
import { CoinInterface } from "../../models";
import { GlblBooleanEnum } from "../../constants/global_enum";
import commonHelper from "./common.helpers";
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
      `https://solana-mainnet.g.alchemy.com/v2/${config.ALCHEMY_SOLANA_KEY}`
    );
    this.connectionPublic = new Connection(
      "https://api.mainnet-beta.solana.com"
    );
    this.initialize();
  }

  public initialize() { }

  public async getUserSolanaBalance(
    wallet: string,
    inSolana: boolean,
    isString: boolean
  ): Promise<string | number> {
    try {
      let balanceInWei = await this.connection.getBalance(
        new PublicKey(wallet)
      );

      if (inSolana == true) {
        let balance = bigNumberSafeMath(
          balanceInWei.toString(),
          "/",
          Math.pow(10, 9)
        );
        return isString ? balance : Number(balance);
      }
      return balanceInWei;
    } catch (err) {
      console.log(
        "🔥 ~ ~ getUserSolanaBalance PUBLIC NODE node.solana.helper.ts error",
        err
      );
      return 0;
    }
  }

  public async getUserCRC20TokenBalance(
    tokenAddress: string,
    walletAddress: string,
    isString: boolean
  ): Promise<number | string | null> {
    const fetchTokenAccountBalance = async (
      connection: any
    ): Promise<number | string | null> => {
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
        return null;
      } catch (error) {
        console.log("🔥 ~ ~ Error fetching token balance:", error);
        return null;
      }
    };

    let balance = await fetchTokenAccountBalance(this.connectionNew);

    // If no balance from the "new" connection, fall back to public node
    if (balance == null) {
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
      return null;
    }
  }


  public searchToken = async (address: string, lang: string) => {
    const pubkey = new PublicKey(address);

    // ✅ 1. Get basic account info
    const info = await this.connection.getAccountInfo(pubkey);
    if (!info) throw new Error("Address not found");

    // ✅ 2. Detect if this is a token account → extract mint address
    let mintAddress = address;
    try {
      const account = unpackAccount(pubkey, info);
      mintAddress = account.mint.toBase58();
    } catch (_) {
      // Not a token account → assume mint itself
    }

    console.log("✅ Mint Address:", mintAddress);

    // ✅ 3. Detect whether mint belongs to Token-2022
    const mintInfo = await this.connection.getAccountInfo(new PublicKey(mintAddress));
    const isToken2022 = mintInfo?.owner.equals(TOKEN_2022_PROGRAM_ID);

    console.log("✅ Is Token-2022:", isToken2022);

    // ✅ 4. TOKEN-2022 → Do NOT use Metaplex NFT metadata
    if (isToken2022) {
      try {
        const mint = await getMint(
          this.connection,
          new PublicKey(mintAddress),
          "confirmed",
          TOKEN_2022_PROGRAM_ID
        );

        let metadata = null;
        try {
          metadata = await getTokenMetadata(
            this.connection,
            new PublicKey(mintAddress),
            "confirmed",
            TOKEN_2022_PROGRAM_ID
          );

          console.log("This is  Metadata : ", metadata)
        } catch (_) {
          metadata = null; // extension not enabled
        }

        return {
          name: metadata?.name ?? null,
          symbol: metadata?.symbol ?? null,
          decimals: mint.decimals,
        };
      } catch (err: any) {
        console.log("❌ Token-2022 parse error:", err.message);
        throw err;
      }
    }
    // ✅ 5. Standard SPL Token → Metaplex DigitalAsset metadata + mint info
    const umi = createUmi(config.NODE.SOL_RPC_URL).use(mplTokenMetadata());
    const asset: any = await fetchDigitalAsset(umi, publicKey(mintAddress));

    return {
      name: asset.metadata.name,
      symbol: asset.metadata.symbol,
      decimals: asset.mint.decimals,
    };
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
