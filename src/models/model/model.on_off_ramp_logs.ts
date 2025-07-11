import { DataTypes, Model } from 'sequelize';
import db from "../../connections/db";
import { IOnOffRampLog } from '../interface/index.interface';

interface IOnOffRampLogInstance extends Model<IOnOffRampLog>, IOnOffRampLog { };

const Schema = {
    id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
    },
    slug: {
        type: DataTypes.STRING(191),
        allowNull: false
    },
    merchant_id: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    order_id: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    data: {
        type: DataTypes.JSON,
        allowNull: false
    },
};

const options = {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            unique: false,
            fields: ['slug']
        },
        {
            unique: false,
            fields: ['merchant_id']
        },
        {
            unique: false,
            fields: ['order_id']
        }
    ]
}
const OnOffRampLogModel = db.db_write.define<IOnOffRampLogInstance>('on_off_ramp_logs', Schema, options);

export default OnOffRampLogModel;