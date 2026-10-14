import { Joi } from "../../../middlewares/validate";

export default class walletValidator {

    static searchTokenValidate = {
        body: Joi.object({
            tokenAddress: Joi.string().required(),
            coinFamily: Joi.number().required()
        })
    }


}