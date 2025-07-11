import commonHelper from "../common/common";
import * as Models from '../../models/model/index';


class GasPricesQueries {

    public async gasPricesFindOne(attr: any, where_clause: any) {
        try {
            const data: any = await Models.GasPriceModel.findOne({
                attributes: attr,
                where: where_clause,
                raw: true
            })
            return data;
        } catch (err: any) {
            console.error("Error in gasPricesFindOne>>", err)
            await commonHelper.saveErrorLogs("gasPricesFindOne", err.message);
            throw err;
        }
    }

}

const gasPricesQueries = new GasPricesQueries();
export default gasPricesQueries;
