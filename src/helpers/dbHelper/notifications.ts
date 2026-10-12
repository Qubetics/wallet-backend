import commonHelper from "../common/common";
import * as Models from '../../models/model/index';


class NotificationQueries {


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
