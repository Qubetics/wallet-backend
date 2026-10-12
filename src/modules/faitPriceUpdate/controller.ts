import { Response, Request } from "express";
import response from "../../helpers/response/response.helpers";
import { OnlyControllerInterface } from "../../interfaces/controller.interface";
import { factPriceUpdateHelper } from "./helper";
import logger from "../../helpers/common/logger.helper";

class FactPriceUpdateController implements OnlyControllerInterface {
  constructor() {
    this.initialize();
  }

  public initialize() { }
  public async updateFactPrice(req: Request, res: Response) {
    try {

        await factPriceUpdateHelper.updateFiatPrice();
         
        const data =  {
            status: true,
            message: "Fact price update started",
            data: []
        }
        return response.success(res, data);

        
    } catch (error) {
        logger.error(`error in updateFactPrice ${JSON.stringify(error)}`);
        return response.error(res, {
            data: {
                status: false,
                message: "Fact price update failed",
            }
        });
    }
  };
}

export const factPriceUpdateController = new FactPriceUpdateController();