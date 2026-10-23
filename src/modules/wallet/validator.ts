import { Joi } from "express-validation";

export default class wallet_validator {
  static addTokenValidate = {
    body: Joi.object({
      name: Joi.string().required(),
      symbol: Joi.string().required(),
      coin_gicko_alias: Joi.string().optional(),
      decimals: Joi.string().required(),
      token_address: Joi.string().required(),
      coin_family: Joi.number().required(),
      wallet_address: Joi.string().required(),
      // coin_gicko_id: Joi.string().allow(null, "").optional(),
      wallet_name: Joi.string().allow(null, "").optional(),
      isSwapList: Joi.bool().optional(),
      token_type: Joi.string().required(),
    }),
  };
  static portfolioValidate = {
    body: Joi.object({
      page: Joi.number().optional(),
      limit: Joi.number().optional(),
      coin_family: Joi.array()
        .items(Joi.number().integer().required()
        ).required(),
      search: Joi.string().allow(null, "").optional(),
      addressListKeys: Joi.array()
        .items(Joi.string().required()
        ).required(),
      fiat_type: Joi.string().required(),
      is_balanced: Joi.boolean().optional()
    }),
  };
  static activeInactiveWallet = {
    body: Joi.object({
      coinId: Joi.number().required(),
      walletAddress: Joi.string().required(),
      isActive: Joi.number().required(),
    }),
  };
  static toggleCoinListValidate = {
    body: Joi.object({
      page: Joi.number().optional(),
      limit: Joi.number().optional(),
      coinFamilyKeys: Joi.array()
        .items(Joi.number().integer().required()
        ).required(),
      search: Joi.string().allow(null, "").optional(),
      addrsListKeys: Joi.array()
        .items(Joi.string().required()
        ).required(),
      currency_code: Joi.string().required(),
    }),
  };
  static transactionListValidate = {
    body: Joi.object({
      addrsListKeys: Joi.array()
        .items(Joi.string().required()
        ).required(),
      fiat_currency: Joi.string().allow(null, "").optional(),
      search: Joi.string().optional(),
      limit: Joi.number().optional(),
      page: Joi.number().optional(),
      coin_id: Joi.number().optional(),
      status: Joi.string().allow(null, "").optional(),
      date_from: Joi.string().allow(null, "").optional(),
      date_to: Joi.string().allow(null, "").optional(),
      trnx_type: Joi.string().allow(null, "").optional(),
      coin_family: Joi.array()
        .items(Joi.number().integer().required()
        ).required(),
      coin_type: Joi.string().allow(null, "").optional(),
      from_date: Joi.string().allow(null, "").optional(),
      to_date: Joi.string().allow(null, "").optional(),
    }),
  };
  static searchTokenValidate = {
    body: Joi.object({
      tokenAddress: Joi.string().required(),
      coinFamily: Joi.number().required(),
    }),
  };
  static swapListValidate = {
    body: Joi.object({
      coin_family: Joi.array()
        .items(Joi.number().integer().required()
        ).required(),
      addrsListKeys: Joi.array()
        .items(Joi.string().required()
        ).required(),
      fiat_type: Joi.string().required(),
      coin_id: Joi.number().optional(),
    }),
  };
  static updateWatchlistValidate = {
    body: Joi.object({
      data: Joi.array().optional(),
    }),
  };
  static getWatchlistValidate = {
    body: Joi.object({
      fiat_type: Joi.string().required(),
      search: Joi.string().allow(null, "").optional(),
      page: Joi.number().optional(),
      limit: Joi.number().optional(),
      wallet_address: Joi.array().required(),
      is_fav: Joi.number().optional(),
      coin_family: Joi.array()
        .items(Joi.number().integer().required()
        ).required(),
    }),
  };
  static checkFiatBalance = {
    body: Joi.object({
      coin_family: Joi.number().required(),
      fiat_currency: Joi.string().required(),
      coin_symbol: Joi.string().required(),
    }),
  };
  static allBalances = {
    body: Joi.object({
      userIds: Joi.array().required(),
      fiatType: Joi.string().required(),
      fetchFrom: Joi.string().optional(),
    }),
  };

  static coinWalletDetail = {
    body: Joi.object({
      wallet_address: Joi.string().required(),
      coin_id: Joi.number().optional(),
      fiat_currency: Joi.string().allow(null, "").optional(),
      cmc_id: Joi.number().optional(),
    }),
  };
  static nativeCoinBalance = {
    body: Joi.object({
      coin_family: Joi.number().required(),
      wallet_address: Joi.string().required(),
    }),
  };
  static rpcBalance = {
    body: Joi.object({
      coin_id: Joi.number().required(),
      wallet_address: Joi.string().required(),
    }),
  };
  static nfts_from_moralis = {
    body: Joi.object({
      address_list: Joi.array()
        .items(
          Joi.object({
            coin_symbol: Joi.string().required(),
            wallet_address: Joi.string().required(),
            coin_family: Joi.number().integer().required(),
          })
        )
        .required(),
    }),
  };
  static nfts = {
    body: Joi.object({
      address_list: Joi.array()
        .items(
          Joi.object({
            coin_symbol: Joi.string().required(),
            wallet_address: Joi.string().required(),
            coin_family: Joi.number().integer().required(),
          })
        )
        .required(),
      cursor: Joi.string().optional(),
      limit: Joi.number().optional()
    }),
  };
  static order_update = {
    body: Joi.object({
      wallets: Joi.array()
        .items(
          Joi.object({
            coin_id: Joi.number().required(),
            wallet_address: Joi.string().required(),
            order: Joi.number().required(),
          })
        )
        .required(),
    }),
  };

  static version = {
    body: Joi.object({
      version: Joi.string().required(),
      platform: Joi.string().valid('android', 'ios').required(),
    }),
  };


}
