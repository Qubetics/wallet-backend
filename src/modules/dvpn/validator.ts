import { Joi } from "express-validation";

export default class dvpnValidator {
  static sessionHistory = {
    body: Joi.object({
      limit: Joi.number().optional(),
      page: Joi.number().optional(),
    }),
  };

  static uploadBuild = {
    files: Joi.object({
      build: Joi.any().required().messages({
        "any.required": "build is required",
        "any.empty": "build is required"
      }),
    })
  };

  static getBuildList = {
    query: Joi.object({
      platform: Joi.string().valid('linux', 'windows').optional(),
      extension: Joi.string().valid('deb', 'exe').optional(),
      limit: Joi.number().optional(),
      page: Joi.number().optional(),
    }),
  };

  static downloadBuild = {
    params: Joi.object({
      buildId: Joi.string().required(),
      platform: Joi.string().valid('linux', 'windows').required(),
    }),
  };
  static getLatestBuild = {
    params: Joi.object({
      platform: Joi.string().valid('linux', 'windows').required(),
    }),
  };
}
