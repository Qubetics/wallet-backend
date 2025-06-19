import { Router } from 'express';
import { tokenController } from './controller';
import adminMiddleware from '../middleware';
import tokenValidate from "./validator"
import { validate as validateExpress } from "express-validation";
import walletValidator from '../wallet/validator';
import {walletController as userWalletController} from '../../wallet/controller.wallet';


const router = Router();

//get token list
router.post('/tokenList',
    adminMiddleware.checkLogin,
    tokenController.getTokenList);

//add token
router.post('/addToken',
    [validateExpress(tokenValidate.addTokenValidate)],
    adminMiddleware.checkLogin,
    tokenController.addToken);

//add token
router.put('/updateTokenLogo',
    [validateExpress(tokenValidate.updateTokenLogoValidate)],
    adminMiddleware.checkLogin,
    tokenController.updateTokenLogo);

//toogle swap
router.put('/toogleSwap',
    [validateExpress(tokenValidate.toogleSwapValidate)],
    adminMiddleware.checkLogin,
    tokenController.toogleSwap);

//toogle swap
router.put('/toogleStatus',
    [validateExpress(tokenValidate.toogleStatusValidate)],
    adminMiddleware.checkLogin,
    tokenController.toogleStatus);

router.post('/searchToken',
    [validateExpress(walletValidator.searchTokenValidate)],
    adminMiddleware.checkLogin,
    userWalletController.searchToken);

export default router;