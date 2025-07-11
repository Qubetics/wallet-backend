import { DataTypes, Model, Optional } from "sequelize";
import { CustomTokenInterface } from "../interface/index.interface";
import db from "../../connections/db";
// import WalletModel from "./model.wallets";
// import CoinsModel from "./model.coins";

interface CustomTokenCreationModel extends Optional<CustomTokenInterface, "id"> { }
interface CustomTokenInstance extends Model<CustomTokenInterface, CustomTokenCreationModel>, CustomTokenInterface { }

const dataObj = {
    id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    coin_id: {
        type: DataTypes.INTEGER,
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
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            unique: false,
            fields: ["user_id"],
        },
        {
            unique: false,
            fields: ["coin_id"],
        }
    ],
};

const CustomTokennModel = db.db_write.define<CustomTokenInstance>("custom_tokens", dataObj, dataObjIndex);

// CustomTokennModel.hasMany(WalletModel, {
//     foreignKey: "user_id",
//     sourceKey: "user_id",
// });
// CustomTokennModel.hasMany(CoinsModel, {
//     foreignKey: "coin_id",
//     sourceKey: "coin_id",
// });

export default CustomTokennModel;