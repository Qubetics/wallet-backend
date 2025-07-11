import commonHelper from "../common/common";
import * as Models from '../../models/model/index';


class AddressBookQueries {

    public async addressBooksFindOne(attr: any, where_clause: any) {
        try {
            let data: any = await Models.AddressBookModel.findOne({
                attributes: attr,
                where: where_clause,
                raw: true
            })
            return data;
        } catch (err: any) {
            console.error("Error in addressBooksFindOne>>", err)
            await commonHelper.saveErrorLogs("addressBooksFindOne", err.message);
            throw err;
        }
    }

    public async addressBooksFindAll(attr: any, where_clause: any) {
        try {
            let data: any = await Models.AddressBookModel.findAll({
                attributes: attr,
                where: where_clause,
            })
            return data;
        } catch (err: any) {
            console.error("Error in addressBooksFindAll>>", err)
            await commonHelper.saveErrorLogs("addressBooksFindAll", err.message);
            throw err;
        }
    }

    public async addressBookCreate(obj: any) {
        try {
            let data: any = await Models.AddressBookModel.create(obj)
            return data;
        } catch (err: any) {
            console.error("Error in addressBookCreate>>", err)
            await commonHelper.saveErrorLogs("addressBookCreate", err.message);
            throw err;
        }
    }

    public async addressBookCount(where_clause: any) {
        try {
            let data: any = await Models.AddressBookModel.count({
                where: where_clause
            })
            return data;
        } catch (err: any) {
            console.error("Error in addressBookCount>>", err)
            await commonHelper.saveErrorLogs("addressBookCount", err.message);
            throw err;
        }
    }

    public async addressBookDestroy(where_clause: any) {
        try {
            await Models.AddressBookModel.destroy({ where: where_clause })
        } catch (err: any) {
            console.error("Error in addressBookDestroy>>", err)
            await commonHelper.saveErrorLogs("addressBookDestroy", err.message);
            throw err;
        }
    }

    // Joint
    public async addressBookWithAddressBookWalletCoinsJoint(attr1: any, attr2: any, where_clause2: any, attr3: any, where_clause3: any, where_clause1: any, per_page: any, offset: any, set_order_by: any, set_order_type: any) {
        try {
            let data: any = await Models.AddressBookModel.findAll({
                attributes: attr1,
                include: [{
                    model: Models.AddressBookWalletsModel,
                    attributes: attr2,
                    as: "wallet_data",
                    where: where_clause2,
                    include: [{
                        model: Models.CoinsModel,
                        as: "coin_data",
                        attributes: attr3,
                        where: where_clause3,
                        required: false,
                    }]
                }],
                where: where_clause1,
                limit: per_page,
                offset: offset,
                order: [[set_order_by, set_order_type]],
            })
            return data;
        } catch (err: any) {
            console.error("Error in addressBookWithAddressBookWalletCoinsJoint>>", err)
            await commonHelper.saveErrorLogs("addressBookWithAddressBookWalletCoinsJoint", err.message);
            throw err;
        }
    }
}

const addressBookQueries = new AddressBookQueries();
export default addressBookQueries;
