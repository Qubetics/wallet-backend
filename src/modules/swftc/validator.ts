import { Joi } from "../../middlewares/validate";

export default class validator {

    static queryCoinList = {
        body: Joi.object({
            addresses: Joi.array()
            .items(Joi.string().required()
            ).required(),
            coin_family: Joi.number().optional(),
            is_wallet: Joi.boolean().optional(),
            fiat_type: Joi.string().optional(),
            page: Joi.number().optional(),
            per_page: Joi.number().optional(),
            search: Joi.string().optional(),
        })
    }
    static queryCoinData = {
        body: Joi.object({
            addresses: Joi.array()
            .items(Joi.string().required()
            ).required(),
            id: Joi.array()
            .items(Joi.number().integer().required()
            ).required(),
            fiat_type: Joi.string().required(),
            is_wallet: Joi.boolean().optional()
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
