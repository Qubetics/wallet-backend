import { Router } from 'express';
import { walletController } from './controller';
import adminMiddleware from '../middleware';

const router = Router();

//get menu list
router.get('/menuList',
    adminMiddleware.checkLogin,
    walletController.getMenuList);


//get transaction history
router.post('/transactionHistory',
    adminMiddleware.checkLogin,
    walletController.transactionHistory);

    //get dashboard data
router.get('/dashboard',
    adminMiddleware.checkLogin,
    walletController.dashboard);



export default router;