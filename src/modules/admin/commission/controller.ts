import { Request, Response } from "express";
import { OnlyControllerInterface } from "../../../interfaces/controller.interface";
import { GlblCode, GlblMessages } from "../../../constants/global_enum";
import { language } from "../../../constants";
import { adminErrQueries, swapSettingQueries } from "../../../helpers/dbHelper";
import { ethers } from "ethers";
import redisHelper from "../../../helpers/common/redis";
import { config } from "../../../config";


class CommissionController implements OnlyControllerInterface {
    constructor() {
        this.initialize();
    }

    public initialize() { }

    public async getCommissionDetails(req: Request, res: Response) {
        let lang: any = req.headers['content-language'] || 'en';
        try {
            console.log("Entered into getCommissionDetails")
            let commissionDetails: any = {};
            commissionDetails = await redisHelper.getRedisSting(config.ON_CHAIN_DATA);
            if (commissionDetails) {
                commissionDetails = JSON.parse(commissionDetails);
            }else{
                commissionDetails = await swapSettingQueries.swapSettingsFindOne(
                    [['address', 'walletAddress'], 'percentage'],
                    { id: 1 },
                    [['id', 'ASC']])
                if (commissionDetails) {
                    await redisHelper.setRedisSting(config.ON_CHAIN_DATA, JSON.stringify(commissionDetails));
                }
            }
            return res.status(GlblCode.SUCCESS).send({
                message: GlblMessages.SUCCESS,
                status: true,
                code: GlblCode.SUCCESS,
                data: commissionDetails
            });

        } catch (err: any) {
            console.error("Error in getCommissionDetails API", err)
            await adminErrQueries.adminErrLogsCreate({ fx_name: "getCommissionDetails", error_msg: err.message || {} })
            return res.status(GlblCode.ERROR_CODE).send({
                code: GlblCode.ERROR_CODE,
                status: false,
                message: language[lang].CATCH_MSG
            });
        }
    }

    public async commissionDetails(req: Request, res: Response) {
        let lang: any = req.headers['content-language'] || 'en';
        try {
            console.log("Entered into commissionDetails")

            if (req.body.type == 1 || req.body.type == 2) {

                let setClause: any;

                if (req.body.type == 1) {
                    setClause = { percentage: req.body.value }
                } else {
                    const check = ethers.isAddress(req.body.value)
                    if(!check) return res.status(GlblCode.ERROR_CODE).send({
                        code: GlblCode.ERROR_CODE,
                        status: false,
                        message: language[lang].INVALID_WALLET_ADDRESS
                    });
                    setClause = { address: req.body.value }
                }

                const data = await swapSettingQueries.swapSettingsUpdate(
                    setClause,
                    { id: 1 })
                if (data) {
                    const commissionDetails = await swapSettingQueries.swapSettingsFindOne(
                        [['address', 'walletAddress'], 'percentage'],
                        { id: 1 },
                        [['id', 'ASC']])
                    if (commissionDetails) {
                        await redisHelper.setRedisSting(config.ON_CHAIN_DATA, JSON.stringify(commissionDetails));
                    }
                }   
            }

            return res.status(GlblCode.SUCCESS).send({
                message: GlblMessages.SUCCESS,
                status: true,
                code: GlblCode.SUCCESS,
                data: {}
            });

        } catch (err: any) {
            console.error("Error in commissionDetails API", err)
            await adminErrQueries.adminErrLogsCreate({ fx_name: "commissionDetails", error_msg: err.message || {} })
            return res.status(GlblCode.ERROR_CODE).send({
                code: GlblCode.ERROR_CODE,
                status: false,
                message: language[lang].CATCH_MSG
            });
        }
    }



}

export const commissionController = new CommissionController();
