import * as Models from "../../models/model/index";

class DvpnHelpers {

  //get dvpn session history
  public async getDvpnSessionHistory(queryOptions: any) {
    try {
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

  //get build list with platform/extension filters
  public async getBuildList(queryOptions: any) {
    try {
      const result: any = await Models.DvpnBuildModel.findAndCountAll({
        where: queryOptions.where,
        attributes: queryOptions.attributes,
        order: queryOptions.order,
        limit: queryOptions.limit,
        offset: queryOptions.offset,
      });
      return {
        build_list: result.rows,
        total: result.count,
        page: queryOptions.page,
        per_page: queryOptions.limit,
        total_pages: Math.ceil(result.count / queryOptions.limit)
      };
    } catch (error: any) {
      console.error("Error in getBuildList>>>>", error);
      return {
        status: false,
        message: "Error in getBuildList",
        error: error?.message
      };
    }
  }

  //get build by id, optionally verify platform match
  public async getBuildById(buildId: number, platform?: string) {
    try {
      const where: any = { id: buildId };
      if (platform) {
        where.platform = platform;
      }
      const build = await Models.DvpnBuildModel.findOne({ where });
      return build;
    } catch (error: any) {
      console.error("Error in getBuildById>>>>", error);
      return null;
    }
  }

  public async getLatestBuild(platform: string) {
    try {
      // Wrap response in an object for consistency and future extensibility
      const build = await Models.DvpnBuildModel.findOne({ 
        where: { platform }, 
        order: [['created_at', 'DESC']], 
        limit: 1, 
        attributes: ['id', 'file_path', 'created_at'] 
      });
      return { status: !!build, build };
    } catch (error: any) {
      console.error("Error in getLatestBuild>>>>", error);
      return { status: false, error: error?.message, build: null };
    }
  }

  public async getLatestBuildVersion(platform: string) {
    try {
      // Wrap response in an object for consistency and future extensibility
      const buildVersion = await Models.DvpnBuildModel.findOne({ 
        where: { platform }, 
        order: [['created_at', 'DESC']], 
        limit: 1, 
        attributes: ['id', 'version', 'created_at'] 
      });
      return { status: !!buildVersion, buildVersion };
    } catch (error: any) {
      console.error("Error in getLatestBuildVersion>>>>", error);
      return { status: false, error: error?.message, buildVersion: null };
    }
  }
}

export const dvpnHelper = new DvpnHelpers()


