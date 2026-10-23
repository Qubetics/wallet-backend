import { DataTypes, Model, Optional } from "sequelize";
import { SWFTCcoinsInterface } from "../interface/interface.swftc_coins";
import db from "../../helpers/common/db";
import CoinsModel from "./model.coins";

interface SWFTCCoinsModel extends Optional<SWFTCcoinsInterface, "id"> { }
interface SWFTCCoinsModelDataInterface
    extends Model<SWFTCcoinsInterface, SWFTCCoinsModel>,
    SWFTCcoinsInterface { }

const dataObj = {
    id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
    },
    coinId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    coinName: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    coinCode: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    coinImageUrl: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    mainNetwork: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    contact: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    coinDecimal: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    noSupportCoin: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    isSupportAdvanced: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    isSupportMemo: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    coinCodeShow: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    status: {
        type: DataTypes.INTEGER,
        allowNull: false,
    }
};

const SWFTCCoinsDataModel = db.db_write.define<SWFTCCoinsModelDataInterface>(
    "swftc_coins",
    dataObj, {
    underscored: false
});

SWFTCCoinsDataModel.belongsTo(CoinsModel, {
    foreignKey: "coinId",
    targetKey: "coin_id",
    as: "coin_data"
});
CoinsModel.hasOne(SWFTCCoinsDataModel, { foreignKey: 'coinId', sourceKey: "coin_id", as: "cross_chain_data" })

export default SWFTCCoinsDataModel;