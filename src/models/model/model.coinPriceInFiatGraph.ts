import { DataTypes, Model, Optional } from "sequelize";
import { CoinPriceInFiatGraphInterface } from "../interface/interface.coinPriceInFiatGraph";
import db from "../../helpers/common/db";

interface CoinPriceInFiatCreationModel
  extends Optional<CoinPriceInFiatGraphInterface, "id"> {}
interface CoinPriceInFiatInstance
  extends Model<CoinPriceInFiatGraphInterface, CoinPriceInFiatCreationModel>,
    CoinPriceInFiatGraphInterface {}

let dataObj = {
  id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true,
    autoIncrement: true,
  },
  // coin_id: {
  //   type: DataTypes.INTEGER,
  //   allowNull: false,
  // },
  cmc_id: {
    type: DataTypes.NUMBER,
    allowNull: true,
  },
  // coin_type: {
  //   type: DataTypes.STRING,
  //   allowNull: false,
  // },
  fiat_type: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  // value: {
  //   type: DataTypes.DOUBLE,
  //   allowNull: false,
  // },
  sparkline: {
    type: DataTypes.JSON,
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  // price_change_24h: {
  //   type: DataTypes.DOUBLE,
  //   allowNull: true,
  // },
  // price_change_percentage_24h: {
  //   type: DataTypes.DOUBLE,
  //   allowNull: true,
  // },
  // created_at: {
  //   type: DataTypes.DATE,
  //   allowNull: true,
  // },
  // updated_at: {
  //   type: DataTypes.DATE,
  //   allowNull: true,
  // },
  latest_price: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  latest_price_source: {
    type: DataTypes.STRING,
    allowNull: true,
  },
};
let dataObjIndex = {
  indexes: [
    {
      unique: false,
      fields: ["coin_type"],
    },
    {
      unique: false,
      fields: ["fiat_type"],
    },
  ],
};

const CoinPriceInFiatGraphModel = db.db_write.define<CoinPriceInFiatInstance>(
  "coin_price_in_fiat_graphs",
  dataObj,
  dataObjIndex
);

export default CoinPriceInFiatGraphModel;
