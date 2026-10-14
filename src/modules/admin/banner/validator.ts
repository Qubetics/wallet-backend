import { Joi } from "../../../middlewares/validate";

export default class BannerValidator {
  static createBanner = {
    body: Joi.object({
      link: Joi.string().required()
    }),
  };
  
  static updateBanner = {
    body: Joi.object({
      id: Joi.number().required(),
      status: Joi.string().valid('0', '1').required(),
    }),
  };
}
