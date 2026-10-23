import { Request, Response } from "express";
import { OnlyControllerInterface } from "../../../interfaces/controller.interface";
import { GlblCode, GlblMessages } from "../../../constants/global_enum";
import { language } from "../../../constants";
import { adminErrQueries } from "../../../helpers/dbHelper";
import s3Helper from "../../../helpers/common/s3.helpers";
import { Op } from "sequelize";
import { BannerHelper } from "./banner.helper";
import BannerModel from "../../../models/model/model.banner";

class BannerController implements OnlyControllerInterface {
  constructor() {
    this.initialize();
  }

  public initialize() { }

  public async getBannerList(req: Request, res: Response) {
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

      let obj: any = {
        where: {},
        order: [['id', 'DESC']],
        limit: per_page,
        offset: offset,
        page: page,
        attributes: ["id", "status", "link", "image_path", "created_at"]
      }

      //search by message
      if (search) {
        obj.where[Op.or] = [
          { message: { [Op.like]: `%${search}%` } }
        ];
      }

      //get banner list
      const get_banner_list: any = await BannerHelper.get_banner_list(obj);

      return res.status(GlblCode.SUCCESS).send({
        message: GlblMessages.SUCCESS,
        status: true,
        code: GlblCode.SUCCESS,
        data: get_banner_list,
      });
    } catch (err: any) {
      console.error("Error in getBannerList API", err);
      await adminErrQueries.adminErrLogsCreate({ fx_name: "getBannerList", error_msg: err.message || {} });
      return res.status(GlblCode.ERROR_CODE).send({
        code: GlblCode.ERROR_CODE,
        status: false,
        message: language[lang].CATCH_MSG,
      });
    }
  }

  public async createBanner(req: Request, res: Response) {
    let lang: any = req.headers['content-language'] || 'en';
    try {
      const { link } = req.body;
      const imagePath = req.body.imagePath || "";

      const newBanner = await BannerModel.create({ imagePath, link });
      return res.status(GlblCode.SUCCESS).send({
        message: GlblMessages.SUCCESS,
        status: true,
        code: GlblCode.SUCCESS,
        data: newBanner,
      });
    } catch (err: any) {
      console.error("Error in createBanner API", err);
      await adminErrQueries.adminErrLogsCreate({ fx_name: "createBanner", error_msg: err.message || {} });
      return res.status(GlblCode.ERROR_CODE).send({
        code: GlblCode.ERROR_CODE,
        status: false,
        message: language[lang].CATCH_MSG,
      });
    }
  }

  public async deleteBanner(req: Request, res: Response) {
    let lang: any = req.headers['content-language'] || 'en';

    try {
      const { id } = req.params;
      const banner = await BannerModel.findOne({ where: { id } });
      if (!banner) {
        return res.status(404).send({
          message: language[lang]?.NOT_FOUND || "Banner not found",
          status: false,
          code: 404,
        });
      }
      if (banner.imagePath) {
        try {
          await s3Helper.deleteFromHuaweiS3(banner.imagePath);
        } catch (obsErr) {
          console.warn("⚠️ Failed to delete image from OBS", obsErr);
        }
      }
      await BannerModel.destroy({ where: { id } });

      return res.status(GlblCode.SUCCESS).send({
        message: GlblMessages.SUCCESS,
        status: true,
        code: GlblCode.SUCCESS,
      });

    } catch (err: any) {
      console.error("Error in deleteBanner API", err);
      await adminErrQueries.adminErrLogsCreate({ fx_name: "deleteBanner", error_msg: err.message || {} });

      return res.status(GlblCode.ERROR_CODE).send({
        code: GlblCode.ERROR_CODE,
        status: false,
        message: language[lang].CATCH_MSG,
      });
    }
  }

  public async updateBanner(req: Request, res: Response) {
    let lang: any = req.headers['content-language'] || 'en';
    try {
      const { id, status }: { id: number, status: string } = req.body;
      const banner = await BannerModel.findOne({ where: { id } });
      if (!banner) {
        return res.status(404).send({
          message: language[lang]?.NOT_FOUND || "Banner not found",
          status: false,
          code: 404,
        });
      }

      //at a  time only 5  can be  active
      if (status == '1') {
        const activeBanners: any = await BannerModel.count({ where: { status: '1' } });
        if (activeBanners >= 5) {
          return res.status(GlblCode.ERROR_CODE).send({
            code: GlblCode.ERROR_CODE,
            status: false,
            message: "Only 5 active banners are allowed at a time"
          });
        }
      }
      //update banner status
      await BannerModel.update({ status }, { where: { id } });
      return res.status(GlblCode.SUCCESS).send({
        message: GlblMessages.SUCCESS,
        status: true,
        code: GlblCode.SUCCESS,
      });
    } catch (err: any) {
      console.error("Error in updateBanner API", err);
      await adminErrQueries.adminErrLogsCreate({ fx_name: "updateBanner", error_msg: err.message || {} });
      return res.status(GlblCode.ERROR_CODE).send({
        code: GlblCode.ERROR_CODE,
        status: false,
        message: language[lang].CATCH_MSG,
      });
    }
  }
}

export const bannerController = new BannerController();