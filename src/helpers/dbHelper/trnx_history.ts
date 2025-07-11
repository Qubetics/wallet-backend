import commonHelper from "../common/common";
import * as Models from '../../models/model/index';


class TrnxHistoryQueries {

    // public async trnx_history_find_one(attr: any, where_clause: any) {
    //     try {
    //         let data: any = await Models.TrnxHistoryModel.findOne({
    //             attributes: attr,
    //             where: where_clause,
    //             raw: true
    //         })
    //         return data;
    //     } catch (err: any) {
    //         console.error("Error in trnx_history_find_one>>", err)
    //         await commonHelper.saveErrorLogs("trnx_history_find_one", err.message);
    //         throw err;
    //     }
    // }
    // public async trnx_history_find_all(attr: any, where_clause: any) {
    //     try {
    //         let data: any = await Models.TrnxHistoryModel.findAll({
    //             attributes: attr,
    //             where: where_clause,
    //         })
    //         return data;
    //     } catch (err: any) {
    //         console.error("Error in trnx_history_find_all>>", err)
    //         await commonHelper.saveErrorLogs("trnx_history_find_all", err.message);
    //         throw err;
    //     }
    // }
    // public async trnx_history_update(set: any, where_clause: any) {
    //     try {
    //         let data: any = await Models.TrnxHistoryModel.update(set, { where: where_clause })
    //         return data;
    //     } catch (err: any) {
    //         console.error("Error in trnx_history_update>>", err)
    //         await commonHelper.saveErrorLogs("trnx_history_update", err.message);
    //         throw err;
    //     }
    // }
    public async trnxHistoryCreate(obj: any) {
        try {
            let data: any = await Models.TrnxHistoryModel.create(obj)
            return data;
        } catch (err: any) {
            console.error("Error in trnxHistoryCreate>>", err)
            await commonHelper.saveErrorLogs("trnxHistoryCreate", err.message);
            throw err;
        }
    }
    // public async trnx_history_destroy(where_clause: any) {
    //     try {
    //         await Models.TrnxHistoryModel.destroy({ where: where_clause })
    //     } catch (err: any) {
    //         console.error("Error in trnx_history_destroy>>", err)
    //         await commonHelper.saveErrorLogs("trnx_history_destroy", err.message);
    //         throw err;
    //     }
    // }

}

const trnxHistoryQueries = new TrnxHistoryQueries();
export default trnxHistoryQueries;
