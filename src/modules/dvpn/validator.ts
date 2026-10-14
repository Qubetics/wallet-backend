import { Joi } from "../../middlewares/validate";

export default class dvpnValidator {


  static getBuildList = {
    query: Joi.object({
      platform: Joi.string().valid('linux', 'windows', 'macos').optional(),
      extension: Joi.string().valid('deb', 'exe').optional(),
      limit: Joi.number().optional(),
      page: Joi.number().optional(),
    }),
  };

  static downloadBuild = {
    params: Joi.object({
      buildId: Joi.string().required(),
      platform: Joi.string().valid('linux', 'windows', 'macos').required(),
    }),
  };
  static getLatestBuild = {
    params: Joi.object({
      platform: Joi.string().valid('linux', 'windows', 'macos').required(),
    }),
  };
}
