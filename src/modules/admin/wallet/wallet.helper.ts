import { GlblAddedBy } from "../../../constants/global_enum";
import { CoinsModel, UsersModel } from "../../../models";
import TrnxHistoryModel from "../../../models/model/model.trnxHistory";
import { Op, Sequelize } from "sequelize";


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
            const whereClause: any = {  coin_status: 1, added_by: GlblAddedBy.ADMIN};
            
            const new_added_token = await CoinsModel.findOne({
                attributes: [ "coin_name" ],
                where: whereClause,
                order: [['created_at', 'DESC']],
            });
            return new_added_token ? new_added_token.coin_name : '';
        } catch (error) {
            console.error("Error in get_new_added_token", error);
            return 0;
        }
    }

    //get daily active users based on last 24 hours transaction
    public async get_daily_active_users() {
        try {
            const userIds = await TrnxHistoryModel.findAll({
                attributes: [
                    [Sequelize.fn('DISTINCT', Sequelize.col('user_id')), 'id']
                ],
                where: {
                    created_at: { [Op.gte]: new Date(new Date().setHours(new Date().getHours() - 24)) }
                },
                raw: true
            });

            const toUserIds = await TrnxHistoryModel.findAll({
                attributes: [
                    [Sequelize.fn('DISTINCT', Sequelize.col('to_user_id')), 'id']
                ],
                where: {
                    created_at: { [Op.gte]: new Date(new Date().setHours(new Date().getHours() - 24)) }
                },
                raw: true
            });

            // Merge and deduplicate
            const allIds = new Set([...userIds.map(u => u.id), ...toUserIds.map(u => u.id)]);
            return allIds.size;
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


            // Get unique users from both user_id and to_user_id columns
            const [userResults, toUserResults] = await Promise.all([
                TrnxHistoryModel.findAll({
                    attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('user_id')), 'user_id']],
                    where: whereClause,
                    raw: true
                }),
                TrnxHistoryModel.findAll({
                    attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('to_user_id')), 'to_user_id']],
                    where: {
                        ...whereClause,
                        to_user_id: {
                            [Op.ne]: null
                        }
                    },
                    raw: true
                })
            ]);
            
            // Combine unique users from both columns
            const userIds = userResults.map(result => result.user_id);
            const toUserIds = toUserResults.map(result => result.to_user_id);
            
            // Create a Set to get unique user IDs from both columns
            const uniqueUserIds = new Set([...userIds, ...toUserIds]);
            
            const monthly_active_users = uniqueUserIds.size;

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