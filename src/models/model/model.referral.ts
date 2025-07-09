import { DataTypes, Model, Optional } from "sequelize";
import { ReferralInterface } from "../interface/interface.referrals";
import db from "../../helpers/common/db";

interface ReferralModel extends Optional<ReferralInterface, "id"> { }
interface ReferralInstance
    extends Model<ReferralInterface, ReferralModel>,
    ReferralInterface { }

const dataObj: any = {
    id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
    },
    referrer_from: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    referrer_to: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    used_referral_code: {
        type: DataTypes.STRING,
        allowNull: false
    },
    to_device_id: {
        type: DataTypes.STRING,
        allowNull: false
    }
};
const dataObjIndex = {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            unique: false,
            fields: ["referrer_to"],
        },
        {
            unique: false,
            fields: ["used_referral_code"],
        },
        {
            unique: false,
            fields: ["to_device_id"],
        }
    ],
};

const ReferralModel = db.db_write.define<ReferralInstance>("referrals", dataObj, dataObjIndex);

export default ReferralModel;


