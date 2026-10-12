import commonHelper from "../common/common";
import * as Models from '../../models/model/index';


class WalletQueries {

    public async walletFindOne(attr: any, where_clause: any) {
        try {
            let data: any
            if (attr.length > 0) {
                data = await Models.WalletModel.findOne({
                    attributes: attr,
                    where: where_clause,
                    raw: true
                })
            } else {
                data = await Models.WalletModel.findOne({
                    where: where_clause,
                    raw: true
                })
            }
            return data;
        } catch (err: any) {
            console.error("Error in walletFindOne>>", err)
            await commonHelper.saveErrorLogs("walletFindOne", err.message);
            throw err;
        }
    }

    public async walletFindOneWithOrder(attr: any, where_clause: any, order: any) {
        try {
            const data: any = await Models.WalletModel.findOne({
                attributes: attr,
                where: where_clause,
                order: order,
                raw: true
            })
            return data;
        } catch (err: any) {
            console.error("Error in walletFindOneWithOrder>>", err)
            await commonHelper.saveErrorLogs("walletFindOneWithOrder", err.message);
            return null;
        }
    }

    public async walletUpdate(set: any, where_clause: any) {
        try {
            const data: any = await Models.WalletModel.update(set, { where: where_clause })
            return data;
        } catch (err: any) {
            console.error("Error in walletUpdate>>", err)
            await commonHelper.saveErrorLogs("walletUpdate", err.message);
            return null;
        }
    }

    public async walletCreate(obj: any) {
        try {
            const data: any = await Models.WalletModel.create(obj)
            return data;
        } catch (err: any) {
            console.error("Error in walletCreate>>", err)
            await commonHelper.saveErrorLogs("walletCreate", err.message);
            return null;
        }
    }

    public async walletCount(where: any) {
        try {
            const data: any = await Models.WalletModel.count({
                where: where,
                group: ['user_id']
            })
            return data;
        } catch (err: any) {
            console.error("Error in walletCount>>", err)
            await commonHelper.saveErrorLogs("walletCount", err.message);
            throw err;
        }
    }


}

const walletQueries = new WalletQueries();
export default walletQueries;
