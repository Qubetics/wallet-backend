import { Response, Request } from "express";
import { OnlyControllerInterface } from "../../interfaces/controller.interface";
import { dvpnHelper } from "./helper";
import { GlblCode } from "../../constants/global_enum";
import DvpnBuildModel from "../../models/model/model.dvpn_build";
import s3Helper from "../../helpers/common/s3.helpers";
import { config } from "../../config";

const PLATFORM_EXTENSION_MAP: Record<string, string> = {
  linux: 'deb',
  windows: 'exe',
  macos: 'pkg',
};

const EXTENSION_PLATFORM_MAP: Record<string, string> = {
  deb: 'linux',
  exe: 'windows',
  pkg: 'macos'
};

class DvpnController implements OnlyControllerInterface {

  constructor() {
    this.initialize();
  }

  public initialize() { }
  
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

  public async uploadBuild(req: Request, res: Response) {
    try {
      let { platform, version } = req.body;
      const filePath = req.body.filePath as string;

      if (!filePath) {
        return res.status(GlblCode.ERROR_CODE).json({
          status: false,
          code: GlblCode.ERROR_CODE,
          message: 'No build file uploaded',
        });
      }

      const ext = filePath.toLowerCase().slice(filePath.lastIndexOf('.'));
      const extWithoutDot = ext.slice(1);

      // Infer platform from file extension when not provided
      if (!platform && extWithoutDot in EXTENSION_PLATFORM_MAP) {
        platform = EXTENSION_PLATFORM_MAP[extWithoutDot];
      }

      if (!platform || !(platform in PLATFORM_EXTENSION_MAP)) {
        return res.status(GlblCode.ERROR_CODE).json({
          status: false,
          code: GlblCode.ERROR_CODE,
          message: 'Platform is required (linux or windows or macos) or must be inferrable from file extension (.deb or .exe or .pkg)',
        });
      }

      const expectedExt = PLATFORM_EXTENSION_MAP[platform];
      if (`.${expectedExt}` !== ext) {
        return res.status(GlblCode.ERROR_CODE).json({
          status: false,
          code: GlblCode.ERROR_CODE,
          message: `Platform ${platform} requires .${expectedExt} file, got ${ext}`,
        });
      }

      const extension = ext.slice(1) as 'deb' | 'exe' | 'pkg';
      await DvpnBuildModel.create({
        platform: platform as 'linux' | 'windows' | 'macos',  // eslint-disable-line
        extension,
        file_path: filePath,
        version: version || null,
      });

      return res.status(GlblCode.SUCCESS).json({
        status: true,
        code: GlblCode.SUCCESS,
        message: 'Build uploaded successfully',
      });
    } catch (err) {
      console.error('Error in uploadBuild:', err);
      return res.status(GlblCode.ERROR_CODE).json({
        status: false,
        code: GlblCode.ERROR_CODE,
        message: 'Failed to upload build',
      });
    }
  }

  public async getBuildList(req: Request, res: Response) {
    try {
      const { platform, extension, limit = 10, page = 1 } = req.query;
      const perPage = Number(limit);
      const currentPage = Number(page);
      const offset = (currentPage - 1) * perPage;

      const where: Record<string, any> = {};
      if (platform) where.platform = platform;
      if (extension) where.extension = extension;

      const queryOptions = {
        where,
        attributes: ['id', 'platform', 'extension', 'file_path', 'version', 'created_at'],
        order: [['id', 'DESC']],
        limit: perPage,
        offset,
        page: currentPage,
      };

      const result: any = await dvpnHelper.getBuildList(queryOptions);
      if (result.status === false) {
        return res.status(GlblCode.ERROR_CODE).json({
          status: false,
          code: GlblCode.ERROR_CODE,
          message: result.message || 'Failed to fetch build list',
        });
      }

      const buildList = (result.build_list || []).map((b: any) => ({
        id: b.id,
        platform: b.platform,
        extension: b.extension,
        version: b.version,
        created_at: b.created_at,
        download_url: config.HUAWEI_OBS.PUBLIC_BASE_URL
          ? `${config.HUAWEI_OBS.PUBLIC_BASE_URL}/${b.file_path}`
          : null,
      }));

      return res.status(GlblCode.SUCCESS).json({
        status: true,
        code: GlblCode.SUCCESS,
        message: 'Build list fetched successfully',
        data: {
          build_list: buildList,
          total: result.total,
          page: result.page,
          per_page: result.per_page,
          total_pages: result.total_pages,
        },
      });
    } catch (err) {
      console.error('Error in getBuildList:', err);
      return res.status(GlblCode.ERROR_CODE).json({
        status: false,
        code: GlblCode.ERROR_CODE,
        message: 'Failed to fetch build list',
      });
    }
  }

  public async downloadBuild(req: Request, res: Response) {
    try {
      const { buildId, platform } = req.params;
      const build = await dvpnHelper.getBuildById(parseInt(buildId, 10), platform);

      if (!build) {
        return res.status(404).json({
          status: false,
          code: 404,
          message: 'Build not found or platform mismatch',
        });
      }

      const downloadUrl = config.HUAWEI_OBS.PUBLIC_BASE_URL
        ? s3Helper.getPublicDownloadUrl((build as any).file_path)
        : s3Helper.createPresignedDownloadUrl((build as any).file_path, 3600);

      return res.status(GlblCode.SUCCESS).json({
        status: true,
        code: GlblCode.SUCCESS,
        message: 'Download URL generated',
        data: { download_url: downloadUrl },
      });
    } catch (err) {
      console.error('Error in downloadBuild:', err);
      return res.status(GlblCode.ERROR_CODE).json({
        status: false,
        code: GlblCode.ERROR_CODE,
        message: 'Failed to get download URL',
      });
    }
  }

  public async getLatestBuild(req: Request, res: Response) {
    try {
      const { platform } = req.params;
      const build = await dvpnHelper.getLatestBuild(platform);

      if (build.status === false) {
        return res.status(404).json({
          status: false,
          code: 404,
          message: build.error || 'Failed to get latest build',
        });
      }

      const downloadUrl = config.HUAWEI_OBS.PUBLIC_BASE_URL
        ? s3Helper.getPublicDownloadUrl((build.build as any).file_path)
        : s3Helper.createPresignedDownloadUrl((build.build as any).file_path, 3600);

      return res.status(GlblCode.SUCCESS).json({
        status: true,
        code: GlblCode.SUCCESS,
        message: 'Latest build fetched successfully',
        data: { download_url: downloadUrl },
      });
    } catch (err) {
      console.error('Error in getLatestBuild:', err);
      return res.status(GlblCode.ERROR_CODE).json({
        status: false,
        code: GlblCode.ERROR_CODE,
        message: 'Failed to get latest build',
      });
    }
  }


  public async getLatestBuildVersion(req: Request, res: Response) {
    try {
      const { platform } = req.params;
      const buildVersion = await dvpnHelper.getLatestBuildVersion(platform);

      if (buildVersion?.status === false) {
        return res.status(404).json({
          status: false,
          code: 404,
          message: buildVersion?.error || 'Failed to get latest build version',
        });
      }

     
      return res.status(GlblCode.SUCCESS).json({
        status: true,
        code: GlblCode.SUCCESS,
        message: 'Latest build fetched successfully',
        data: { build_version: buildVersion?.buildVersion?.version },
      });
    } catch (err) {
      console.error('Error in getLatestBuild:', err);
      return res.status(GlblCode.ERROR_CODE).json({
        status: false,
        code: GlblCode.ERROR_CODE,
        message: 'Failed to get latest build',
      });
    }
  }
}

export const dvpnController = new DvpnController();