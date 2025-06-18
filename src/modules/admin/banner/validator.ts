import { Joi } from 'express-validation';

export default class BannerValidator {
  static createBanner = {
    body: Joi.object({
      message: Joi.string().required(),
    }),
  }
}
