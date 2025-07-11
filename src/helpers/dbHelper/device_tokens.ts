import commonHelper from "../common/common";
import * as Models from '../../models/model/index';


class DeviceTokensQueries {

    public async deviceTokenFindOne(attr: any, where_clause: any) {
        try {
            let data: any = await Models.DeviceTokenModel.findOne({
                attributes: attr,
                where: where_clause,
                raw: true
            })
            return data;
        } catch (err: any) {
            console.error("Error in deviceTokenFindOne>>", err)
            await commonHelper.saveErrorLogs("deviceTokenFindOne", err.message);
            throw err;
        }
    }
    // public async device_token_find_all(attr: any, where_clause: any, order: any) {
    //     try {
    //         let data: any = await Models.DeviceTokenModel.findAll({
    //             attributes: attr,
    //             where: where_clause,
    //             order: order
    //         })
    //         return data;
    //     } catch (err: any) {
    //         console.error("Error in device_token_find_all >>", err)
    //         await commonHelper.saveErrorLogs("device_token_find_all", err.message);
    //         throw err;
    //     }
    // }
    public async deviceTokenUpdate(set: any, where_clause: any) {
        try {
            let data: any = await Models.DeviceTokenModel.update(set, { where: where_clause })
            return data;
        } catch (err: any) {
            console.error("Error in deviceTokenUpdate>>", err)
            await commonHelper.saveErrorLogs("deviceTokenUpdate", err.message);
            throw err;
        }
    }
    public async deviceTokenCreate(obj: any) {
        try {
            let data: any = await Models.DeviceTokenModel.create(obj)
            return data;
        } catch (err: any) {
            console.error("Error in deviceTokenCreate>>", err)
            await commonHelper.saveErrorLogs("deviceTokenCreate", err.message);
            throw err;
        }
    }
    public async deviceTokenDestroy(where_clause: any) {
        try {
            await Models.DeviceTokenModel.destroy({ where: where_clause })
        } catch (err: any) {
            console.error("Error in deviceTokenDestroy>>", err)
            await commonHelper.saveErrorLogs("deviceTokenDestroy", err.message);
            throw err;
        }
    }

}

const deviceTokenQueries = new DeviceTokensQueries();
export default deviceTokenQueries;
