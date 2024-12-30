import { Joi } from 'express-validation';

export default class onOffRampValidator {
    static mercuryoInitiateTx = {
        body: Joi.object({
            ramp_type: Joi.string().required(),
            coin_id: Joi.number().required(),
            coin_family: Joi.number().required(),
            tx_type: Joi.string().required(),
            wallet_address: Joi.string().required(),
            amount: Joi.number().required(),
            fiat_price: Joi.number().required(),
            fiat_type: Joi.string().required(),
            merchant_id: Joi.string().required(),
            order_id: Joi.string().allow('').optional()
        })
    }
}