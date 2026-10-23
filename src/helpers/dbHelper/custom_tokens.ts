import commonHelper from "../common/common.helpers";
import * as Models from '../../models/model/index';


class CustomTokensQueries {

    public async custom_token_find_one(attr: any, where_clause: any) {
        try {
            let data: any = await Models.CustomTokennModel.findOne({
                attributes: attr,
                where: where_clause,
                raw: true
            })
            return data;
        } catch (err: any) {
            console.error("Error in custom_token_find_one>>", err)
            await commonHelper.save_error_logs("custom_token_find_one", err.message);
            return null;
        }
    }
    public async custom_token_create(obj: any) {
        try {
            let data: any = await Models.CustomTokennModel.create(obj)
            return data;
        } catch (err: any) {
            console.error("Error in custom_token_create>>", err)
            await commonHelper.save_error_logs("custom_token_create", err.message);
            return null;
        }
    }

}

const custom_token_queries = new CustomTokensQueries();
export default custom_token_queries;
