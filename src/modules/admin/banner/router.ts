import { Router } from "express";
import { bannerController } from "./controller";
import { validate as validateExpress } from "express-validation";
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
  adminMiddleware.uploadImageToHuawei,
  bannerController.createBanner
);
router.post(
  "/deleteBanner/:id",
  adminMiddleware.checkLogin,
  bannerController.deleteBanner
);

export default router;
