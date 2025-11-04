import { Joi } from "express-validation";

export default class dvpnPlansValidator {
  static addDvpnPlan = {
    body: Joi.object({
        wallet_address: Joi.string().required(),
        plan_id: Joi.string().required(),
        plan_amount: Joi.number().required(),
        provider_id: Joi.string().required(),
        country_name: Joi.string().required(),
        country_code: Joi.string().required(),
        country_flag: Joi.string().required(),
        server_location: Joi.string().required(),
    }),
  };
}
