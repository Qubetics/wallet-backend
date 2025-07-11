import { DataTypes, Model, Optional } from "sequelize";
import { GasPriceInterface } from "../interface/interface.gasprice";
import db from "../../connections/db";

interface GasPriceCreationModel extends Optional<GasPriceInterface, "id"> { }
interface WalletInstance extends Model<GasPriceInterface, GasPriceCreationModel>, GasPriceInterface { }

const dataObj = {
    id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
    },
    coin_family: {
        type: DataTypes.TINYINT,
        allowNull: false,
    },
    safe_gas_price: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    propose_gas_price: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    fast_gas_price: {
        type: DataTypes.INTEGER,
        allowNull: false
    }
};

const dataObjIndex = {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            unique: false,
            fields: ["coin_family"],
        }
    ],
};

const GasPriceModel = db.db_write.define<WalletInstance>('gas_prices', dataObj, dataObjIndex);

export default GasPriceModel;