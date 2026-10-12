import { Request, Response } from "express";
import { OnlyControllerInterface } from "../../../interfaces/controller.interface";
import { GlblCode, GlblMessages } from "../../../constants/global_enum";
import { language } from "../../../constants";
import { adminErrQueries } from "../../../helpers/dbHelper";
import MenuListsModel from "../../../models/model/model_menu_lists.";
import { WalletHelper } from "./wallet.helper";
import CoinsModel from "../../../models/model/model.coins";
import { Op } from "sequelize";


class WalletController implements OnlyControllerInterface {
    constructor() {
        this.initialize();
    }

    public initialize() { }

    public async getMenuList(req: Request, res: Response) {
        let lang: any = req.headers['content-language'] || 'en';
        try {
            const data: any = await MenuListsModel.findAll({ raw: true });
            return res.status(GlblCode.SUCCESS).send({
                message: GlblMessages.SUCCESS,
                status: true,
                code: GlblCode.SUCCESS,
                data: data
            });
        } catch (err: any) {
            console.error("Error in getMenuList API", err)
            await adminErrQueries.adminErrLogsCreate({ fx_name: "getMenuList", error_msg: err.message || {} })
            return res.status(GlblCode.ERROR_CODE).send({
                code: GlblCode.ERROR_CODE,
                status: false,
                message: language[lang].CATCH_MSG
            });
        }
    }

    public async transactionHistory(req: Request, res: Response) {
        let lang: any = req.headers['content-language'] || 'en';
        try {

            const per_page: number = Number(
              req.body?.limit == undefined ? (req.body.limit = "10") : req.body.limit
            );
            const page: number = Number(
              req.body.page == undefined ? (req.body.page = "1") : req.body.page
            );
            const offset: number = (page - 1) * per_page;
            const userId: number = Number(req.body?.user_id == undefined ? null : req.body.user_id);
            const search: string = req.body?.search == undefined ? null : req.body.search;
            const from_date: string = req.body?.from_date == undefined ? null : req.body.from_date;
            const to_date: string = req.body?.to_date == undefined ? null : req.body.to_date;
            const coin_family: string = req.body?.coin_family == undefined ? null : req.body.coin_family;
            
            //object for get transaction history
            let obj: any = {
                where: {},
                order: [['id', 'DESC']],
                limit: per_page,
                offset: offset,
                page: page,
                attributes : ["from_adrs","coin_family", "to_adrs", "tx_id", "blockchain_status", "amount", "created_at"],
                includes: [
                    {
                        model: CoinsModel,
                        as: 'coin_data',
                        attributes: ['coin_name', 'coin_symbol', 'coin_image']
                    }
                ]
            }

            //search by from_adrs, to_adrs, tx_id, type
            if (search) {
                obj.where[Op.or] = [
                { from_adrs: { [Op.like]: `%${search}%` } },
                { to_adrs: { [Op.like]: `%${search}%` } },
                { tx_id: { [Op.like]: `%${search}%` } },
                { type: { [Op.like]: `%${search}%` } }
                ];
            }

            //search by coin_family
            if (coin_family) {
                obj.where.coin_family = coin_family;
            }

            //search by user_id
            if (userId) {
                obj.where.user_id = userId;
            }

            //search by from_date and to_date
            if(from_date && to_date){
                const start_date = new Date(from_date);
                start_date.setHours(0, 0, 0, 0);
                
                const end_date = new Date(to_date);
                end_date.setHours(23, 59, 59, 999);
                
                obj.where.created_at = { 
                    [Op.between]: [
                        start_date.toISOString().slice(0, 19).replace('T', ' '), 
                        end_date.toISOString().slice(0, 19).replace('T', ' ')
                    ] 
                };
            }

            //get transaction history
            const get_transaction_history: any = await WalletHelper.get_transaction_history(obj);

            return res.status(GlblCode.SUCCESS).send({
                message: GlblMessages.SUCCESS,
                status: true,
                code: GlblCode.SUCCESS,
                data: get_transaction_history
            });


        } catch (err: any) {
            console.error("Error in getMenuList API", err)
            await adminErrQueries.adminErrLogsCreate({ fx_name: "transactionHistory", error_msg: err.message || {} })
            return res.status(GlblCode.ERROR_CODE).send({
                code: GlblCode.ERROR_CODE,
                status: false,
                message: language[lang].CATCH_MSG
            });
        }
    }

    public async dashboard(req: Request, res: Response) {
        let lang: any = req.headers['content-language'] || 'en';
        try {
            
            // Fetch all data in parallel
            const [
                new_added_token,
                daily_active_users,
                monthly_active_users,
                total_wallets
            ] = await Promise.all([
                WalletHelper.get_new_added_token().then(String),
                WalletHelper.get_daily_active_users().then(Number),
                WalletHelper.get_monthly_active_users(30).then(Number),
                WalletHelper.get_total_wallets().then(Number)
            ]);

            const dashboard_data = {
                new_added_token,
                daily_active_users,
                monthly_active_users,
                total_wallets
            };

            return res.status(GlblCode.SUCCESS).send({
                message: GlblMessages.SUCCESS,
                status: true,
                code: GlblCode.SUCCESS,
                data: dashboard_data
            });

        } catch (err: any) {
            console.error("Error in dashboard API", err)
            await adminErrQueries.adminErrLogsCreate({ fx_name: "dashboard", error_msg: err.message || {} })
            return res.status(GlblCode.ERROR_CODE).send({
                code: GlblCode.ERROR_CODE,
                status: false,
                message: language[lang].CATCH_MSG
            });
        }
    }

}

export const walletController = new WalletController();
