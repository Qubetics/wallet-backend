import commonHelper from "../common/common";
import * as Models from '../../models/model/index';


class CustomTokensQueries {

    public async customTokenFindOne(attr: any, where_clause: any) {
        try {
            let data: any = await Models.CustomTokennModel.findOne({
                attributes: attr,
                where: where_clause,
                raw: true
            })
            return data;
        } catch (err: any) {
            console.error("Error in customTokenFindOne>>", err)
            await commonHelper.saveErrorLogs("customTokenFindOne", err.message);
            return null;
        }
    }
    public async customTokenCreate(obj: any) {
        try {
            let data: any = await Models.CustomTokennModel.create(obj)
            return data;
        } catch (err: any) {
            console.error("Error in customTokenCreate>>", err)
            await commonHelper.saveErrorLogs("customTokenCreate", err.message);
            return null;
        }
    }

}

const customTokenQueries = new CustomTokensQueries();
export default customTokenQueries;
