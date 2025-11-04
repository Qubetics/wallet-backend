import { DataTypes, Model, Optional } from "sequelize";
import { DvpnPlansInterface } from "../interface/interface.dvpn_plans";
import db from "../../helpers/common/db";

interface DvpnPlansModel extends Optional<DvpnPlansInterface, "id"> { }
interface DvpnPlansInstance
    extends Model<DvpnPlansInterface, DvpnPlansModel>,
    DvpnPlansInterface { }

let dataObj: any = {
    id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
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
        references: {
            model: "users",
            key: "user_id",
          },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
      },
    plan_id: {
        type: DataTypes.STRING,
        allowNull: false,
        Comment: 'Plan ID',
    },
    status: {
        type: DataTypes.ENUM('0', '1'),
        allowNull: false,
        defaultValue: '1',
        Comment: 'Status',
    },
    plan_amount: {
        type: DataTypes.STRING,
        allowNull: false,
        Comment: 'Plan Amount',
    },
    provider_id: {
        type: DataTypes.STRING,
        allowNull: false,
        Comment: 'Provider ID',
    },
    country_name: {
        type: DataTypes.STRING,
        allowNull: false,
        Comment: 'Country Name',
    },
    country_code: {
        type: DataTypes.STRING,
        allowNull: false,
        Comment: 'Country Code',
    },
    country_flag: {
        type: DataTypes.STRING,
        allowNull: false,
        Comment: 'Country Flag',
    },
    server_location: {
        type: DataTypes.STRING,
        allowNull: true,
        Comment: 'Server Location',
    }
};

let dataObjIndex = {
    indexes: [
      {
        unique: false,
        fields: ["plan_id"],
      }
    ],
  };

const DvpnPlansModel = db.db_write.define<DvpnPlansInstance>("dvpn_plans", dataObj, dataObjIndex);

DvpnPlansModel.sync({alter : true})

export default DvpnPlansModel;