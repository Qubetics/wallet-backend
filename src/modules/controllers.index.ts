import UserRoute from "./user/route";
import WalletRoute from "./wallet/route";
import BtcRoute from "./btc/route";
import EthModule from "./eth/route";
import TicsRoute from "./tics/route"
import authRoute from "./auth/route";
import TronRoute from "./tron/route";
import BnbRoute from "./bsc/route";
import PolRoute from "./pol/route";
import SolRoute from "./sol/route";
import OnChainRoute from "./on-chain/route";
import SwftcRoute from "./swftc/route";
import AdminRoute from "./admin/index";

const controllers = [
  new UserRoute(),
  new WalletRoute(),
  new BtcRoute(),
  new EthModule(),
  new TicsRoute(),
  new authRoute(),
  new TronRoute(),
  new BnbRoute(),
  new PolRoute(),
  new OnChainRoute(),
  new SwftcRoute(),
  new AdminRoute(),
  new SolRoute(),
]

export default controllers;
