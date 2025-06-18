import { DataTypes, Model } from 'sequelize';
import db from '../../helpers/common/db';
import { IMenuList } from '../interface/interface.menu_lists';

interface IMenuListInstance extends Model<IMenuList>, IMenuList { };

const Schema = {
    id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING(191),
        allowNull: false
    },
    slug: {
        type: DataTypes.STRING(50),
        unique: true,
        allowNull: false
    },
};

const options = {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            unique: true,
            fields: ['slug']
        },
    ]
}

const MenuListsModel = db.db_write.define<IMenuListInstance>("menu_lists", Schema, options)



export default MenuListsModel;