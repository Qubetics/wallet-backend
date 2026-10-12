import { Router } from 'express';
import AuthRoute from './auth/route';
import CommissionRoute from './commission/route';
import WalletRoute from './wallet/route';
import TokenRoute from './token/route'
import NotificationRoute from './notification/route'
import BannerRoute from './banner/route';


class AdminRoute {
    public path = '/admin';
    public router = Router();

    constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.use(`${this.path}/auth`, AuthRoute)
        this.router.use(`${this.path}/commission`, CommissionRoute)
        this.router.use(`${this.path}/wallet`, WalletRoute)
        this.router.use(`${this.path}/token`, TokenRoute)
        this.router.use(`${this.path}/notification`, NotificationRoute)
        this.router.use(`${this.path}/banner`, BannerRoute)

    }
}

export default AdminRoute;
