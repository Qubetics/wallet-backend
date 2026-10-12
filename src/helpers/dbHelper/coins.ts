import commonHelper from "../common/common";
import * as Models from '../../models/model/index';


class CoinQueries {

    public async coinFindOne(attr: any, where_clause: any) {
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
            console.error("Error in coinFindOne>>", err)
            await commonHelper.saveErrorLogs("coinFindOne", err.message);
            return null;
        }
    }
    public async coinFindAll(attr: any, where_clause: any) {
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
            console.error("Error in coinFindAll>>", err)
            await commonHelper.saveErrorLogs("coinFindAll", err.message);
            return null;
        }
    }

    public async coinCreate(obj: any) {
        try {
            const data: any = await Models.CoinsModel.create(obj);
            return data;
        } catch (err: any) {
            console.error("Error in coinCreate>>", err);

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
                    console.log("🚀 ~ CoinQueries ~ coinCreate ~ existing:", existing)

                    if (existing) {
                        return existing;
                    }
                } catch (findErr) {
                    console.error("Error finding existing coin>>", findErr);
                    await commonHelper.saveErrorLogs("coinCreate", (findErr as any).message);
                }
            }

            await commonHelper.saveErrorLogs("coinCreate", err.message);
            return null;
        }
    }

    public async coinUpdate(set: any, where_clause: any) {
        try {
            let data: any = await Models.CoinsModel.update(set, { where: where_clause })
            return data;
        } catch (err: any) {
            console.error("Error in coinUpdate>>", err)
            await commonHelper.saveErrorLogs("coinUpdate", err.message);
            return null;
        }
    }


}

const coinQueries = new CoinQueries();
export default coinQueries;
