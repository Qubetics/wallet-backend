import { DataTypes, Model, Optional } from "sequelize";
import { SwapSettingsInterface } from "../interface/interface.swap_setting";
import db from "../../helpers/common/db";


interface SwapSettingsModel extends Optional<SwapSettingsInterface, "id"> { }
interface SwapSettingsInstance
    extends Model<SwapSettingsInterface, SwapSettingsModel>,
    SwapSettingsInterface { }

const dataObj: any = {
    id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
    },
    address: {
        type: DataTypes.STRING,
        allowNull: false
    },
    percentage: {
        type: DataTypes.STRING,
        allowNull: false
    }
};
const dataObjIndex = {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
};

const SwapSettingsModel = db.db_write.define<SwapSettingsInstance>("swap_settings", dataObj, dataObjIndex);

export default SwapSettingsModel;


