import commonHelper from "../common/common.helpers";
import * as Models from '../../models/model/index';
import { Sequelize } from "sequelize";


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
    public async distinct_coin_data(where_clause: any) {
        try {
            let data: any = await Models.CoinsModel.findAll({
                attributes: ["cmc_id"],
                where: where_clause,
                group: ["cmc_id"]
            })
            return data;
        } catch (err: any) {
            console.error("Error in distinct_coin_data>>", err)
            await commonHelper.save_error_logs("distinct_coin_data", err.message);
            throw err;
        }
    }
    public async coinsJoinCoinPriceInFiat(attr1: any, attr2: any, where1: any, where2: any) {
        try {
            let data: any = await Models.CoinsModel.findAll({
                attributes: attr1,
                where: where1,
                include: [{
                    model: Models.CoinPriceInFiatModel,
                    as: "fiat_price_data",
                    attributes: attr2,
                    where: where2,
                    required: false
                }]
            })
            return data;
        } catch (err: any) {
            console.error("Error in coinsJoinCoinPriceInFiat>>", err)
            await commonHelper.save_error_logs("coinsJoinCoinPriceInFiat", err.message);
            return null;
        }
    }
    public async coinsJoinCoinPriceInFiatJoinChangellyJoinWallet(
        attr1: any, where1: any, attr2: any, where2: any, attr3: any, where3: any, attr4: any, where4: any) {
        try {
            let data: any = await Models.CoinsModel.findAll({
                attributes: attr1,
                where: where1,
                include: [{
                    model: Models.CoinPriceInFiatModel,
                    as: "fiat_price_data",
                    attributes: attr2,
                    where: where2,
                    required: false
                }, {
                    model: Models.WalletModel,
                    attributes: attr4,
                    where: where4,
                    required: false,
                    as: "wallet_data",
                }, {
                    model: Models.CoinsModel,
                    attributes: ['coin_id', 'coin_symbol', 'is_token'],
                    where: { is_token: 0 },
                    required: true,
                    as: 'native_coins_data',
                    include: [{
                        model: Models.CoinPriceInFiatModel,
                        as: "fiat_price_data",
                        attributes: attr2,
                        where: where2,
                        required: false
                    }]
                }],
                order: [
                    [
                        Sequelize.fn('FIELD',
                            Sequelize.col('coin_symbol'),
                            'bnb',
                            'eth',
                            'btc',
                            'trx'
                        ),
                        'ASC'
                    ]
                ],
                // logging: console.log
            })
            return data;
        } catch (err: any) {
            console.error("Error in coinsJoinCoinPriceInFiatJoinChangellyJoinWallet>>", err)
            await commonHelper.save_error_logs("coinsJoinCoinPriceInFiatJoinChangellyJoinWallet", err.message);
            return null;
        }
    }
    public async coinsJoinCoinPriceInFiatJoinChangellyOnOffRampJoinWallet(
        attr1: any, where1: any, attr2: any, where2: any, attr3: any, where3: any, attr4: any, where4: any) {
        try {
            let data: any = await Models.CoinsModel.findAll({
                attributes: attr1,
                where: where1,
                include: [{
                    model: Models.CoinPriceInFiatModel,
                    as: "fiat_price_data",
                    attributes: attr2,
                    where: where2,
                    required: false
                }, {
                    model: Models.WalletModel,
                    attributes: attr4,
                    where: where4,
                    required: false,
                    as: "wallet_data",
                }],
                order: [
                    [
                        Sequelize.fn('FIELD',
                            Sequelize.col('coin_symbol'),
                            'bnb',
                            'eth',
                            'btc',
                            'trx'
                        ),
                        'ASC'
                    ]
                ],
                // logging: console.log
            })
            return data;
        } catch (err: any) {
            console.error("Error in coinsJoinCoinPriceInFiatJoinChangellyOnOffRampJoinWallet>>", err)
            await commonHelper.save_error_logs("coinsJoinCoinPriceInFiatJoinChangellyOnOffRampJoinWallet", err.message);
            return null;
        }
    }


    public async coinsJoinCoinPriceInFiatJoinChangellyOnOffRampJoinWallet2(
        attr1: any, where1: any, attr2: any, where2: any, attr3: any, where3: any, attr4: any, where4: any) {
        try {
            let data: any = await Models.CoinsModel.findAll({
                attributes: attr1,
                where: where1,
                include: [{
                    model: Models.CoinPriceInFiatModel,
                    as: "fiat_price_data",
                    attributes: attr2,
                    where: where2,
                    required: false
                }, {
                    model: Models.WalletModel,
                    attributes: attr4,
                    where: where4,
                    required: true,
                    as: "wallet_data",
                }],
                order: [
                    [
                        Sequelize.fn('FIELD',
                            Sequelize.col('coin_symbol'),
                            'bnb',
                            'eth',
                            'btc',
                            'trx'
                        ),
                        'ASC'
                    ]
                ],
                // logging: console.log
            })
            return data;
        } catch (err: any) {
            console.error("Error in coinsJoinCoinPriceInFiatJoinChangellyOnOffRampJoinWallet>>", err)
            await commonHelper.save_error_logs("coinsJoinCoinPriceInFiatJoinChangellyOnOffRampJoinWallet", err.message);
            return null;
        }
    }
}

const coin_queries = new CoinQueries();
export default coin_queries;
