import commonHelper from "../common/common";
import * as Models from '../../models/model/index';
// import { Op } from "sequelize";


class NotificationQueries {

    // public async notification_find_one(attr: any, where_clause: any) {
    //     try {
    //         let data: any = await Models.NotificationModel.findOne({
    //             attributes: attr,
    //             where: where_clause,
    //             raw: true
    //         })
    //         return data;
    //     } catch (err: any) {
    //         console.error("Error in notification_find_one>>", err)
    //         await commonHelper.saveErrorLogs("notification_find_one", err.message);
    //         throw err;
    //     }
    // }
    // public async notification_update(set: any, where_clause: any) {
    //     try {
    //         let data: any = await Models.NotificationModel.update(set, { where: where_clause })
    //         return data;
    //     } catch (err: any) {
    //         console.error("Error in notification_update>>", err)
    //         await commonHelper.saveErrorLogs("notification_update", err.message);
    //         throw err;
    //     }
    // }
    // public async notification_create(obj: any) {
    //     try {
    //         let data: any = await Models.NotificationModel.create(obj)
    //         return data;
    //     } catch (err: any) {
    //         console.error("Error in notification_create>>", err)
    //         await commonHelper.saveErrorLogs("notification_create", err.message);
    //         throw err;
    //     }
    // }

    // Joints
    public async notificationsJointFindAllCountAll(attr1: any, attr2: any, attr3: any, where1: any, where2: any, per_page: number, offset: number) {
        try {
            const data: any = await Models.NotificationModel.findAndCountAll({
                attributes: attr1,
                include: [{
                    model: Models.CoinsModel,
                    attributes: attr2,
                    as: "coin_data",
                    where: where1,
                    required: true
                },
                    // {
                    //     model: Models.CurrencyFiatModel,
                    //     attributes: attr3,
                    //     as: "currency_data",
                    //     required: false
                    // }
                ],
                where: where2,
                limit: per_page,
                offset: offset,
                order: [['created_at', 'DESC']],
            });
            return data;
        } catch (err: any) {
            console.error("Error in notificationsJointFindAllCountAll>>", err)
            await commonHelper.saveErrorLogs("notificationsJointFindAllCountAll", err.message);
            throw err;
        }
    }

}

const notificationQueries = new NotificationQueries();
export default notificationQueries;
