import { DataTypes, Model } from 'sequelize';
import db from '../../connections/db';
import { IPermission } from "../interface/interface.permissions";

import MenuListsModel from './model_menu_lists.';

interface IPermissionInstance extends Model<IPermission>, IPermission { };

const dataObj = {
    id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
    },
    admin_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    menu_list_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    permission_status: {
        type: DataTypes.ENUM('0', '1'),
        default: '0'
    },
    permission_type: {
        type: DataTypes.ENUM('0', '1', '2'),
        default: '0'
    },
};

const options = {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            fields: ['admin_id']
        },
        {
            fields: ['menu_list_id']
        }
    ]
}

const PermissionsModel = db.db_write.define<IPermissionInstance>("permissions", dataObj, options)

// Define relationship with MenuListsModel
PermissionsModel.belongsTo(MenuListsModel, { foreignKey: 'menu_list_id', as: "menu_list_data" });
MenuListsModel.hasMany(PermissionsModel, { foreignKey: 'menu_list_id', as: "permission_data" });


export default PermissionsModel;