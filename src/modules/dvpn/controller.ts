import { Response, Request } from "express";
import { OnlyControllerInterface } from "../../interfaces/controller.interface";
import { dvpnHelper } from "./helper"
import { GlblCode } from "../../constants/global_enum";

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
      
      //return success response
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
}

export const dvpnController = new DvpnController();