import commonHelper from "../common/common.helpers";
import * as Models from '../../models/model/index';


class WalletQueries {

    public async wallet_find_one(attr: any, where_clause: any) {
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
            console.error("Error in wallet_find_one>>", err)
            await commonHelper.save_error_logs("wallet_find_one", err.message);
            throw err;
        }
    }
    public async wallet_find_one_with_order(attr: any, where_clause: any, order: any) {
        try {
            let data: any = await Models.WalletModel.findOne({
                attributes: attr,
                where: where_clause,
                order: order,
                raw: true
            })
            return data;
        } catch (err: any) {
            console.error("Error in wallet_find_one_with_order>>", err)
            await commonHelper.save_error_logs("wallet_find_one_with_order", err.message);
            return null;
        }
    }
    public async wallet_update(set: any, where_clause: any) {
        try {
            let data: any = await Models.WalletModel.update(set, { where: where_clause })
            return data;
        } catch (err: any) {
            console.error("Error in wallet_update>>", err)
            await commonHelper.save_error_logs("wallet_update", err.message);
            return null;
        }
    }
    public async wallet_create(obj: any) {
        try {
            let data: any = await Models.WalletModel.create(obj)
            return data;
        } catch (err: any) {
            console.error("Error in wallet_create>>", err)
            await commonHelper.save_error_logs("wallet_create", err.message);
            return null;
        }
    }
    public async walletCount(where: any) {
        try {
            let data: any = await Models.WalletModel.count({
                where: where,
                group: ['user_id']
            })
            return data;
        } catch (err: any) {
            console.error("Error in walletCount>>", err)
            await commonHelper.save_error_logs("walletCount", err.message);
            throw err;
        }
    }
    public async getUserWalletsWithCoins(user_id: number): Promise<any[]> {
        try {
            const data: any = await Models.WalletModel.findAll({
                attributes: ['wallet_id', 'wallet_address'],
                where: { user_id, status: 1 },
                include: [{
                    model: Models.CoinsModel,
                    attributes: ['coin_id', 'coin_family', 'coin_symbol', 'is_token', 'token_address', 'decimals', 'token_type', 'token_abi'],
                    required: true,
                }],
                raw: false,
            });
            return data;
        } catch (err: any) {
            console.error("Error in getUserWalletsWithCoins>>", err);
            await commonHelper.save_error_logs("getUserWalletsWithCoins", err.message);
            return [];
        }
    }


}

const wallet_queries = new WalletQueries();
export default wallet_queries;
