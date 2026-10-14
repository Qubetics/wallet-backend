import { Joi } from "../../../middlewares/validate";

export default class commissionValidator {

    static commissionDetails = {
        body: Joi.object({
            type: Joi.number().required(),
            value: Joi.string().required()
        })
    }


}