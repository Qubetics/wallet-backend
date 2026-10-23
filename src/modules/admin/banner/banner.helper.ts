import BannerModel from "../../../models/model/model.banner";


class BannerHelpers {
    constructor() {
      this.initialize();
    }
    public initialize() { }
    
    public async get_banner_list(obj: any){
        try {
            const banner_list : any = await BannerModel.findAndCountAll({
                where: obj.where,
                attributes : obj.attributes,
                order: obj.order,
                limit: obj.limit,
                offset: obj.offset,
                include: obj.includes
            });
          
            return {
                banner_list: banner_list.rows,
                total: banner_list.count,
                page: obj.page,
                per_page: obj.limit,
                total_pages: Math.ceil(banner_list.count / obj.limit)
            };
        } catch (err: any) {
            console.error("Error in get_banner_list", err)
        }
    }


    
   
  }
  export const BannerHelper = new BannerHelpers();