import commonHelper from "../common/common.helpers";
import * as Models from '../../models/model/index';


class CoinQueries {

    public async coin_find_one(attr: any, where_clause: any) {
        try {
            let data: any;
            if (attr.length > 0) {
                data = await Models.CoinsModel.findOne({
                    attributes: attr,
                    where: where_clause,
                    raw: true
                })
            } else {
                console.log("no attr")
                data = await Models.CoinsModel.findOne({
                    where: where_clause,
                    raw: true
                })
            }
            return data;
        } catch (err: any) {
            console.error("Error in coin_find_one>>", err)
            await commonHelper.save_error_logs("coin_find_one", err.message);
            return null;
        }
    }
    public async coin_find_all(attr: any, where_clause: any) {
        try {
            let data: any;
            if (attr.length > 0) {
                data = await Models.CoinsModel.findAll({
                    attributes: attr,
                    where: where_clause,
                })
            } else {
                console.log("no attr")
                data = await Models.CoinsModel.findAll({
                    where: where_clause,
                })
            }
            return data;
        } catch (err: any) {
            console.error("Error in coin_find_all>>", err)
            await commonHelper.save_error_logs("coin_find_all", err.message);
            return null;
        }
    }
    public async coin_create(obj: any) {
        try {
            let data: any = await Models.CoinsModel.create(obj);
            return data;
        } catch (err: any) {
            console.error("Error in coin_create>>", err);
    
            const uniqueConstraint =
                err.name === 'SequelizeUniqueConstraintError' &&
                err.errors?.some(
                    (e: any) => e.path === 'unique_coinfamily_tokenaddress' || e.message?.includes('unique_coinfamily_tokenaddress')
                );
    
            if (uniqueConstraint) {
                const tokenAddress = obj.token_address;
                const coinFamily = obj.coin_family;
    
                try {
                    const existing = await Models.CoinsModel.findOne({
                        where: {
                            token_address: tokenAddress,
                            coin_family: coinFamily,
                        },
                        raw: true
                    });
                    console.log("🚀 ~ CoinQueries ~ coin_create ~ existing:", existing)
    
                    if (existing) {
                        return existing;
                    }
                } catch (findErr) {
                    console.error("Error finding existing coin>>", findErr);
                    await commonHelper.save_error_logs("coin_create_find_existing", (findErr as any).message);
                }
            }
    
            await commonHelper.save_error_logs("coin_create", err.message);
            return null;
        }
    }
    public async coin_update(set: any, where_clause: any) {
        try {
            let data: any = await Models.CoinsModel.update(set, { where: where_clause })
            return data;
        } catch (err: any) {
            console.error("Error in coin_update>>", err)
            await commonHelper.save_error_logs("coin_update", err.message);
            return null;
        }
    }


}

const coin_queries = new CoinQueries();
export default coin_queries;
