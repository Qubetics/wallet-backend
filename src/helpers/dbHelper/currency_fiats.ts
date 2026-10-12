import commonHelper from "../common/common.helpers";
import * as Models from '../../models/model/index';


class CurrencyFiatQueries {

    public async currency_fiat_find_all(attr: any, where_clause: any) {
        try {
            let data: any = await Models.CurrencyFiatModel.findAll({
                attributes: attr,
                where: where_clause
            })
            return data;
        } catch (err: any) {
            console.error("Error in currency_fiat_find_all>>", err)
            await commonHelper.save_error_logs("currency_fiat_find_all", err.message);
            return null;
        }
    }

}

const currency_fiat_queries = new CurrencyFiatQueries();
export default currency_fiat_queries;
