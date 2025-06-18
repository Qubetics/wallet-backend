import { Router } from 'express';
import { walletController } from './controller';
import adminMiddleware from '../middleware';
import {walletController as userWalletController} from '../../wallet/controller.wallet';
import walletValidator from './validator';
import { validate as validateExpress } from "express-validation";


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


router.post('/searchToken',
    [validateExpress(walletValidator.searchTokenValidate)],
    adminMiddleware.checkLogin,
    userWalletController.searchToken);


export default router;