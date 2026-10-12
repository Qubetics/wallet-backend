import commonHelper from "../common/common.helpers";
import * as Models from '../../models/model/index';


class ResentGraphDataQueries {
    public async resent_graph_data_find_one(attr: any, where_clause: any) {
        try {
            let data: any = await Models.ResetGraphDataModel.findOne({
                attributes: attr,
                where: where_clause,
                raw: true
            })
            return data;
        } catch (err: any) {
            console.error("Error in resent_graph_data_find_one>>", err)
            await commonHelper.save_error_logs("resent_graph_data_find_one", err.message);
            throw err;
        }
    }
    public async resent_graph_data_create(obj: any) {
        try {
            let data: any = await Models.ResetGraphDataModel.create(obj)
            return data;
        } catch (err: any) {
            console.error("Error in resent_graph_data_create>>", err)
            await commonHelper.save_error_logs("resent_graph_data_create", err.message);
            throw err;
        }
    }


}

const resent_graph_data_queries = new ResentGraphDataQueries();
export default resent_graph_data_queries;
