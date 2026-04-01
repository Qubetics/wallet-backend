import { DataTypes, Model, Optional } from "sequelize";
import { DvpnBuildInterface } from "../interface/interface.dvpn_build";
import db from "../../helpers/common/db";

interface DvpnBuildModel extends Optional<DvpnBuildInterface, "id"> { }
interface DvpnBuildInstance
    extends Model<DvpnBuildInterface, DvpnBuildModel>,
    DvpnBuildInterface { }

const dataObj: any = {
    id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
    },
    platform: {
        type: DataTypes.ENUM('linux', 'windows', 'macos'),
        allowNull: false,
    },
    extension: {
        type: DataTypes.ENUM('deb', 'exe', 'pkg'),
        allowNull: false,
    },
    file_path: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    version: {
        type: DataTypes.STRING,
        allowNull: true,
    },
};

const DvpnBuildModel = db.db_write.define<DvpnBuildInstance>("dvpn_builds", dataObj);

//will make this false later
DvpnBuildModel.sync({ alter: true });

export default DvpnBuildModel;
