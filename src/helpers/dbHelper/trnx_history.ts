import commonHelper from "../common/common.helpers";
import * as Models from '../../models/model/index';


class TrnxHistoryQueries {

    public async trnx_history_create(obj: any) {
        try {
            let data: any = await Models.TrnxHistoryModel.create(obj)
            return data;
        } catch (err: any) {
            console.error("Error in trnx_history_create>>", err)
            await commonHelper.save_error_logs("trnx_history_create", err.message);
            throw err;
        }
    }

}

const trnx_history_queries = new TrnxHistoryQueries();
export default trnx_history_queries;
