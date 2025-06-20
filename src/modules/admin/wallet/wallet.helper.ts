import { CoinsModel, UsersModel } from "../../../models";
import TrnxHistoryModel from "../../../models/model/model.trnxHistory";
import { Op, Sequelize } from "sequelize";
import sequelize from "sequelize";


class WalletHelpers {
    constructor() {
      this.initialize();
    }
    public initialize() { }
    
    public async get_transaction_history(obj: any){
        try {
            const transaction_history : any = await TrnxHistoryModel.findAndCountAll({
                where: obj.where,
                attributes : obj.attributes,
                order: obj.order,
                limit: obj.limit,
                offset: obj.offset,
                include: obj.includes
            });
          
            return {
                transaction_history: transaction_history.rows,
                total: transaction_history.count,
                page: obj.page,
                per_page: obj.limit,
                total_pages: Math.ceil(transaction_history.count / obj.limit)
            };
        } catch (err: any) {
            console.error("Error in get_transaction_history", err)
        }
    }
    
    //get within last month added tokens
    public async get_new_added_token(){
        try {
            // Set date to 30 days back from today
            const today = new Date();
            const thirtyDaysAgo = new Date(today);
            thirtyDaysAgo.setDate(today.getDate() - 30);
            
            const todayStr = today.toISOString().split('T')[0];
            const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];
            
            const whereClause: any = {};
            whereClause[Op.and] = [
                Sequelize.where(
                    Sequelize.fn('DATE', Sequelize.col('created_at')),
                    {
                        [Op.gte]: thirtyDaysAgoStr
                    }
                ),
                Sequelize.where(
                    Sequelize.fn('DATE', Sequelize.col('created_at')),
                    {
                        [Op.lte]: todayStr
                    }
                )
            ];
            
            const new_added_token : number = await CoinsModel.count({
                where: whereClause
            });
            return new_added_token;
        } catch (error) {
            console.error("Error in get_new_added_token", error);
            return 0;
        }
    }

    //get daily active users based on last 24 hours transaction
    public async get_daily_active_users() {
        try {
            const daily_active_users : number = await TrnxHistoryModel.count({
                distinct: true,
                col: 'user_id',
                where: {
                    created_at: { [Op.gte]: new Date(new Date().setHours(new Date().getHours() - 24))}
                }
            });
            return daily_active_users || 0;
        } catch (error) {
            console.error("Error in get_daily_active_users", error);
            return 0;
        }
    }

    //get monthly active users based on last eg.30 days transaction
    public async get_monthly_active_users(days: number) {
        try {
            const today = new Date();
            const daysAgo = new Date(today);
            daysAgo.setDate(today.getDate() - days);
            
            const todayStr = today.toISOString().split('T')[0];
            const daysAgoStr = daysAgo.toISOString().split('T')[0];
            
            const whereClause: any = {};
            whereClause[Op.and] = [
                Sequelize.where(
                    Sequelize.fn('DATE', Sequelize.col('created_at')),
                    {
                        [Op.gte]: daysAgoStr
                    }
                ),
                Sequelize.where(
                    Sequelize.fn('DATE', Sequelize.col('created_at')),
                    {
                        [Op.lte]: todayStr
                    }
                )
            ];
            
            const monthly_active_users: number = await TrnxHistoryModel.count({
                distinct: true,
                col: 'user_id',
                where: whereClause
            });
            return monthly_active_users || 0;
        } catch (error) {
            console.error("Error in get_monthly_active_users", error);
            return 0;
        }
    }

    //get total wallets
    public async get_total_wallets() {
        try {
            
            const  wallet_cnt : number = await UsersModel.count();
            return wallet_cnt;

        } catch (error) {
            console.error("Error in get_total_wallets", error);
            return 0;
        }
    }
  }
  export const WalletHelper = new WalletHelpers();