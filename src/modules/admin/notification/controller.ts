import { Request, Response } from "express";
import { OnlyControllerInterface } from "../../../interfaces/controller.interface";
import { GlblCode, GlblMessages } from "../../../constants/global_enum";
import { language } from "../../../constants";
import { adminErrQueries } from "../../../helpers/dbHelper";
import { AnnouncementModel } from "../../../models";
import { Op } from "sequelize";
import { NotificationHelper } from "./notification.helper";



class NotificationController implements OnlyControllerInterface {
    constructor() {
        this.initialize();
    }

    public initialize() { }

    public async getNotificationList(req: Request, res: Response) {
        let lang: any = req.headers['content-language'] || 'en';
        try {

            const per_page: number = Number(
                req.body?.limit == undefined ? (req.body.limit = "10") : req.body.limit
              );
              const page: number = Number(
                req.body.page == undefined ? (req.body.page = "1") : req.body.page
              );
              const offset: number = (page - 1) * per_page;
           
              const search: string = req.body?.search == undefined ? null : req.body.search;

               //object for get token list
               let obj: any = {
                where: {},
                order: [['id', 'DESC']],
                limit: per_page,
                offset: offset,
                page: page,
                attributes : [ "id", "title", "message", "created_at", "status"]
            }

            //search by title, message
            if (search) {
                obj.where[Op.or] = [
                { title: { [Op.like]: `%${search}%` } },
                { message: { [Op.like]: `%${search}%` } }
                ];
            }

            const get_notification_list: any = await NotificationHelper.getNotificationList(obj);

            return res.status(GlblCode.SUCCESS).send({
                message: GlblMessages.SUCCESS,
                status: true,
                code: GlblCode.SUCCESS,
                data: get_notification_list
            });

        } catch (err: any) {
            console.error("Error in getNotificationList API", err)
            await adminErrQueries.adminErrLogsCreate({ fx_name: "getNotificationList", error_msg: err.message || {} })
            return res.status(GlblCode.ERROR_CODE).send({
                code: GlblCode.ERROR_CODE,
                status: false,
                message: language[lang].CATCH_MSG
            });
        }
    }

    public async createNotification(req: Request, res: Response) {
        let lang: any = req.headers['content-language'] || 'en';
        try {

            const { title, message }: { title: string, message: string } = req.body;

            if(!title || !message) {
                return res.status(GlblCode.ERROR_CODE).send({
                    code: GlblCode.ERROR_CODE,
                    status: false,
                    message: "Title and message are required"
                });
            }

            const create_notification: any = await NotificationHelper.createNotification(title, message);

            return res.status(GlblCode.SUCCESS).send({
                message: GlblMessages.SUCCESS,
                status: true,
                code: GlblCode.SUCCESS,
                data: create_notification.message
            });

        } catch (err: any) {
            console.error("Error in createNotification API", err)
            await adminErrQueries.adminErrLogsCreate({ fx_name: "createNotification", error_msg: err.message || {} })
            return res.status(GlblCode.ERROR_CODE).send({
                code: GlblCode.ERROR_CODE,
                status: false,
                message: language[lang].CATCH_MSG
            });
        }
    }

    public async updateNotification(req: Request, res: Response) {
        let lang: any = req.headers['content-language'] || 'en';
        try {
            const { id , message , title }: { id: string, message: string, title: string } = req.body;

            if(!id || !message || !title) {
                return res.status(GlblCode.ERROR_CODE).send({
                    code: GlblCode.ERROR_CODE,
                    status: false,
                    message: "Id, message and title are required"
                });
            }

            let exist_notification: any = await AnnouncementModel.findOne({ where: { id } });
            if(!exist_notification) {
                return res.status(GlblCode.ERROR_CODE).send({
                    code: GlblCode.ERROR_CODE,
                    status: false,
                    message: "Notification not found"
                });
            }

            const update_notification: any = await NotificationHelper.updateNotification(id, message, title);

            return res.status(GlblCode.SUCCESS).send({
                message: GlblMessages.SUCCESS,
                status: true,
                code: GlblCode.SUCCESS,
                data: update_notification.message
            });

        } catch (err: any) {
            console.error("Error in updateNotification API", err)
            await adminErrQueries.adminErrLogsCreate({ fx_name: "updateNotification", error_msg: err.message || {} })
            return res.status(GlblCode.ERROR_CODE).send({
                code: GlblCode.ERROR_CODE,
                status: false,
                message: language[lang].CATCH_MSG
            });
        }
    }

    public async deleteNotification(req: Request, res: Response) {
        let lang: any = req.headers['content-language'] || 'en';
        try {
            const id = Number(req.params.id);
            
            if(!id) {
                return res.status(GlblCode.ERROR_CODE).send({
                    code: GlblCode.ERROR_CODE,
                    status: false,
                    message: "Id is required"
                });
            }

            const exist_notification: any = await AnnouncementModel.findOne({ where: { id } });
            if(!exist_notification) {
                return res.status(GlblCode.ERROR_CODE).send({
                    code: GlblCode.ERROR_CODE,
                    status: false,
                    message: "Notification not found"
                });
            }

            const delete_notification: any = await NotificationHelper.deleteNotification(id);

            return res.status(GlblCode.SUCCESS).send({
                message: GlblMessages.SUCCESS,
                status: true,
                code: GlblCode.SUCCESS,
                data: delete_notification.message
            });

        } catch (err: any) {
            console.error("Error in deleteNotification API", err)
            await adminErrQueries.adminErrLogsCreate({ fx_name: "deleteNotification", error_msg: err.message || {} })
            return res.status(GlblCode.ERROR_CODE).send({
                code: GlblCode.ERROR_CODE,
                status: false,
                message: language[lang].CATCH_MSG
            });
        }
    }
}   

export const notificationController = new NotificationController();
