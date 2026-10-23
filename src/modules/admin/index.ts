import { Router } from 'express';
import AuthRoute from './auth/router';
import CommissionRoute from './commission/router';
import WalletRoute from './wallet/router';
import TokenRoute from './token/router'
import NotificationRoute from './notification/router'
import BannerRoute from './banner/router';


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
