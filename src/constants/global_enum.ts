export enum GlblCoins {
    ETH = 'ETH',
    BTC = 'BTC',
    TRX = 'TRX',
    BNB = 'BNB',
    POL = 'POL',
}
export enum TokenType {
    ERC20 = 'ERC20',
    BEP20 = 'BEP20',
    TRC20 = 'TRC20',
    SPL = 'SPL',
    ERC721 = 'ERC721',
    ERC1155 = 'ERC1155'
}
export const chainId_coinFamily: any = {
    "56": 1,
    "1": 2
}

export const coinFamily_chainId: any = {
    1: "56",
    2: "1"
}

export enum WalletName {
    ETH = 'Eth',
    BTC = 'Btc',
    TRX = 'Trx',
    BNB = 'Bnb',
    POL = 'Pol',
    SOL = 'Sol',
    TICS = 'Tics'
}
export enum BlockChain {
    BNB = 'bnb',
}

export enum InfoMessages {
    APP_INFO = "Backend for Qubetics backend application initialized. please try to connect with url.",
}

export enum GlblBooleanEnum {
    false = 0,
    true = 1
}
export enum GlblAddedBy {
    ADMIN = 'admin',
    USER = 'user'
}
export enum GlblCode {
    SUCCESS = 200,
    INVALID_TOKEN = 401,
    ERROR_CODE = 400,
    NOT_FOUND = 500
}
export enum GlblMessages {
    FILE_UPLOAD_ERROR = 'Error in File upload.',
    SUCCESS = 'SUCCESS',
    CATCH_MSG = 'Something went wrong. Please try again later.',
    INVALID_COIN_FAMILY = 'Invalid coin family.',
    INVALID_TOKEN = 'Invalid Token, please try again.',
    INVALID_REQ_BODY = "Invalid input: HTML tags detected in request body. Please remove any HTML content.",

}
export enum GlblStatus {
    COMPLETED = 'completed',
}
export enum GlblBlockchainTxStatusEnum {
    PENDING = 'pending',
    FAILED = 'failed',
    CONFIRMED = 'confirmed',
}
export enum Fiat_Currency {
    USD = 'usd'
}
export enum TxTypesEnum {
    DEPOSIT = "deposit",
    WITHDRAW = "withdraw",
    SWAP = "Swap",
    APPROVE = "Approve",
    CROSS_CHAIN = "cross_chain",
    DAPP = "dapp",
    BUY = 'buy',
    SELL = 'sell',
    CARDS = 'cards',
    CARD_FEES = 'card_fees',
    CARD_RECHARGE = 'card_recharge',
    CHAIN_ABSTRACTION = 'chain_abstraction'

}

export enum TxReqTypesEnum {
    APP = 'APP',
}

export type TradingSourceResponse = {
    status: boolean;
    graphSource: string | null;
    graphPair: string;
};

export interface NFTObject {
    token_address: string;
    token_type: TokenType;
    token_id: string | number;
    amount?: string | number;
    owner_of?: string;
    token_uri?: string | null;

    coin_family: number;

    name: string;
    symbol: string;
    image?: string | null;
    image_extension?: string | null;
    text_data?: string | null;

    description?: string | null;
    attributes?: any;

    nft_coin_data?: {
        coin_id: number;
        coin_symbol: string | null;
        coin_name: string | null;
    };
}

export interface PopulateNFTContext {
    user_id: number;
    address: string;
    symbol: string;
    nft: any; // raw chain response (Moralis / TicsScan)
}


