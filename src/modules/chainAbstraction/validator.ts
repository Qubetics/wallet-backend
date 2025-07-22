import { Joi } from "express-validation";

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
}
