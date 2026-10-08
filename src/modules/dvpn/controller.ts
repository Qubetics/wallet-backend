import { Response, Request } from "express";
import { OnlyControllerInterface } from "../../interfaces/controller.interface";
import { dvpnHelper } from "./helper"
import { GlblCode } from "../../constants/global_enum";
import { SolanaHelper } from "../../helpers/common/solana.helper";


class DvpnController implements OnlyControllerInterface {

  //Initialize the controller
  constructor() {
    this.initialize();
  }

  public initialize() { }
  
  //get dvpn session history
  public async sessionHistory(req: Request, res: Response) {
    try {
      //user id
      const userId = req.userId as number;
      const { limit = 10, page = 1 } = req.body;
      
      //pagination
      const perPage = Number(limit);
      const currentPage = Number(page);
      const offset = (currentPage - 1) * perPage;
  
      // Build query object
      const queryOptions = {
        where: {
          user_id: userId
        },
        attributes: ['wallet_id', 'user_id', 'status', 'tx_hash', 'block', 'status_at', 'node_address', 'start_at', 'status_at', 'event', 'created_at', 'updated_at'],
        order: [['id', 'DESC']],
        limit: perPage,
        offset,
        page: currentPage,
      };
      
      //get dvpn session history
      const history: any = await dvpnHelper.getDvpnSessionHistory(queryOptions);
      
      return res.status(GlblCode.SUCCESS).json({
        status: true,
        code: GlblCode.SUCCESS,
        message: 'DVPN session history fetched successfully',
        data: history,
      });
    } catch (err) {
      console.error('Error in sessionHistory:', err);
      return res.status(GlblCode.ERROR_CODE).json({
        status: false,
        code: GlblCode.ERROR_CODE,
        message: 'Failed to fetch DVPN session history',
      });
    }
  }

  //get dvpn plans list
  public async getDvpnPlansList(req: Request, res: Response) {
    try {
      const userId = req.userId as number;
      const { limit = 10, page = 1 } = req.body;
  
      const perPage = Number(limit);
      const currentPage = Number(page);
      const offset = (currentPage - 1) * perPage;
  
      // Build query object
      const queryOptions = {
        where: {
          user_id: userId
        },
        order: [['id', 'DESC']],
        limit: perPage,
        offset,
        page: currentPage,
      };
      
      //get dvpn plans list
      const dvpnPlansList: any = await dvpnHelper.getDvpnPlansList(queryOptions);
  
      return res.status(GlblCode.SUCCESS).json({
        status: true,
        code: GlblCode.SUCCESS,
        message: 'DVPN plans list fetched successfully',
        data: dvpnPlansList,
      });
    } catch (err) {
      console.error('Error in getDvpnPlansList:', err);
      return res.status(GlblCode.ERROR_CODE).json({
        status: false,
        code: GlblCode.ERROR_CODE,
        message: 'Failed to fetch DVPN plans list',
      });
    }
  }  
  
  //add dvpn plan
  public async addDvpnPlan(req: Request, res: Response) {
   
    try {
        
        //Dvpn plan data
        const dvpnPlansData: any = req.body;

        //add dvpn plan
        const data: any = await dvpnHelper.addDvpnPlan(dvpnPlansData, req.userId);

        if(!data.status){
            return res.status(GlblCode.ERROR_CODE).send({
                status: false,
                code: GlblCode.ERROR_CODE,
                message: data.message
            });
        }
        
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

export const dvpnController = new DvpnController();