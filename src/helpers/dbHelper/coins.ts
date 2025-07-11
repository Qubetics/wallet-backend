import commonHelper from "../common/common";
import * as Models from '../../models/model/index';
// import { Sequelize } from "sequelize";


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
    // public async distinct_coin_data(where_clause: any) {
    //     try {
    //         let data: any = await Models.CoinsModel.findAll({
    //             attributes: ["cmc_id"],
    //             where: where_clause,
    //             group: ["cmc_id"]
    //         })
    //         return data;
    //     } catch (err: any) {
    //         console.error("Error in distinct_coin_data>>", err)
    //         await commonHelper.saveErrorLogs("distinct_coin_data", err.message);
    //         throw err;
    //     }
    // }
    // public async coinsJoinCoinPriceInFiat(attr1: any, attr2: any, where1: any, where2: any) {
    //     try {
    //         let data: any = await Models.CoinsModel.findAll({
    //             attributes: attr1,
    //             where: where1,
    //             include: [{
    //                 model: Models.CoinPriceInFiatModel,
    //                 as: "fiat_price_data",
    //                 attributes: attr2,
    //                 where: where2,
    //                 required: false
    //             }]
    //         })
    //         return data;
    //     } catch (err: any) {
    //         console.error("Error in coinsJoinCoinPriceInFiat>>", err)
    //         await commonHelper.saveErrorLogs("coinsJoinCoinPriceInFiat", err.message);
    //         return null;
    //     }
    // }
    // public async coinsJoinCoinPriceInFiatJoinChangellyJoinWallet(
    //     attr1: any, where1: any, attr2: any, where2: any, attr3: any, where3: any, attr4: any, where4: any) {
    //     try {
    //         let data: any = await Models.CoinsModel.findAll({
    //             attributes: attr1,
    //             where: where1,
    //             include: [{
    //                 model: Models.CoinPriceInFiatModel,
    //                 as: "fiat_price_data",
    //                 attributes: attr2,
    //                 where: where2,
    //                 required: false
    //             }, {
    //                 model: Models.WalletModel,
    //                 attributes: attr4,
    //                 where: where4,
    //                 required: false,
    //                 as: "wallet_data",
    //             }, {
    //                 model: Models.CoinsModel,
    //                 attributes: ['coin_id', 'coin_symbol', 'is_token'],
    //                 where: { is_token: 0 },
    //                 required: true,
    //                 as: 'native_coins_data',
    //                 include: [{
    //                     model: Models.CoinPriceInFiatModel,
    //                     as: "fiat_price_data",
    //                     attributes: attr2,
    //                     where: where2,
    //                     required: false
    //                 }]
    //             }],
    //             order: [
    //                 [
    //                     Sequelize.fn('FIELD',
    //                         Sequelize.col('coin_symbol'),
    //                         'bnb',
    //                         'eth',
    //                         'btc',
    //                         'trx'
    //                     ),
    //                     'ASC'
    //                 ]
    //             ],
    //             // logging: console.log
    //         })
    //         return data;
    //     } catch (err: any) {
    //         console.error("Error in coinsJoinCoinPriceInFiatJoinChangellyJoinWallet>>", err)
    //         await commonHelper.saveErrorLogs("coinsJoinCoinPriceInFiatJoinChangellyJoinWallet", err.message);
    //         return null;
    //     }
    // }
    // public async coinsJoinCoinPriceInFiatJoinChangellyOnOffRampJoinWallet(
    //     attr1: any, where1: any, attr2: any, where2: any, attr3: any, where3: any, attr4: any, where4: any) {
    //     try {
    //         let data: any = await Models.CoinsModel.findAll({
    //             attributes: attr1,
    //             where: where1,
    //             include: [{
    //                 model: Models.CoinPriceInFiatModel,
    //                 as: "fiat_price_data",
    //                 attributes: attr2,
    //                 where: where2,
    //                 required: false
    //             }, {
    //                 model: Models.WalletModel,
    //                 attributes: attr4,
    //                 where: where4,
    //                 required: false,
    //                 as: "wallet_data",
    //             }],
    //             order: [
    //                 [
    //                     Sequelize.fn('FIELD',
    //                         Sequelize.col('coin_symbol'),
    //                         'bnb',
    //                         'eth',
    //                         'btc',
    //                         'trx'
    //                     ),
    //                     'ASC'
    //                 ]
    //             ],
    //             // logging: console.log
    //         })
    //         return data;
    //     } catch (err: any) {
    //         console.error("Error in coinsJoinCoinPriceInFiatJoinChangellyOnOffRampJoinWallet>>", err)
    //         await commonHelper.saveErrorLogs("coinsJoinCoinPriceInFiatJoinChangellyOnOffRampJoinWallet", err.message);
    //         return null;
    //     }
    // }


    // public async coinsJoinCoinPriceInFiatJoinChangellyOnOffRampJoinWallet2(
    //     attr1: any, where1: any, attr2: any, where2: any, attr3: any, where3: any, attr4: any, where4: any) {
    //     try {
    //         let data: any = await Models.CoinsModel.findAll({
    //             attributes: attr1,
    //             where: where1,
    //             include: [{
    //                 model: Models.CoinPriceInFiatModel,
    //                 as: "fiat_price_data",
    //                 attributes: attr2,
    //                 where: where2,
    //                 required: false
    //             }, {
    //                 model: Models.WalletModel,
    //                 attributes: attr4,
    //                 where: where4,
    //                 required: true,
    //                 as: "wallet_data",
    //             }],
    //             order: [
    //                 [
    //                     Sequelize.fn('FIELD',
    //                         Sequelize.col('coin_symbol'),
    //                         'bnb',
    //                         'eth',
    //                         'btc',
    //                         'trx'
    //                     ),
    //                     'ASC'
    //                 ]
    //             ],
    //             // logging: console.log
    //         })
    //         return data;
    //     } catch (err: any) {
    //         console.error("Error in coinsJoinCoinPriceInFiatJoinChangellyOnOffRampJoinWallet>>", err)
    //         await commonHelper.saveErrorLogs("coinsJoinCoinPriceInFiatJoinChangellyOnOffRampJoinWallet", err.message);
    //         return null;
    //     }
    // }
}

const coinQueries = new CoinQueries();
export default coinQueries;
