    import { Joi } from 'express-validation';

    export default class tics_validator {
        static sendNativeValidate = {
            body: Joi.object({
                tx_fee: Joi.string().required(),                
                gas_estimate: Joi.string().required(),          
                block: Joi.alternatives().try(Joi.string(), Joi.number()).required(), 
                txid: Joi.string().required(),                  
                amount: Joi.string().required(),                
                from: Joi.string().required(),                  
                to: Joi.string().required(),                    
                tx_type: Joi.string().required(), 
            })
        }
}