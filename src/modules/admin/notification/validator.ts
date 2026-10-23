import { Joi } from 'express-validation';

export default class notificationValidator {

    static createNotificationValidate = {
        body: Joi.object({
            title: Joi.string().required(),
            message: Joi.string().required()
        })
    }

    static updateNotificationValidate = {
        body: Joi.object({
            id: Joi.number().required(),
            title: Joi.string().required(),
            message: Joi.string().required()
        })
    }


}