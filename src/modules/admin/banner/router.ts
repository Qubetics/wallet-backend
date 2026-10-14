import { Router } from "express";
import { bannerController } from "./controller";
import { validate as validateExpress } from "../../../middlewares/validate";
import BannerValidator from "./validator";
import adminMiddleware from "../middleware";

const router = Router();

router.post(
  "/getBannerList",
  adminMiddleware.checkLogin,
  bannerController.getBannerList
);
router.post(
  "/createBanner",
  validateExpress(BannerValidator.createBanner),
  adminMiddleware.checkLogin,
  adminMiddleware.checkActiveBanners,
  adminMiddleware.uploadImageToHuawei,
  bannerController.createBanner
);
router.delete(
  "/deleteBanner/:id",
  adminMiddleware.checkLogin,
  bannerController.deleteBanner
);
/** activated and inactivated the banner */
router.post(
  "/updateBanner",
  validateExpress(BannerValidator.updateBanner),
  adminMiddleware.checkLogin,
  bannerController.updateBanner
);



export default router;
