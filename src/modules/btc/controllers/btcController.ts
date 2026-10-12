import { Request, Response } from "express";
import { OnlyControllerInterface } from "../../../interfaces/controller.interface";
import { language } from "../../../constants";
import response from "../../../helpers/response/response.helpers";
import dbHelper from "../../../helpers/dbHelper";
import { bigNumberSafeMath } from "../../../helpers/common/globalFunctions";
import { config } from "../../../config";
import { global_helper } from "../../../helpers/common/global_helper";
import { utxobtc } from "../../../helpers/common/btc_helpers";
import { GlblBlockchainTxStatusEnum, GlblCode } from "../../../constants/global_enum";
import commonHelper from "../../../helpers/common/common.helpers";
import axios from "axios";
import { TrnxHistoryModel } from "../../../models";

class BTCController implements OnlyControllerInterface {
  constructor() {
    this.initialize();
  }
  public initialize = () => { }

  public send = async (req: Request, res: Response) => {
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


  // axios creator
  public createHttp = async (baseURL: string) => {
    return axios.create({
      baseURL,
      timeout: 8000,
    });
  }

  // 🔁 Fetch UTXOs with fallback
  public fetchUTXOs = async (address: string) => {
   const PROVIDERS = [
      {
        name: "MEMPOOL",
        baseURL: "https://mempool.space/testnet/api",
        type: "mempool",
      },
      {
        name: "BLOCKSTREAM",
        baseURL: "https://blockstream.info/testnet/api",
        type: "mempool",
      },
      {
        name: "BLOCKCYPHER",
        baseURL: "https://api.blockcypher.com/v1/btc/test3",
        type: "blockcypher",
      },
    ];


    for (const provider of PROVIDERS) {
      try {
        const http = await this.createHttp(provider.baseURL);

        if (provider.type === "blockcypher") {
          const res = await http.get(`/addrs/${address}?unspentOnly=true`);

          return (res.data.txrefs || []).map((utxo: any) => ({
            txid: utxo.tx_hash,
            vout: utxo.tx_output_n,
            value: utxo.value,
            status: {
              confirmed: !!utxo.confirmations,
              block_height: utxo.block_height || 0,
            },
          }));
        } else {
          const res = await http.get(`/address/${address}/utxo`);
          return res.data;
        }
      } catch (err: any) {
        console.warn(`❌ ${provider.name} failed:`, err.message);
        continue;
      }
    }

    throw new Error("All UTXO providers failed");
  }

  // 🎯 MAIN API
  public unspent = async (req: Request, res: Response) => {
    const lang: any = req.headers["content-language"] || "en";

    try {
      const address = req.params?.address;

      if (!address) {
        return res.status(400).json({
          status: false,
          message: "Address is required",
        });
      }

      // 1️⃣ Fetch UTXOs (with fallback)
      const utxos = await this.fetchUTXOs(address);

      if (!Array.isArray(utxos) || utxos.length === 0) {
        return response.success(res, {
          data: {
            status: true,
            data: [],
            message: "No UTXOs found",
          },
        });
      }

      // Use stable provider for TX details
      const http = await this.createHttp("https://mempool.space/testnet/api");

      // 2️⃣ Process UTXOs
      const res_data = await Promise.all(
        utxos.map(async (data: any) => {
          const unspent_data: any = {
            txid: data.txid,
            block_height: data.status?.block_height || 0,
            vout: data.vout,
            satoshis: data.value,
            confirmations: data.status?.confirmed ? 1 : 0,
            scriptPubKey: "",
            address: "",
            tx_raw: "",
          };

          try {
            const [txResult, hexResult] = await Promise.all([
              http.get(`/tx/${data.txid}`),
              http.get(`/tx/${data.txid}/hex`).catch(() => ({ data: "" })),
            ]);

            const tx = txResult.data;

            if (tx?.vout?.length > data.vout) {
              const voutObj = tx.vout[data.vout];

              unspent_data.scriptPubKey = voutObj?.scriptpubkey || "";
              unspent_data.address = voutObj?.scriptpubkey_address || "";
            }

            unspent_data.tx_raw = hexResult.data || "";
          } catch (err) {
            // silent fallback
          }

          return unspent_data;
        })
      );

      return response.success(res, {
        data: {
          status: true,
          data: res_data,
          message: language[lang].SUCCESS,
        },
      });

    } catch (err: any) {
      await commonHelper.save_error_logs("btc_unspent", err.message);
      console.error("ERROR in BTC unspent API", err);

      return res.status(500).json({
        status: false,
        message: err.message || "Internal Server Error",
      });
    }
  }


  public saveTransaction = async (req: Request, res: Response) => {
    try {
      console.log("req body btc saveTransaction >>>", req.body);

      const transactionHash = req.body.tx_hash;


      req.body.tx_hash = transactionHash;
      req.body.tx_type = req.body.tx_type,
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

  public updateTransactionStatus = async (req: Request, res: Response) => {
    try {
      console.log("req body btc updateTransactionStatus >>>", req.body);

      const { tx_status, tx_hash } = req.body;

      if (!tx_hash || !tx_status) {
        return response.error(res, {
          data: {
            status: false,
            message: "Transaction hash and status are required",
          },
        });
      }

      const transaction: any = await dbHelper.getTrnxHistoryByTxId(tx_hash);

      if (!transaction) {
        return response.error(res, {
          data: {
            status: false,
            message: "Transaction not found",
          },
        });
      }

      if (transaction) {
        await TrnxHistoryModel.update(
          { status: tx_status },
          { where: { tx_id: tx_hash, id: transaction.id } }
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
