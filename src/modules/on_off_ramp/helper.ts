// import axios from "axios";
// import { OnlyControllerInterface } from "../../interfaces/controller.interface";
// import { config } from "../../config/config";
// import CryptoJS from "crypto-js";
// import * as Models from '../../models/model/index';
// import { Op } from "sequelize";
// // import * as isoCountries from 'i18n-is/o-countries';
// import request from 'request';




// class OnOffRamphelpers implements OnlyControllerInterface {
//     constructor() {
//         this.initialize();
//     }
//     public initialize() { }
//     public async check_transak_fiat_exist(where_clause: any) {
//         try {
//             where_clause.transak_payment_detials = { [Op.ne]: null }
//             let check_exist: any = await Models.OnOffRampFiatsModel.findOne({
//                 attributes: ["id", "country_name"],
//                 where: where_clause
//             })
//             if (check_exist)
//                 return true;
//             else
//                 return false
//         } catch (err: any) {
//             console.error("Error in on_off_ramp_helper>> > check_transak_fiat_exist>>", err)
//             throw err;
//         }
//     }
//     // public async get_country_name(country_code: string) {
//     //     try {
//     //         isoCountries.registerLocale(require('i18n-iso-countries/langs/en.json'))
//     //         let country_name: string | undefined = isoCountries.getName(country_code, 'en')
//     //         if (!country_name) {
//     //             let country_code_data: any = await Models.CardCountryCodesModel.findOne({
//     //                 attributes: ["english"],
//     //                 where: { iso_3166_alpha2: country_code },
//     //                 raw: true
//     //             })
//     //             country_name = country_code_data?.english
//     //         }

//     //         if (country_name)
//     //             return country_name;
//     //         else
//     //             return "not_present"
//     //     } catch (err: any) {
//     //         console.error("Error in on_off_ramp_helper>> > get_country_name>>", err)
//     //         throw err;
//     //     }

//     // }
//     public async get_grouped_data_alchemy(obj: any) {
//         try {
//             let groupedData: any = obj.reduce((acc: any, item: any) => {
//                 let key: any = `${item.countryName}_${item.country}_${item.currency}`;
//                 if (acc) {
//                     if (!acc[key]) {
//                         acc[key] = {
//                             countryName: item.countryName,
//                             country: item.country,
//                             currency: item.currency,
//                             items: []
//                         };
//                     }
//                 }
//                 let { country, currency, countryName, ...itemWithoutCountryInfo }: any = item;
//                 acc[key].items.push(itemWithoutCountryInfo)
//                 return acc;
//             }, {});
//             const groupedArray: any = Object.values(groupedData)
//             return groupedArray;
//         } catch (err: any) {
//             console.error("Error in on_off_ramp_helper>> > get_grouped_data_alchemy>>", err)
//             throw err;
//         }
//     }
//     public async checkAlchemyFiatExit(where_clause: any) {
//         try {
//             // where_clause.alchemy_payment_details = { [Op.ne]: null }
//             let check_exist: any = await Models.OnOffRampFiatsModel.findOne({
//                 attributes: ["id", "country_name"],
//                 where: where_clause
//             })
//             if (check_exist)
//                 return true;
//             else
//                 return false
//         } catch (err: any) {
//             console.error("Error in on_off_ramp_helper>> > checkAlchemyFiatExit>>", err)
//             throw err;
//         }
//     }
//     public async alchemySign(timestamp: number) {
//         try {
//             let appId: string = config.APP_ID || ''
//             let appsecret: string = config.APPSECRET
//             const message: string = appId + appsecret + timestamp;
//             let sha1Hash: string = CryptoJS.SHA1(message).toString();
//             return sha1Hash
//         } catch (err: any) {
//             console.error("err in alchemySign", err);
//             return false;
//         }
//     }
//     public async fetch_data(url: string) {
//         console.log(url)
//         return new Promise(async (resolve, reject) => {
//             try {
//                 request(url, async function (err, result) {
//                     if (err) {
//                         console.log('🔥 ~ on_off_ramp_fetch_data request error', err);
//                         return reject(err);
//                     } else {
//                         let data = await JSON.parse(result?.body);
//                         return resolve(data);
//                     }
//                 });
//             } catch (error: any) {
//                 console.error('🔥 ~ ~ on_off_ramp_fetch_data error', error);
//                 throw error;
//             }
//         });
//     }
//     public async post_data(method: string, url: string, header: Object, data: any) {
//         try {
//             let config_data: any = {
//                 method: method,
//                 url: url,
//                 headers: header
//             };
//             if (data) {
//                 console.log("Entered into data condition")
//                 config_data.data = data
//             }else{
//                 console.log("not entered into data condition")
//             }
//             return await axios(config_data).then(function (response: any) {
//                 return response?.data;
//             }).catch(function (err: any) {
//                 console.error('🔥 ~ ~ axios catch error', err.message);
//                 throw err;
//             });
//         } catch (err: any) {
//             console.error('🔥 ~ ~ post_data error', err.message);
//             throw err;
//         }
//     }
//     public async create_access_token() {
//         try {
//             let options: any = {
//                 method: 'post',
//                 url: `${config.TRANSAK.TRANSAK_URL}${config.TRANSAK.TRANSAK_REFRESH_TOKEN_URL}`,
//                 headers: {
//                     "api-secret": `${config.TRANSAK.TRANSAK_APP_SECRET}`,
//                     "accept": "application/json",
//                     "content-type": "application/json"
//                 },
//                 data: {
//                     "apiKey": `${config.TRANSAK.TRANSAK_API_KEY}`
//                 }
//             }
//             let access_token: any = await axios(options);
//             console.log("access_token>>>>", access_token);
//             let options1: any = {
//                 method: 'post',
//                 url: `${config.TRANSAK.TRANSAK_URL}${config.TRANSAK.TRANSAK_UPDATE_WEBHOOK_URL}`,
//                 headers: {
//                     "access-token": access_token?.data?.data.accessToken,
//                     "accept": "application/json",
//                     "content-type": "application/json"
//                 },
//                 data: {
//                     "webhookURL": `${config.APP_URL}on_off_ramp/transak_webhook`
//                 }
//             }
//             let update_webhookURL_data: any = await axios(options1);
//             console.log("updated webhook>>>>>", update_webhookURL_data)
//             return access_token?.data.data.accessToken;

//         } catch (err: any) {
//             console.error("Error in create_access_token>>>", err)
//             throw err;
//         }
//     }

// }
// export const OnOffRampHelpers = new OnOffRamphelpers();
