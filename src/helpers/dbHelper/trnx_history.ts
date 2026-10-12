import commonHelper from "../common/common";
import * as Models from '../../models/model/index';


class TrnxHistoryQueries {

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

}

const trnxHistoryQueries = new TrnxHistoryQueries();
export default trnxHistoryQueries;
