import commonHelper from "../common/common";
import * as Models from '../../models/model/index';


class CurrencyFiatQueries {

    public async currencyFiatFindAll(attr: any, where_clause: any) {
        try {
            let data: any = await Models.CurrencyFiatModel.findAll({
                attributes: attr,
                where: where_clause
            })
            return data;
        } catch (err: any) {
            console.error("Error in currencyFiatFindAll>>", err)
            await commonHelper.saveErrorLogs("currencyFiatFindAll", err.message);
            return null;
        }
    }

}

const currencyFiatQueries = new CurrencyFiatQueries();
export default currencyFiatQueries;
