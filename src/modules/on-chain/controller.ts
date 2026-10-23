import { OnlyControllerInterface } from "../../interfaces/controller.interface";
import { Request, Response } from "express";
import { language } from "../../constants";
import commonHelper from "../../helpers/common/common.helpers";
import response from "../../helpers/response/response.helpers";
import { OnChainHelper } from "./helper";
import { config } from "../../config";
import redisHelper from "../../helpers/common/redis";
import * as Models from "../../models/model"
import { global_helper } from "../../helpers/common/global_helper";
import { bigNumberSafeMath } from "../../helpers/common/globalFunctions";

class onChainController implements OnlyControllerInterface {

    constructor() {
        this.initialize();
    }

    public initialize() { }
    public OneinchSwapApi = async (req: Request, res: Response) => {
        let lang: any = req.headers['content-language'] || 'en';
        const { chain_id, src, dst, amount, from, slippage, fee, referrer, mainRouteParts, parts, coin_family } = req.body
        try {
            let responseAPI = await OnChainHelper.OneInchSwapApi(chain_id, src, dst, amount, from, slippage, fee, referrer, mainRouteParts, parts);

            return response.success(res, {
                data: {
                    status: true,
                    data: responseAPI
                },
            });
        } catch (error: any) {
            console.error("Error in on-chain > OneinchSwapApi.", error.response.data);
            await commonHelper.save_error_logs("OneinchSwapApi", error.message);
            let description = error?.response?.data?.description || '';
            let message = (error?.response?.data?.statusCode !== 200 && description !== '') 
                ? description 
                : language[lang].CATCH_MSG;
            
                const match = description.match(/Not enough (0x[a-fA-F0-9]{40}) balance\. Amount:\s*(\d+)\.?\s*Balance:\s*(\d+)/);

                if (match) {
                    const address = match[1];
                    let amount = match[2];
                    let balance = match[3];
                    const token = await global_helper.return_decimals_name_symbol(
                        coin_family,
                        address,
                        lang
                    );
                    const decimal = 10 ** token.decimals
                    amount = bigNumberSafeMath(amount,'/' ,decimal)
                    balance = bigNumberSafeMath(balance,'/' ,decimal)
                    return response.error(res, {
                        data: { status: false, message: `Not enough ${token.name} balance. Amount: ${amount}. Balance: ${balance}`, data: {}}
                    }); 
                }
                
                const check = description.includes("cannot estimate")
                if (check) {
                    return response.error(res, {
                        data: { status: false, message: 'Unknown Error: "execution reverted". Try increasing your slippage tolerance', data: {}}
                    }); 
                }
            return response.error(res, {
                data: {status: false, message: message, data: {} },
            });
        }
    }
    public OneinchQuotesApi = async (req: Request, res: Response) => {
        let lang: any = req.headers['content-language'] || 'en';
        try {
            const { chain_id, src, dst, amount, fee } = req.body

            let responseAPI = await OnChainHelper.OneInchQuotesApi(chain_id, src, dst, amount, fee);
            return response.success(res, {
                data: {
                    status: true,
                    data: responseAPI
                },
            });

        } catch (error: any) {
            console.error("Error in on-chain > OneinchQuotesApi.", error);
            await commonHelper.save_error_logs("OneinchQuotesApi", error.message);
            const description = error?.response?.data?.description || '';
            let message = language[lang].CATCH_MSG;
            if (description.toLowerCase().includes('insufficient liquidity')) {
                message = 'Swap failed due to insufficient liquidity.';
            } 
            return response.error(res, {
                data: { status: false, message: message, data: {} },
            });
        }
    }
    public OneinchTokenApproval = async (req: Request, res: Response) => {
        let lang: any = req.headers['content-language'] || 'en';
        try {
            const { chain_id, tokenAddress, amount } = req.body
            let responseAPI = await OnChainHelper.TokenApprovalApi(chain_id, tokenAddress, amount);
            return response.success(res, {
                data: {
                    status: true,
                    data: responseAPI
                },
            });
        } catch (error: any) {
            console.error("Error in on-chain > OneinchTokenApproval.", error);
            await commonHelper.save_error_logs("OneinchTokenApproval", error.message);
            return response.error(res, {
                data: { status: false, message: language[lang].CATCH_MSG, data: {} },
            });
        }
    }
    public OneinchSpenderInfo = async (req: Request, res: Response) => {
        let lang: any = req.headers['content-language'] || 'en';
        try {
            const { chain_id } = req.body
            let responseAPI = await OnChainHelper.spenderInfoApi(chain_id);
            return response.success(res, {
                data: {
                    status: true,
                    data: responseAPI
                },
            });
        } catch (error: any) {
            console.error("Error in on-chain > OneinchSpenderInfo.", error);
            await commonHelper.save_error_logs("OneinchSpenderInfo", error.message);
            return response.error(res, {
                data: { status: false, message: language[lang].CATCH_MSG, data: {} },
            });
        }
    }
    public OneinchAllowanceCheck = async (req: Request, res: Response) => {
        let lang: any = req.headers['content-language'] || 'en';
        try {
            console.log("req body OneinchAllowanceCheck >>>", req.body)
            const { chain_id, tokenAddress, walletAddress } = req.body
            let responseAPI = await OnChainHelper.allowanceCheckOneInch(chain_id, tokenAddress, walletAddress);
            return response.success(res, {
                data: {
                    status: true,
                    data: responseAPI
                },
            });
        } catch (error: any) {
            console.error("Error in on-chain > OneinchAllowanceCheck.", error);
            await commonHelper.save_error_logs("OneinchAllowanceCheck", error.message);
            return response.error(res, {
                data: { status: false, message: language[lang].CATCH_MSG, data: {} },
            });
        }
    }
    public OneinchTokensApi = async (req: Request, res: Response) => {
        let lang: any = req.headers['content-language'] || 'en';
        try {
            const { chain_id } = req.body
            let responseAPI = await OnChainHelper.tokensApiOneInch(chain_id);
            return response.success(res, {
                data: {
                    status: true,
                    data: responseAPI
                },
            });
        } catch (error: any) {
            console.error("Error in on-chain > OneinchTokensApi.", error);
            await commonHelper.save_error_logs("OneinchTokensApi", error.message);
            return response.error(res, {
                data: { status: false, message: language[lang].CATCH_MSG, data: {} },
            });
        }
    }
    public commisionData = async (req: Request, res: Response) => {
        let lang: any = req.headers['content-language'] || 'en';
        try {
            console.log('ON_CHAIN_DATA >>>', config.ON_CHAIN_DATA)
            let onChainData: any = await redisHelper.getRedisSting(config.ON_CHAIN_DATA);
            console.log('onChainData >>>', onChainData);
            if (onChainData) {
                onChainData = JSON.parse(onChainData);
            } else {
                let fetch_data: any = await Models.SwapSettingsModel.findOne({
                    attributes: [['address', 'walletAddress'], 'percentage'],
                    where: { id: 1 },
                    raw: true
                });
                if (fetch_data && fetch_data?.percentage !== undefined) {
                    fetch_data.percentage = Number(fetch_data?.percentage)
                }
                if (fetch_data) {
                    await redisHelper.setRedisSting(config.ON_CHAIN_DATA, JSON.stringify(fetch_data));
                }
                onChainData = fetch_data;
            }
            return response.success(res, {
                data: {
                    status: true,
                    data: onChainData,
                    message: "On-chain commission data get successfully."
                },
            });
        } catch (error: any) {
            console.error("Error in on-chain > commisionData.", error);
            await commonHelper.save_error_logs("commisionData", error.message);
            return response.error(res, {
                data: { status: false, message: language[lang].CATCH_MSG, data: {} },
            });
        }
    }
}
export const OnChainController = new onChainController();