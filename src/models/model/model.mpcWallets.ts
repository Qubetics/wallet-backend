import { DataTypes, Model, Optional } from "sequelize";
import db from "../../helpers/common/db";
import { MpcWalletsInterface } from "../interface/interface.mpcWallets";

interface MpcWalletsCreationAttrs extends Optional<MpcWalletsInterface, "id"> { }

interface MpcWalletsInstance
  extends Model<MpcWalletsInterface, MpcWalletsCreationAttrs>,
  MpcWalletsInterface { }

const MpcWalletsModel = db.db_write.define<MpcWalletsInstance>(
  "mpc_wallets",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    wallet_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "wallets",
        key: "wallet_id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    coin_family: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    wallet_address: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    balance: {
      type: DataTypes.DECIMAL(30, 18),
      allowNull: false,
      defaultValue: 0,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    indexes: [
      {
        unique: true,
        fields: ["wallet_address"],
      },
      {
        fields: ["wallet_id"],
      },
    ],
    underscored: true,
    timestamps: false,
    tableName: "mpc_wallets",
  }
);


export default MpcWalletsModel;
