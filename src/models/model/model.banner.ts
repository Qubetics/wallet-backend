import { DataTypes, Model, Optional } from "sequelize";
import { BannerInterface } from "../interface/interface.banner";
import db from "../../connections/db";

interface BannerModel extends Optional<BannerInterface, "id"> { }
interface BannerInstance
    extends Model<BannerInterface, BannerModel>,
    BannerInterface { }

const dataObj: any = {
    id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
    },
    status: {
        type: DataTypes.ENUM('0', '1'),
        allowNull: false,
        defaultValue: '1'
    },
    link: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    imagePath: {
        type: DataTypes.STRING,
        allowNull: false,
    }
};

const options = {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            fields: ['status']
        }
    ]
}

const BannerModel = db.db_write.define<BannerInstance>("banners", dataObj, options);


export default BannerModel;