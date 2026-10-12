import commonHelper from "../common/common";
import * as Models from '../../models/model/index';


class ResentGraphDataQueries {
    public async resentGraphDataFindOne(attr: any, where_clause: any) {
        try {
            const data: any = await Models.ResetGraphDataModel.findOne({
                attributes: attr,
                where: where_clause,
                raw: true
            })
            return data;
        } catch (err: any) {
            console.error("Error in resentGraphDataFindOne>>", err)
            await commonHelper.saveErrorLogs("resentGraphDataFindOne", err.message);
            throw err;
        }
    }
    public async resent_graph_data_create(obj: any) {
        try {
            const data: any = await Models.ResetGraphDataModel.create(obj)
            return data;
        } catch (err: any) {
            console.error("Error in resent_graph_data_create>>", err)
            await commonHelper.saveErrorLogs("resent_graph_data_create", err.message);
            throw err;
        }
    }


}

const resentGraphDataQueries = new ResentGraphDataQueries();
export default resentGraphDataQueries;
