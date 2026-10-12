import { settings_queries } from '../dbHelper/index';
import axios from "axios";
import { config } from "../../config";

class CMCHelper {

    constructor() { }
    public async cmcApi(params: any) {
        try {
            console.log("Entered into cmcApi params params", params)
            let url: string = '';
            let header: any = {};
            let result: any;
            let cmc_result: any = await settings_queries.settings_find_one(
                ["id", "title", "value", "created_at", "updated_at"],
                { title: "CMC" }
            );
            // 1 means Coin Market Cap, 2 means CoinZone
            if (cmc_result) {
                if (Number(cmc_result.value) == 1) {
                    console.log("In use Coin Market Cap")
                    url = `${config.CMC.URL}${params}`;
                    header = { "X-CMC_PRO_API_KEY": `${config.CMC.KEY}` }
                    result = await axios({
                        method: "get",
                        url: url,
                        headers: header
                    });
                } else {
                    console.log("In use CoinZone")
                    url = `${config.COIN_ZONE.URL}${params}`;
                    header = { "api_key": `${config.COIN_ZONE.KEY}` }
                    result = await axios({
                        method: "get",
                        url: url,
                        headers: header,
                    });
                }
            } else {
                result = [];
            }
            return result;
        } catch (err: any) {
            console.error("Error in cmcApi cmcApi cmcApi >>>", err);
            throw err;
        }
    }

}

const cmcHelper = new CMCHelper();
export default cmcHelper;
