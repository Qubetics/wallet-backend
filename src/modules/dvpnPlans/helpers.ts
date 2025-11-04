import * as Models from "../../models/model/index";

class DvpnPlansHelpers {

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
      

      //if dvpn plan already exists, return error
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

  public async getDvpnPlansList(userId: number, wallet_address: string, obj: any) {
    try {
        console.log("this is getDvpnPlansList", userId, wallet_address, obj);
         
        //get dvpn plans list
        const dvpnPlansList: any = await Models.DvpnPlansModel.findAndCountAll({
          where: {
            user_id: userId,
            wallet_address: wallet_address
          },
          ...obj
        });
         
        //return dvpn plans list
        return {
            dvpnPlansList: dvpnPlansList.rows,
            total: dvpnPlansList.count,
            page: obj.page,
            per_page: obj.limit,
            total_pages: Math.ceil(dvpnPlansList.count / obj.limit)
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


}

export const dvpnPlansHelper = new DvpnPlansHelpers()


