import { DataTypes, Model, Optional } from "sequelize";
import { AddressBookWalletInterface } from "../interface/interface.address_book_wallets";
import db from "../../helpers/common/db";
import AddressBookModel from "./model.address_book";
import CoinsModel from "./model.coins";

interface AddressBookCreationModel extends Optional<AddressBookWalletInterface, "id"> { }
interface AddressBookWalletInstance
    extends Model<AddressBookWalletInterface, AddressBookCreationModel>,
    AddressBookWalletInterface { }

const dataObj = {
    id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
    },
    address_book_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    wallet_address: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    coin_family: {
        type: DataTypes.TINYINT,
        allowNull: false,
    },
};
const options = {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            fields: ['address_book_id']
        },
        {
            fields: ['wallet_address']
        },
        {
            fields: ['name']
        },
        {
            fields: ['coin_family']
        }
    ]
}

const AddressBookWalletModel = db.db_write.define<AddressBookWalletInstance>("address_books_wallets", dataObj, options);
AddressBookModel.hasMany(AddressBookWalletModel, { foreignKey: "address_book_id", sourceKey: "id", as: "wallet_data" })
AddressBookWalletModel.belongsTo(CoinsModel, { foreignKey: "coin_family", targetKey: "coin_family", as: "coin_data" })
AddressBookWalletModel.belongsTo(AddressBookModel, { foreignKey: "address_book_id", targetKey: "id", as: "book_data" });

// AddressBookWalletModel.sync({ alter: true });
export default AddressBookWalletModel;


