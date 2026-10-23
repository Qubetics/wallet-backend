import { AnnouncementModel } from "../../../models";


class NotificationHelpers {
    constructor() {
      this.initialize();
    }
    public initialize() { }
    
    public async getNotificationList(obj: any){
        try {
            const notification_list : any = await AnnouncementModel.findAndCountAll({
                where: obj.where,
                attributes : obj.attributes,
                order: obj.order,
                limit: obj.limit,
                offset: obj.offset,
                include: obj.includes
            });
          
            return {
                notification_list: notification_list.rows,
                total: notification_list.count,
                page: obj.page,
                per_page: obj.limit,
                total_pages: Math.ceil(notification_list.count / obj.limit)
            };
        } catch (err: any) {
            console.error("Error in getNotificationList", err)
        }
    }

    public async createNotification(title: string, message: string){
        try {
            //announce to all users

            const create_notification: any = await AnnouncementModel.create({ title, message });
            return {
                status: true,
                message: "Notification created successfully",
                data: create_notification
            };
        } catch (err: any) {
            console.error("Error in createNotification", err)
            return {
                status: false,
                message: err.message,
                data: {}
            };
        }
    }   

    public async updateNotification(id: string, message: string, title: string){
        try {
            const update_notification: any = await AnnouncementModel.update({ message, title }, { where: { id } });
            return {
                status: true,
                message: "Notification updated successfully",
                data: update_notification
            };
        } catch (err: any) {
            console.error("Error in updateNotification", err)
            return {
                status: false,
                message: err.message,
                data: {}
            };
        }
    }

    public async deleteNotification(id: number){
        try {
            const delete_notification: any = await AnnouncementModel.destroy({ where: { id } });
            return {
                status: true,
                message: "Notification deleted successfully",
                data: delete_notification
            };
        } catch (err: any) {
            console.error("Error in deleteNotification", err)
        }
    }
  }
  export const NotificationHelper = new NotificationHelpers();