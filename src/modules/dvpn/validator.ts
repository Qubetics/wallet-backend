import { Joi } from "express-validation";

export default class dvpnPlansValidator {
  static sessionHistory = {
    body: Joi.object({
        limit: Joi.number().optional(),
        page: Joi.number().optional(),
    }),
  };
}
