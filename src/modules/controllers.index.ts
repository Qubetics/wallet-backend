import UserRoute from "./user/route";
import WalletRoute from "./wallet/walletRoute";
import BtcRoute from "./btc/btcRoute";
import EthModule from "./eth/ethRoute";
import TicsRoute from "./tics/tics.Route"
import authRoute from "./auth/authRoute";
import DappRoute from "./dapp/dappRoute";
import TronRoute from "./tron/routes";
import BnbRoute from "./bsc/bscRoute";
import PolRoute from "./pol/polRoute";
import SolRoute from "./sol/solRoute";
import OnChainRoute from "./on-chain/routes";
import SwftcRoute from "./swftc/routes";
import OnOffRampRoute from "./on_off_ramp/routes";
import AdminRoute from "./admin/index";

const controllers = [
  new UserRoute(),
  new WalletRoute(),
  new BtcRoute(),
  new EthModule(),
  new TicsRoute(),
  new DappRoute(),
  new authRoute(),
  new TronRoute(),
  new BnbRoute(),
  new PolRoute(),
  new OnChainRoute(),
  new SwftcRoute(),
  new AdminRoute(),
  new SolRoute(),
  new OnOffRampRoute()
]

export default controllers;
