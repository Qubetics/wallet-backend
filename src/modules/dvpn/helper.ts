import * as Models from "../../models/model/index";

class DvpnHelpers {

  //get dvpn session history
  public async getDvpnSessionHistory(queryOptions: any) {
    try {
         
        //get dvpn session history
        const history: any = await Models.DvpnSessionsModel.findAndCountAll(queryOptions);
         
        return {
            history: history.rows,
            total: history.count,
            page: queryOptions.page,
            per_page: queryOptions.limit,
            total_pages: Math.ceil(history.count / queryOptions.limit)
        };

    } catch (error: any) {
      console.error("Error in getDvpnSessionHistory>>>>", error);
      return {
        status: false,
        message: "Error in getDvpnSessionHistory",
        error: error?.message
      };
    }
  }


}

export const dvpnHelper = new DvpnHelpers()

