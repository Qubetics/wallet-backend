import { DataTypes, Model, Optional } from "sequelize";
import { ResetGraphDataInterface } from "../interface/index.interface";
import db from "../../connections/db";

interface ResetGraphCreationModel extends Optional<ResetGraphDataInterface, "id"> { }
interface ResetGraphInstance extends Model<ResetGraphDataInterface, ResetGraphCreationModel>, ResetGraphDataInterface { }

const dataObj = {
    id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
    },
    cmc_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    graph_type: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    created_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    updated_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
};
const dataObjIndex = {
    createdAt: false,
    updatedAt: false,
    indexes: [
        {
            unique: false,
            fields: ["cmc_id"],
        },
        {
            unique: false,
            fields: ["graph_type"],
        },
    ],
};

const ResetGraphWrite = db.db_write.define<ResetGraphInstance>('reset_graph_data', dataObj, dataObjIndex);


export default ResetGraphWrite;