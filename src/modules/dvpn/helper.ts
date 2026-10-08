import * as Models from "../../models/model/index";

class DvpnHelpers {
  
  //add dvpn plan
  public async addDvpnPlan(dvpnPlansData: any, userId: number) {
    try {
      
      const { wallet_address, plan_id, plan_amount, provider_id, country_name, country_code, country_flag, server_location } = dvpnPlansData;
      
      // Find the main wallet for the user by wallet_address
      const wallet = await Models.TicsNativeAddressModel.findOne({
        attributes: ["wallet_id"],
        where: {
          user_id: userId,
          address: wallet_address
        },
        raw: true
      });

      if (!wallet) {
        return {
          status: false,
          message: "Wallet not found",
        };
      }

      const walletId = wallet.wallet_id;
      
      //check if dvpn plan already exists
      const  existingDvpnPlan = await Models.DvpnPlansModel.findOne({
        where: {
          user_id: userId,
          plan_id: plan_id,
          wallet_id: walletId
        }
      });
      

      if(existingDvpnPlan){
        return {
          status: false,
          message: "DVPN plan already exists",
        };
      }
      
      //prepare dvpn plan data
      const  dvpnData = {
        wallet_id: walletId,
        user_id: userId,
        plan_id: plan_id,
        status: '1',
        plan_amount: plan_amount,
        provider_id: provider_id,
        country_name: country_name,
        country_code: country_code,
        country_flag: country_flag,
        server_location: server_location
      }
       
      //create dvpn plan
      await Models.DvpnPlansModel.create(dvpnData);

        return {
          status: true,
          message: "DVPN plan added successfully",
          walletId: walletId
        };

    } catch (error: any) {
      
      console.error("Error in addDvpnPlan>>>>", error);

      return {
        status: false,
        message: "Error in addDvpnPlan",
        error: error?.message
      };
    }
  }
  
  //get dvpn plans list
  public async getDvpnPlansList(queryOptions: any) {
    try {
         
        //get dvpn plans list
        const dvpnPlansList: any = await Models.DvpnPlansModel.findAndCountAll(queryOptions);
         
        return {
            dvpnPlansList: dvpnPlansList.rows,
            total: dvpnPlansList.count,
            page: queryOptions.page,
            per_page: queryOptions.limit,
            total_pages: Math.ceil(dvpnPlansList.count / queryOptions.limit)
        };

    } catch (error: any) {
      console.error("Error in getDvpnPlansList>>>>", error);
      return {
        status: false,
        message: "Error in getDvpnPlansList",
        error: error?.message
      };
    }
  }
  
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

