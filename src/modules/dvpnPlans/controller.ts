import { Response, Request } from "express";
import response from "../../helpers/response/response.helpers";
import { OnlyControllerInterface } from "../../interfaces/controller.interface";
import { dvpnPlansHelper } from "./helpers"
import { GlblCode } from "../../constants/global_enum";


class DvpnPlansController implements OnlyControllerInterface {
  constructor() {
    this.initialize();
  }

  public initialize() { }
  public async getDvpnPlansList(req: Request, res: Response) {
  
    try {
        const { wallet_address }: any = req.body;
        const userId: number = req.userId;

        const per_page: number = Number(
            req.body?.limit == undefined ? (req.body.limit = "10") : req.body.limit
          );
          const page: number = Number(
            req.body.page == undefined ? (req.body.page = "1") : req.body.page
          );
          const offset: number = (page - 1) * per_page;
    
          //prepare query object
          const obj: any = {
            where: {},
            order: [['id', 'DESC']],
            limit: per_page,
            offset: offset,
            page: page,
          }
    
        
        const dvpnPlansList: any = await dvpnPlansHelper.getDvpnPlansList(userId, wallet_address, obj);

        return res.status(GlblCode.SUCCESS).send({
            status: true,
            code: GlblCode.SUCCESS,
            message: "DVPN plans list fetched successfully",
            data: dvpnPlansList
        });
    } catch (err: any) {
       console.log("error in getDvpnPlansList", err);
    }
  };

  public async addDvpnPlan(req: Request, res: Response) {
   
    try {
        
        //Dvpn plan data
        const dvpnPlansData: any = req.body;

        console.log("this is userId", req.userId);

        //add dvpn plan
        const data: any = await dvpnPlansHelper.addDvpnPlan(dvpnPlansData, req.userId);

        //if error in adding dvpn plan, return error
        if(!data.status){
            return res.status(GlblCode.ERROR_CODE).send({
                status: false,
                code: GlblCode.ERROR_CODE,
                message: data.message
            });
        }
        
        //return success response
        return res.status(GlblCode.SUCCESS).send({
            status: true,
            code: GlblCode.SUCCESS,
            message: data.message,
            data: data.walletId,
        });

    } catch (err: any) {
       console.log("error in getDvpnPlansList", err);
    }
  };
}

export const dvpnPlansController = new DvpnPlansController();