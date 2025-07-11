import * as Models from '../../models/model/index';
import commonHelper from '../common/common';

class PermissionsQueries {

    public permissionsModal: any = Models.PermissionsModel;

    public async getAdminPermissions(obj: any) {

        try {
            const data: any = await this.permissionsModal.findAll({
                where: {
                    admin_id: obj.admin_id
                },
                attributes: obj.attributes,
                include: obj.include
            })
            return data;
        } catch (err: any) {
            console.error("Error in getAdminPermissions>>", err)
            await commonHelper.saveErrorLogs("getAdminPermission err", err.message);
            throw err;
        }

    }

}

const permissionsQueries = new PermissionsQueries();
export default permissionsQueries;
