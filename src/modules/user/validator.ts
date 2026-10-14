import { Joi } from "../../middlewares/validate";

export default class user_validator {
    static createWalletValidate = {
        body: Joi.object({
            wallet_address: Joi.string().required(),
            device_token: Joi.string().required(),
            wallet_name: Joi.string().required(),
            addressList: Joi.array()
                .items(
                    Joi.object({
                        symbol: Joi.string().required(),
                        address: Joi.string().required(),
                        coin_family: Joi.number().integer().required(),
                    })
                )
                .required(),
            referral_code: Joi.string().allow(null, '').optional(),
            device_id: Joi.string().allow(null, '').optional(),
            fiat_currency: Joi.string().allow(null, '').optional(),
            lang: Joi.string().allow(null, '').optional(),
            signature: Joi.string().optional(),
            message: Joi.string().allow(null, "").optional(),
        })
    }
    static createWalletNativeValidate = {
        body: Joi.object({
            evmWalletAddress: Joi.string().required(),
            nativeWalletAddress: Joi.string().required(),
        })
    }
    static logoutValidate = {
        body: Joi.object({
            deviceId: Joi.string().required(),
            userIds: Joi.array()
            .items(Joi.number().integer().required()
            ).required(),
            type: Joi.string().required()
        })
    }
    static notificationListValidate = {
        body: Joi.object({
            limit: Joi.number().optional(),
            page: Joi.number().optional(),
            addrsListKeys: Joi.array()
            .items(Joi.string().required()
            ).required(),
            coin_family: Joi.array()
            .items(Joi.number().integer().required()
            ).required(),
        })
    }
    static addAddressBookValidate = {
        body: Joi.object({
            contact_name: Joi.string().required(),
            wallet_address: Joi.string().required(),
            address: Joi.string().required(),
            coin_family: Joi.number().required(),
            wallet_name: Joi.string().allow(null, '').optional(),
        })
    }
    static pageListValidate = {
        body: Joi.object({
            limit: Joi.number().required(),
            page: Joi.number().required(),
            address: Joi.array()
            .items(Joi.string().required()
            ).required(),
            coin_family: Joi.array()
            .items(Joi.number().integer().optional()
            ).optional(),
            search: Joi.string().allow(null, '').optional(),
        })
    }
    static getWalletName = {
        body: Joi.object({
            contact_name: Joi.string().required(),
            coin_family: Joi.number().optional(),
            wallet_name: Joi.string().allow(null, '').optional(),
            address: Joi.string().required(),
        })
    }
    static search = {
        body: Joi.object({
            search: Joi.string().allow(null, '').optional(),
        })
    }
    static deleteAddressBookWalletAddress = {
        body: Joi.object({
            id: Joi.number().required(),
            address_book_id: Joi.number().required()
        })
    }
    static deleteAddressBook = {
        body: Joi.object({
            id: Joi.number().required(),
        })
    }
    static announcementViewStatus = {
        body: Joi.object({
            key: Joi.number().required(),
            addrsListKeys: Joi.array()
            .items(Joi.string().required()
            ).required(),
        })
    }
}