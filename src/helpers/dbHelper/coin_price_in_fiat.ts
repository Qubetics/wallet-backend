import * as Models from '../../models/model/index';
import commonHelper from '../common/common';

class CoinPriceInFiatQueries {

    public async coinPriceInFiatCreate(obj: any) {
        try {
            let data: any = await Models.CoinPriceInFiatModel.create(obj)
            return data;
        } catch (err: any) {
            console.error("Error in coinPriceInFiatCreate>>", err)
            await commonHelper.saveErrorLogs("coinPriceInFiatCreate", err.message);
            return null;
        }
    }
    public async coinPriceInFiatFindOne(attr: any, where_clause: any) {
        try {
            let data: any = await Models.CoinPriceInFiatModel.findOne({
                attributes: attr,
                where: where_clause,
                raw: true
            })
            return data;
        } catch (err: any) {
            console.error("Error in coinPriceInFiatFindOne>>", err)
            await commonHelper.saveErrorLogs("coinPriceInFiatFindOne", err.message);
            return null;
        }
    }

    public async coinPriceInFiatGraphFindOne(attr: any, where_clause: any) {
        try {
            let data: any = await Models.CoinPriceInFiatGraphModel.findOne({
                attributes: attr,
                where: where_clause,
                raw: true
            })
            return data;
        } catch (err: any) {
            console.error("Error in coinPriceInFiatGraphFindOne>>", err)
            await commonHelper.saveErrorLogs("coinPriceInFiatGraphFindOne", err.message);
            throw err;
        }
    }

    public async coinPriceInFiatGraphCreate(obj: any) {
        try {
            let data: any = await Models.CoinPriceInFiatGraphModel.create(obj)
            return data;
        } catch (err: any) {
            console.error("Error in coinPriceInFiatGraphCreate>>", err)
            await commonHelper.saveErrorLogs("coinPriceInFiatGraphCreate", err.message);
            return null;
        }
    }

}

const coinPriceInFiatQueries = new CoinPriceInFiatQueries();
export default coinPriceInFiatQueries;
