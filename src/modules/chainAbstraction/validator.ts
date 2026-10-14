import { Joi } from "../../middlewares/validate";

export default class chainAbstractionValidator {
  static getCoinList = {
    body: Joi.object({
      coinFamilies: Joi.array()
        .items(Joi.number().integer().required()
        ).required(),
      addrsList: Joi.array()
        .items(Joi.string().required()
        ).required(),
    }),
  };
  static changeIntentStatus = {
    body: Joi.object({
      hash: Joi.string().required(),
      status: Joi.string().valid("confirmed", "failed", "pending").required(),
    }),
  };
}
