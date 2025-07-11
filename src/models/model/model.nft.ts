import { DataTypes, Model, Optional } from "sequelize";
import { NFTInterface } from "../interface/interface.nft";
import db from "../../connections/db";
import CoinsModel from '../model/model.coins';

interface NFTCreationModel extends Optional<NFTInterface, "id"> { }
interface NFTInterfaceInstance
  extends Model<NFTInterface, NFTCreationModel>,
  NFTInterface { }

let dataObj = {
  id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true,
    autoIncrement: true,
  },
  wallet_address: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {},
  },
  token_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {},
  },
  image: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {},
  },
  image_extension: {
    type: DataTypes.STRING,
    allowNull: true
  },
  text_data: {
    type: DataTypes.JSON,
    allowNull: true
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {},
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {},
  },
  name: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {},
  },
  coin_family: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  token_address: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {},
  },
  available: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {},
  },
  token_uri: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {},
  },
  balance: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  token_type: {
    type: DataTypes.STRING,
    allowNull: true
  },
  attributes: {
    type: DataTypes.JSON,
    allowNull: true
  }
};

const dataObjIndex = {
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: false,
      fields: ["coin_family"],
    },
    {
      unique: false,
      fields: ["wallet_address"],
    },
    {
      unique: false,
      fields: ["token_id"],
    },
    {
      unique: false,
      fields: ["token_address"],
    }
  ],
};

const NFTModelModel = db.db_write.define<NFTInterfaceInstance>("nfts", dataObj, dataObjIndex);
NFTModelModel.belongsTo(CoinsModel, {
  foreignKey: "coin_id",
  as: "coinData",
});


export default NFTModelModel;