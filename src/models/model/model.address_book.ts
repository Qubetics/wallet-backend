import { DataTypes, Model, Optional } from "sequelize";
import { AddressBookInterface } from "../interface/interface.address_book";
import db from "../../connections/db";

interface AddressBookCreationModel extends Optional<AddressBookInterface, "id"> { }
interface AddressBookInstance
  extends Model<AddressBookInterface, AddressBookCreationModel>,
  AddressBookInterface { }

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
  address: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false
  }
};

const options = {
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['address']
    },
    {
      fields: ['name']
    }
  ]
}

const AddressBookModel = db.db_write.define<AddressBookInstance>("address_books", dataObj, options);

export default AddressBookModel;

