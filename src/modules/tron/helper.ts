import { trxHelper } from '../../helpers/common/trx_helper';

class TronHelper {


    broadCastRawTx = async (
        trnx_raw: any,
        clbk: CallableFunction
    ) => {
        return await trxHelper.tronWeb.trx.sendRawTransaction(trnx_raw).then(async (result: any) => {
            if (result.result == true && result.result != undefined) {
                clbk(null, { result: true, data: result });
            } else {
                clbk(null, { result: false, data: result });
            }
        }).catch((error: Error) => {
            console.error('tronHelper-broadCastRawTx >>> ', error);
            clbk(error, null);
        });
    }

    public getEstimationGas = async (data: { fromAddress: string, toAddress: string, amount: number, is_bridge: number, coinData: any }) => {
        try {
            console.log('getEstimationGas data >>', data);
            return trxHelper.getEstimationGas(data)
        } catch {
            return { status: false, data: {} }
        }

    }


}
export let tronHelper = new TronHelper();
