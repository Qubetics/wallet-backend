import { Joi } from 'express-validation';

export default class validator {

    static coinData = {
        body: Joi.object({
            page: Joi.number().optional(),
            per_page: Joi.number().optional(),
            search: Joi.string().optional(),
        })
    }
    static getBaseInfo = {
        body: Joi.object({
            depositCoinCode: Joi.string().required(),
            receiveCoinCode: Joi.string().required(),
        })
    }

    static accountExchange = {
        body: Joi.object({
            equipmentNo: Joi.string().required(),
            sourceType: Joi.string().required(),
            depositCoinCode: Joi.string().required(),
            receiveCoinCode: Joi.string().required(),
            depositCoinAmt: Joi.number().required(),
            receiveCoinAmt: Joi.number().required(),
            destinationAddr: Joi.string().required(),
            refundAddr: Joi.string().required(),
        })
    }
}
