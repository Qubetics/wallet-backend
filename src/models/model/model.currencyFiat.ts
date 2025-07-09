import { DataTypes, Model, Optional } from "sequelize";
import { CurrencyFiatInterface } from "../interface/interface.currencyFiat";
import db from "../../helpers/common/db";

interface CurrencyFiatCreationModel
  extends Optional<CurrencyFiatInterface, "currency_id"> { }
interface CurrencyFiatInstance
  extends Model<CurrencyFiatInterface, CurrencyFiatCreationModel>,
  CurrencyFiatInterface { }

const dataObj = {
  currency_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true,
    autoIncrement: true,
  },
  currency_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  currency_code: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  price_in_usd: {
    type: DataTypes.DECIMAL,
    allowNull: false,
  },
  status: {
    type: DataTypes.TINYINT,
    allowNull: false,
  },
  image: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  currency_symbol: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  uuid: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
};

const dataObjIndex = {
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: false,
      fields: ["currency_name"],
    },
    {
      unique: false,
      fields: ["currency_code"],
    },
    {
      unique: false,
      fields: ["status"],
    },
  ],
};

const CurrencyFiatModel = db.db_write.define<CurrencyFiatInstance>(
  "currency_fiats",
  dataObj,
  dataObjIndex
);

export default CurrencyFiatModel;
