import { DataTypes, Model, Optional } from "sequelize";
import { CoinPriceInFiatGraphInterface } from "../interface/interface.coin_price_in_fiat_graph";
import db from "../../connections/db";

interface CoinPriceInFiatCreationModel
  extends Optional<CoinPriceInFiatGraphInterface, "id"> { }
interface CoinPriceInFiatInstance
  extends Model<CoinPriceInFiatGraphInterface, CoinPriceInFiatCreationModel>,
  CoinPriceInFiatGraphInterface { }

const dataObj = {
  id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true,
    autoIncrement: true,
  },
  cmc_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  fiat_type: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  sparkline: {
    type: DataTypes.JSON,
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  // latest_price: {
  //   type: DataTypes.JSON,
  //   allowNull: true,
  // },
  // latest_price_source: {
  //   type: DataTypes.STRING,
  //   allowNull: true,
  // },
  // value: {
  //   type: DataTypes.DOUBLE,
  //   allowNull: true,
  // },
};
const dataObjIndex = {
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: false,
      fields: ["cmc_id"],
    },
    {
      unique: false,
      fields: ["type"],
    },
    {
      unique: false,
      fields: ["fiat_type"],
    },
    // {
    //   unique: false,
    //   fields: ["value"],
    // },
    {
      unique: false,
      fields: ["created_at"],
    },
    {
      unique: false,
      fields: ["updated_at"],
    }
  ],
};

const CoinPriceInFiatGraphModel = db.db_write.define<CoinPriceInFiatInstance>(
  "coin_price_in_fiat_graphs",
  dataObj,
  dataObjIndex
);

export default CoinPriceInFiatGraphModel;
