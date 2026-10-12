import { Request, Response } from "express";
import { OnlyControllerInterface } from "../../../interfaces/controller.interface";
import { language } from "../../../constants";
import response from "../../../helpers/response/response.helpers";
import dbHelper from "../../../helpers/dbHelper";
import { bigNumberSafeMath } from "../../../helpers/common/globalFunctions";
import { config } from "../../../config";
import { utxobtc } from "../../../helpers/common/btc_helpers";
import { GlblBlockchainTxStatusEnum, GlblCode } from "../../../constants/global_enum";
import commonHelper from "../../../helpers/common/common.helpers";
import axios from "axios";
import { TrnxHistoryModel } from "../../../models";

class BTCController implements OnlyControllerInterface {
  constructor() {
    this.initialize();
  }
  public initialize() { }
  
  public async send(req: Request, res: Response) {
    let lang: any = req.headers['content-language'] || 'en';
    try {
      console.log("req body btc send >>>", req.body)

      const gasBtc: any = req.body.gas_estimate / 100000000;
      const withdrawAmount: any = req.body.amount;
      const userBtcBalance: any = await utxobtc.get_balance(req.body.from);
      //Validate balance
      const finalWithdrawAmount: any = bigNumberSafeMath(
        withdrawAmount,
        "+",
        gasBtc
      );
      if (userBtcBalance < finalWithdrawAmount) {
        return res
          .status(GlblCode.ERROR_CODE)
          .send({ status: false, message: language[lang].INSUFFICIENT });
      }
      req.body.tx_hash = "";
      req.body.tx_type = req.body.tx_type || "WITHDRAW";
      req.body.nonce = req.body.nonce ? req.body.nonce : 0;
      req.body.gas_price = req.body.eth_gas_price ? req.body.eth_gas_price : 0;
      req.body.gas_estimate = req.body.gas_estimate ? req.body.gas_estimate : 0;
      req.body.eth_gas_price = req.body.gas_estimate
        ? req.body.gas_estimate
        : 0;
      req.body.tx_status = "completed";
      const dataFromBtc: any = await utxobtc.sendRawTransaction(req.body.tx_raw);
      if (dataFromBtc.status == false) {
        return response.error(res, {
          data: {
            status: false,
            message: dataFromBtc.custom_err_msg || language[lang].CATCH_MSG
          },
        });
      }
      req.body.tx_hash = dataFromBtc.data.result;
      console.log("request body hash", req.body.tx_hash)
      console.log("send Raw Trnx Hash", dataFromBtc.data.result)

      let resultStatus: any = await dbHelper.saveWithdrawTxDetails(req);
      if (resultStatus.status && resultStatus.status == true) {
        return response.success(res, {
          data: {
            status: true,
            message: language[lang].TRANSACTION_BROADCAST_SUCCESSFULLY,
            data: dataFromBtc.data.result,
          },
        });
      } else {
        return response.error(res, {
          data: {
            status: false,
            message: language[lang].TRANSACTION_BROADCAST_FAILED,
            data: {},
          },
        });
      }
    } catch (err: any) {
      await commonHelper.save_error_logs("btc_send", err.message);
      console.error("err", err as Error);
    }
  }
  public async unspent(req: Request, res: Response) {
    let lang: any = req.headers['content-language'] || 'en';
    try {
      let btc_config = {
        method: 'get',
        url: `${config.NODE.BTC_RPC_URL}/api/v2/utxo/${req.params?.address}`,
        headers: {
          'apikey': `${config.NODE.BTC_API_KEY}`,
          'Content-Type': 'application/json',
        }
      };
      const result: any = await axios(btc_config);
      let res_data: any = [];
      if (result && result.data.length > 0) {
        const i = 0;
        for await (let data of result.data) {
          const unspent_data: any = {
            txid: data.txid,
            block_height: data.height,
            vout: data.vout,
            satoshis: data.value,
            confirmations: data.confirmations
          }
          if (i == 0) {
            const btc_config1 = {
              method: 'get',
              url: `${config.NODE.BTC_RPC_URL}/api/v2/tx-specific/${data.txid}`,
              headers: {
                'apikey': `${config.NODE.BTC_API_KEY}`,
                'Content-Type': 'application/json',
              }
            };
            const result: any = await axios(btc_config1);
            const transaction_data: any = result.data;
            if (transaction_data && transaction_data.vout !== undefined && transaction_data.vout.length > 0) {
              unspent_data.tx_raw = transaction_data.hex
              const unspent_vout = await transaction_data.vout.filter((vout: any) => vout.n == data.vout);
              if (unspent_vout.length > 0) {
                unspent_data.scriptPubKey = unspent_vout[0].scriptPubKey.hex;
                unspent_data.address = unspent_vout[0].scriptPubKey.address
              } else {
                unspent_data.scriptPubKey = '';
                unspent_data.address = 0;
              }
            }
          }
          res_data.push(unspent_data);
        }
      }
      return response.success(res, {
        data: {
          status: true,
          data: res_data,
          message: language[lang].SUCCESS
        },
      });
    } catch (err: any) {
      await commonHelper.save_error_logs("btc_unspent", err.message);
      console.error("ERROR in BTC unspent API", err)
    }
  }
   

  public async saveTransaction(req: Request, res: Response) {
    try {
      console.log("req body btc saveTransaction >>>", req.body);

      const transactionHash = req.body.tx_hash;

   
      req.body.tx_hash = transactionHash;
      req.body.tx_type = req.body.tx_type ,
      req.body.nonce = req.body.nonce ? req.body.nonce : 0;
      req.body.gas_price = req.body.eth_gas_price ? req.body.eth_gas_price : 0;
      req.body.gas_estimate = req.body.gas_estimate ? req.body.gas_estimate : 0;
      req.body.eth_gas_price = req.body.gas_estimate
        ? req.body.gas_estimate
        : 0;
      req.body.tx_status = "pending";
      req.body.blockchain_status = GlblBlockchainTxStatusEnum.CONFIRMED;

  
      const resultStatus: any = await dbHelper.saveWithdrawTxDetails(req);

      if (resultStatus.status && resultStatus.status == true) {
        return response.success(res, {
          data: {
            status: true,
            message: "Transaction saved successfully",
            data: {},
          },
        });
      } else {
        return response.error(res, {
          data: {
            status: false,
            message: "Transaction save failed",
            data: {},
          },
        });
      }
    } catch (err: any) {
      await commonHelper.save_error_logs("btc_send", err.message);
      console.error("err", err as Error);
    }
  }

  public async updateTransactionStatus(req: Request, res: Response) {
    try {
      console.log("req body btc updateTransactionStatus >>>", req.body);

      const { tx_status, tx_hash } = req.body;

      if(!tx_hash || !tx_status) {
        return response.error(res, {
          data: {
            status: false,
            message: "Transaction hash and status are required",
          },
        });
      }

      const  transaction: any = await dbHelper.getTrnxHistoryByTxId(tx_hash);

      if(!transaction) {
        return response.error(res, {
          data: {
            status: false,
            message: "Transaction not found",
          },
        });
      }

      if(transaction) {
        await TrnxHistoryModel.update(
          { status: tx_status },
          { where: { tx_id: tx_hash, id : transaction.id } }
        );
      }
     
        return response.success(res, {
          data: {
            status: true,
            message: "Transaction status updated successfully",
            data: {},
          },
        });
      
    } catch (err: any) {
      await commonHelper.save_error_logs("btc_send", err.message);
      console.error("err", err as Error);
    }
  }


}

let btcController = new BTCController();

export default btcController;
