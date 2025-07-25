import { DataTypes, Model, Optional } from "sequelize";
import { IntentTrnxHistoryInterface } from "../interface/interface.intentTrnxHistory";
import db from "../../helpers/common/db";
import TrnxHistoryModel from "./model.trnxHistory";

interface IntentTrnxHistoryCreationModel extends Optional<IntentTrnxHistoryInterface, "id"> { }
interface IntentTrnxHistoryInstance
    extends Model<IntentTrnxHistoryInterface, IntentTrnxHistoryCreationModel>,
    IntentTrnxHistoryInterface { }

let dataObj = {
    id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    tx_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    tx_hash: {
        type: DataTypes.STRING,
        allowNull: true
    },
    status: {
        type: DataTypes.STRING,
        allowNull: true
    },
    fees: {
        type: DataTypes.DOUBLE,
        allowNull: false,
        defaultValue: 0
    },
};

let dataObjIndex = {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
}

const IntentTrnxHistoryModel = db.db_write.define<IntentTrnxHistoryInstance>(
    "intent_trnx_history",
    dataObj,
    dataObjIndex
);
IntentTrnxHistoryModel.sync({alter:true})

IntentTrnxHistoryModel.belongsTo(TrnxHistoryModel, { foreignKey: 'tx_id', targetKey: 'id', as: "trnx_history" });
TrnxHistoryModel.hasOne(IntentTrnxHistoryModel, {
    foreignKey: 'tx_id',
    sourceKey: 'id',
    as: 'intent_data' // or any alias you like
  });

export default IntentTrnxHistoryModel;