import { Joi } from "express-validation";

export default class mpcWalletsValidator {
  static saveMpcWallets = {
    body: Joi.object({
      wallet_address: Joi.string().required(),
      btc_wallet_address: Joi.string().required(),
      tics_wallet_address: Joi.string().required(),
    }),
  };
}
