import { DataTypes, Model, Optional } from "sequelize";
import { CoinInterface } from "../interface/index.interface";
import db from "../../helpers/common/db";
import CoinPriceInFiatModel from "../model/model.coinPriceInFiat";
import WatchlistsModel from "./model.watchlist";
interface CoinCreationModel extends Optional<CoinInterface, "coin_id"> { }
interface CoinInstance
  extends Model<CoinInterface, CoinCreationModel>,
  CoinInterface { }

let dataObj = {
  coin_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true,
    autoIncrement: true,
  },
  coin_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  cmc_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
    is_on_cmc: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  coin_symbol: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  coin_image: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  coin_family: {
    type: DataTypes.TINYINT,
    allowNull: false,
  },
  coin_status: {
    type: DataTypes.TINYINT,
    allowNull: true,
  },
  is_token: {
    type: DataTypes.TINYINT,
    allowNull: true,
  },
  token_type: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  decimals: {
    type: DataTypes.DOUBLE,
    allowNull: true,
  },
  token_abi: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  token_address: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  for_swap: {
    type: DataTypes.TINYINT,
    allowNull: true,
  },
  added_by: {
    type: DataTypes.ENUM("admin", "user", "swap"),
    allowNull: true,
  },
  graph_source: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  graph_pair: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  pair_address: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  is_on_trading_view: {
    type: DataTypes.TINYINT,
    allowNull: true,
  },
  is_on_moralis_inactive: {
    type: DataTypes.TINYINT,
    allowNull: true,
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
let dataObjIndex = {
  indexes: [
    {
      unique: true,
      fields: ["coin_id"],
    },
    {
      unique: false,
      fields: ["coin_symbol"],
    },
    {
      unique: false,
      fields: ["coin_family"],
    },
    {
      unique: false,
      fields: ["coin_status"],
    },
    {
      unique: false,
      fields: ["is_token"],
    },
    {
      unique: false,
      fields: ["token_type"],
    },
    {
      unique: false,
      fields: ["token_address"],
    },
  ],
};

const CoinsModel = db.db_write.define<CoinInstance>(
  "coins",
  dataObj,
  dataObjIndex
);

CoinsModel.belongsTo(CoinPriceInFiatModel, {
  foreignKey: "cmc_id",
  targetKey: "cmc_id",
  as: "fiat_price_data",
});
CoinsModel.belongsTo(WatchlistsModel, {
  foreignKey: "coin_id",
  targetKey: "coin_id",
  as: "watchlist_data",
});
CoinsModel.hasOne(CoinsModel, {
  foreignKey: "coin_family",
  sourceKey: "coin_family",
  as: "native_coins_data",
});
export default CoinsModel;
