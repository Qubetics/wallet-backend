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
  cmc_id: {
    type: DataTypes.NUMBER,
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
