import { Joi } from 'express-validation';

export default class tokenValidate {

    static toogleSwapValidate = {
        body: Joi.object({
            id: Joi.number().required(),
            status: Joi.number().valid(0, 1).required()
        })
    }   

    static toogleStatusValidate = {
        body: Joi.object({
            id: Joi.number().required(),
            status: Joi.number().valid(0, 1).required()
        })
    }

    static addTokenValidate = {
        body: Joi.object({
            coin_family: Joi.number().required(),
            token_type: Joi.string().required(),
            token_address: Joi.string().required(),
            name: Joi.string().required(),
            symbol: Joi.string().required(),
            decimals: Joi.string().required()
        })
    }

    static updateTokenLogoValidate = {
        body: Joi.object({
            id: Joi.number().required()
        })
    }
}