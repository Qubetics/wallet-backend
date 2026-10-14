import { Joi } from "../../middlewares/validate";

export default class mpcWalletsValidator {
  static saveMpcWallets = {
    body: Joi.object({
      wallet_address: Joi.string().required(),
      btc_wallet_address: Joi.string().required(),
      tics_wallet_address: Joi.string().required(),
    }),
  };
 

  static getMpcWallets = {
    body: Joi.object({
      wallet_address: Joi.string().required(),
      coin_family: Joi.number().required(),
    }),
  };

}
