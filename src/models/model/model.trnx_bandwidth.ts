import { DataTypes, Model, Optional } from "sequelize";
import { TrnxBandwidthInterface } from "../index";
import db from "../../helpers/common/db";

interface TrnxBandwidthModel extends Optional<TrnxBandwidthInterface, "id"> { }
interface TrnxBandwidthInstance
    extends Model<TrnxBandwidthInterface, TrnxBandwidthModel>,
    TrnxBandwidthInterface { }

let dataObj: any = {
    id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
    },
    tron_trc10_bandwidth: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    tron_trc20_bandwidth: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    tron_bandwidth: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
};

const TrnxBandwidthModel = db.db_write.define<TrnxBandwidthInstance>("tron_bandwidth", dataObj);
export default TrnxBandwidthModel;


