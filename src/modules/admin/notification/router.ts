import { Router } from 'express';
import { notificationController } from './controller';
import adminMiddleware from '../middleware';


import notificationValidator from './validator';
import { validate as validateExpress } from "express-validation";


const router = Router();

//get notification list
router.post('/list',
    adminMiddleware.checkLogin,
    notificationController.getNotificationList);


//create notification
router.post('/create',
    [validateExpress(notificationValidator.createNotificationValidate)],
    adminMiddleware.checkLogin,
    notificationController.createNotification);

//update notification
router.post('/update',
    [validateExpress(notificationValidator.updateNotificationValidate)],
    adminMiddleware.checkLogin,
    notificationController.updateNotification);

    //delete notification
router.delete('/delete/:id',
    adminMiddleware.checkLogin,
    notificationController.deleteNotification);



export default router;