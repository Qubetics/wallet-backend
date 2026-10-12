import commonHelper from "../common/common.helpers";
import * as Models from '../../models/model/index';


class NotificationQueries {


    // Joints
    public async notifications_joint_find_all_count_all(attr1: any, attr2: any, attr3: any, where1: any, where2: any, per_page: number, offset: number) {
        try {
            const data: any = await Models.NotificationModel.findAndCountAll({
                attributes: attr1,
                include: [{
                    model: Models.CoinsModel,
                    attributes: attr2,
                    as: "coin_data",
                    where: where1,
                    required: true
                }, {
                    model: Models.CurrencyFiatModel,
                    attributes: attr3,
                    as: "currency_data",
                    required: false
                }],
                where: where2,
                limit: per_page,
                offset: offset,
                order: [['created_at', 'DESC']],
            });
            return data;
        } catch (err: any) {
            console.error("Error in notifications_joint_find_all_count_all>>", err)
            await commonHelper.save_error_logs("notifications_joint_find_all_count_all", err.message);
            throw err;
        }
    }

}

const notification_queries = new NotificationQueries();
export default notification_queries;
