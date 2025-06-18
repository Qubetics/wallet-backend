import { Joi } from 'express-validation';

export default class walletValidator {

    static searchTokenValidate = {
        body: Joi.object({
            tokenAddress: Joi.string().required(),
            coinFamily: Joi.number().required()
        })
    }


}