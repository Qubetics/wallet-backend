import { Request, Response } from "express";
import { Op } from "sequelize";
import jwtHelper from "../../helpers/common/jwt";
import response from "../../helpers/response/response.helpers";
import { OnlyControllerInterface } from "../../interfaces/controller.interface";
import * as Models from "../../models/model/index";
import userhelper from "./helper";
import {
  GlblBooleanEnum,
  GlblCode,
  WalletName,
} from "../../constants/global_enum";
import { global_helper } from "../../helpers/common/global_helper";
import { ErrorMessages, language } from "../../constants";
import commonHelper from "../../helpers/common/common.helpers";
import {
  address_book_queries,
  address_book_wallet_queries,
  coin_queries,
  device_token_queries,
  notification_queries,
  user_queries,
  wallet_queries,
} from "../../helpers/dbHelper/index";
import { config } from "../../config";
import emojiRegex from "emoji-regex";
import * as ethers from "ethers";
import { NotificationHelper } from "../admin/notification/notification.helper";
import BannerModel from "../../models/model/model.banner";
import { ticsEther } from "../../helpers/common/ether_tics_helpers";
import { TicsNativeAddressModel } from "../../models/model/index";
class UserController implements OnlyControllerInterface {
  constructor() {
    this.initialize();
  }
  public initialize() { }

  private validateEmojis = (inputText: string): boolean => {
    const regex = emojiRegex();
    return regex.test(inputText);
  };

  public async createWallet(req: Request, res: Response) {
    let lang: any = req.headers["content-language"] || "en";
    try {
      let {
        wallet_address,
        addressList,
        wallet_name,
        device_token,
        device_id,
        referral_code,
        signature,
        message
      }: {
        wallet_address: string;
        addressList: any;
        wallet_name: string;
        device_token: string;
        device_id: string;
        referral_code: string;
        signature: string;
        message: string;
      } = req.body;

      if (signature && typeof signature === "string") {
        const currentUTCDate = new Date().toISOString().replace("T", " ").replace(/\..+/, "");
        const timestamp = Date.parse(message);
        const currentTimestamp = Date.parse(currentUTCDate);

        const timeDiff = (((currentTimestamp - timestamp) / 1000) / 60);
        if (+timeDiff > 1) {
          return res.status(400).json({
            success: false,
            message: "Unauthorized.",
          });
        } else if (+timeDiff < -0.1) {
          return res.status(400).json({
            success: false,
            message: ErrorMessages.SOMETHING_WENT_WRONG,
          });
        }

        let verifiedAddress = ethers.verifyMessage(message, signature);
        if (wallet_address !== verifiedAddress) {
          return res.status(400).json({
            success: false,
            message: ErrorMessages.SOMETHING_WENT_WRONG,
          });
        }
      }

      // Check if the input contains emojis
      if (userController.validateEmojis(wallet_name)) {
        return res.status(400).json({
          success: false,
          message: "Input contains emojis, which are not allowed.",
        });
      }

      if (referral_code) {
        /** check referral code is valid */
        await userhelper.referral_code_is_valid(referral_code, lang);
      }

      // Check whether same wallet address exist
      let checkAddressExists: any = null;

      if (wallet_address) {
        checkAddressExists = await wallet_queries.wallet_find_one(["user_id"], {
          wallet_address: wallet_address,
        });
      }

      // If Wallet Address exist
      let userId: any = GlblBooleanEnum.false;

      let user_referral_code: string = "";

      if (checkAddressExists) {
        userId = checkAddressExists?.user_id;

        // Insert device id and referral code if not there
        if (device_id) {
          user_referral_code = await userhelper.old_user_generate_referral(
            device_id,
            userId
          );
        }
      } else {
        // Create New User
        let code_userId: any = await userhelper.create_new_user(
          device_id,
          wallet_name
        );

        if (device_id) {
          user_referral_code = code_userId.code;
        }

        userId = code_userId.user_id;
      }

      /** save referral data */
      if (referral_code) {
        /** check referral code already used */
        await userhelper.referral_already_used(
          { device_id: device_id, address: wallet_address, user_id: null },
          lang
        );
        await userhelper.save_referral_code(
          {
            user_id: userId,
            referral_code: referral_code,
            device_id: device_id,
          },
          lang
        );
      }
      // Updating balance
      userhelper.updating_balance(
        addressList,
        userId,
        req,
        wallet_name,
        lang,
        device_token,
        device_id
      );
      let token: string;
      let refreshToken: string;

      token = await jwtHelper.createJSONWebToken(userId, device_token);

      refreshToken = await jwtHelper.createJSONRefreshToken(
        userId,
        device_token
      );

      const newObject: any = {
        token,
        refreshToken,
        userId: userId,
        referral_code: user_referral_code,
        wallet_name: wallet_name,
      };
      return response.success(res, {
        data: {
          status: true,
          data: newObject,
        },
      });
    } catch (err: any) {
      console.error("Error in user > create wallet (2).", err);
      await commonHelper.save_error_logs("users_createWallet", err.message);
      return response.error(res, { data: { status: false } });
    }
  }

  public async createWallet2(req: Request, res: Response) {
    let lang: any = req.headers["content-language"] || "en";
    try {
      let {
        wallet_address,
        addressList,
        wallet_name,
        device_token,
        device_id,
        referral_code,
        signature,
        message
      }: {
        wallet_address: string;
        addressList: any;
        wallet_name: string;
        device_token: string;
        device_id: string;
        referral_code: string;
        signature: string;
        message: string;
      } = req.body;

      if (signature && typeof signature === "string") {
        const currentUTCDate = new Date().toISOString().replace("T", " ").replace(/\..+/, "");
        const timestamp = Date.parse(message);
        const currentTimestamp = Date.parse(currentUTCDate);

        const timeDiff = (((currentTimestamp - timestamp) / 1000) / 60);
        if (+timeDiff > 1) {
          return res.status(400).json({
            success: false,
            message: "Unauthorized.",
          });
        } else if (+timeDiff < -0.1) {
          return res.status(400).json({
            success: false,
            message: ErrorMessages.SOMETHING_WENT_WRONG,
          });
        }

        let verifiedAddress = ethers.verifyMessage(message, signature);
        if (wallet_address !== verifiedAddress) {
          return res.status(400).json({
            success: false,
            message: ErrorMessages.SOMETHING_WENT_WRONG,
          });
        }
      }
      /** validate the wallet addresses */
      for await (const wallet of addressList) {
        if (!wallet?.address) continue;

        const { address, symbol, coin_family }: {
          address: string;
          symbol: string;
          coin_family: number;
        } = wallet;

        const isValid: boolean = await global_helper.validate_address(address, coin_family);

        if (!isValid) {
          throw new Error(`${language[lang].INVALID_ADDRESS} (${symbol?.toUpperCase()})`);
        }
      }


      // Check if the input contains emojis
      if (userController.validateEmojis(wallet_name)) {
        return res.status(400).json({
          success: false,
          message: "Input contains emojis, which are not allowed.",
        });
      }

      if (referral_code) {
        /** check referral code is valid */
        await userhelper.referral_code_is_valid(referral_code, lang);
      }

      // Check whether same wallet address exist
      let checkAddressExists: any = null;

      if (wallet_address) {
        checkAddressExists = await wallet_queries.wallet_find_one(["user_id"], {
          wallet_address: wallet_address,
        });
      }

      // If Wallet Address exist
      let userId: any = GlblBooleanEnum.false;

      let user_referral_code: string = "";

      if (checkAddressExists) {
        userId = checkAddressExists?.user_id;

        // Insert device id and referral code if not there
        if (device_id) {
          user_referral_code = await userhelper.old_user_generate_referral(
            device_id,
            userId
          );
        }
      } else {
        // Create New User
        let code_userId: any = await userhelper.create_new_user(
          device_id,
          wallet_name
        );

        if (device_id) {
          user_referral_code = code_userId.code;
        }

        userId = code_userId.user_id;
      }

      /** save referral data */
      if (referral_code) {
        /** check referral code already used */
        await userhelper.referral_already_used(
          { device_id: device_id, address: wallet_address, user_id: null },
          lang
        );
        await userhelper.save_referral_code(
          {
            user_id: userId,
            referral_code: referral_code,
            device_id: device_id,
          },
          lang
        );
      }
      // Updating balance
      userhelper.updating_balance2(
        addressList,
        userId,
        req,
        wallet_name,
        lang,
        device_token,
        device_id
      );
      let token: string;
      let refreshToken: string;

      token = await jwtHelper.createJSONWebToken(userId, device_token);

      refreshToken = await jwtHelper.createJSONRefreshToken(
        userId,
        device_token
      );

      const newObject: any = {
        token,
        refreshToken,
        userId: userId,
        referral_code: user_referral_code,
        wallet_name: wallet_name,
      };
      return response.success(res, {
        data: {
          status: true,
          data: newObject,
        },
      });
    } catch (err: any) {
      console.error("Error in user > create wallet (2).", err);
      await commonHelper.save_error_logs("users_createWallet", err.message);
      return response.error(res, { data: { status: false } });
    }
  }


  public async createWalletNative(req: Request, res: Response) {
    let lang: any = req.headers["content-language"] || "en";
    try {
      console.log("req body user createWalletNative>>>", req.body);
      const { evmWalletAddress, nativeWalletAddress } = req.body;
      const userId = req.userId;

      const coinData = await coin_queries.coin_find_one(["coin_id", "coin_family"], {
        coin_family: config.STATIC_COIN_FAMILY.TICS,
        is_token: GlblBooleanEnum.false,
      });
      const ifWalletExists: any = await wallet_queries.wallet_find_one(
        ["wallet_id", "wallet_name"],
        {
          wallet_address: evmWalletAddress,
          coin_id: coinData?.coin_id,
          coin_family: coinData?.coin_family,
          user_id: userId,
        }
      );
      if (ifWalletExists) {
        const ticsNativeWallet = await TicsNativeAddressModel.findOne({
          where: {
            wallet_id: ifWalletExists.wallet_id,
            address: nativeWalletAddress,
          }
        })
        if (!ticsNativeWallet) {

          const addressValidity = await ticsEther.validate_tics_address(nativeWalletAddress);
          if (!addressValidity) {
            return response.error(res, {
              data: {
                status: false,
                message: language[lang].INVALID_ADDRESS,
              },
            });
          }
          await TicsNativeAddressModel.create({
            wallet_id: ifWalletExists.wallet_id,
            address: nativeWalletAddress,
            user_id: userId
          })
          await userhelper.update_wallet_address_list(
            config.STATIC_COIN_FAMILY.TICS,
            nativeWalletAddress,
            userId,
            ifWalletExists?.wallet_name,
            ifWalletExists?.wallet_id
          );
        }
      }

      return response.success(res, {
        data: {
          status: true,
          message: language[lang].WALLET_CREATED,
        },
      });
    } catch (err: any) {
      console.error("Error in user > createWalletNative.", err);
      await commonHelper.save_error_logs("users_createWalletNative", err.message);
      return response.error(res, { data: { status: false } });
    }
  }

  public async userLogout(req: Request, res: Response) {
    let lang: any = req.headers["content-language"] || "en";
    try {
      console.log("req body user userLogout>>>", req.body);
      const {
        deviceId,
        userIds,
        type,
      }: {
        deviceToken: string;
        deviceId: string;
        userIds: Array<number>;
        type: string;
      } = req.body;

      if (userIds && userIds.length > 0) {
        let users: any = [];
        if (type == "all") {
          await device_token_queries.device_token_destroy({
            device_id: deviceId,
          });
          users = await user_queries.user_find_all(
            ["user_id", "device_id"],
            { device_id: { [Op.like]: `%${deviceId}` } },
            [["user_id", "DESC"]]
          );
        } else {
          await device_token_queries.device_token_destroy({
            device_id: deviceId,
            user_id: userIds,
          });
          users = await user_queries.user_find_all(
            ["user_id", "device_id"],
            { user_id: userIds, device_id: { [Op.like]: `%${deviceId}` } },
            [["user_id", "DESC"]]
          );
        }

        if (users.length > 0) {
          const updates = await users
            .map((user: any) => {
              const { user_id, device_id } = user;

              if (device_id) {
                const deviceIds = device_id
                  .split(",")
                  .filter((dId: any) => dId !== deviceId);
                return {
                  user_id,
                  device_id: deviceIds.join(","),
                };
              }
              return null;
            })
            .filter((update: any) => update !== null);
          for (const update of updates) {
            await user_queries.user_update(
              { device_id: update.device_id !== "" ? update.device_id : null },
              { user_id: update.user_id }
            );
          }
        }
      }

      return response.success(res, {
        data: {
          status: true,
          data: {
            message: language[lang].LOGOUT,
          },
        },
      });
    } catch (err: any) {
      console.error("Error in user > userLogout.", err);
      await commonHelper.save_error_logs("users_userLogout", err.message);
      return response.error(res, {
        data: {
          code: GlblCode.ERROR_CODE,
          status: false,
          message: language[lang].CATCH_MSG,
        },
      });
    }
  }

  public async notificationList(req: Request, res: Response) {
    let lang: any = req.headers["content-language"] || "en";
    try {
      console.log("req body user notificationList>>>", req.body);
      const per_page: number = Number(
        req.body?.limit == undefined ? (req.body.limit = "10") : req.body.limit
      );
      const page: number = Number(
        req.body.page == undefined ? (req.body.page = "1") : req.body.page
      );
      const offset: number = (page - 1) * per_page;

      const checkAddress = await wallet_queries.wallet_find_one(
        ["wallet_id", "user_id"],
        { wallet_address: { [Op.in]: req.body.addrsListKeys } }
      );

      if (!checkAddress || checkAddress.user_id !== req.userId) {
        return response.error(res, {
          data: {
            code: GlblCode.ERROR_CODE,
            status: false,
            message: language[lang].UNAUTHORIZED_ACCESS,
          },
        });
      }

      const notifications_data =
        await notification_queries.notifications_joint_find_all_count_all(
          [
            "wallet_address",
            "amount",
            "notification_type",
            "tx_type",
            "state",
            "message",
            "alert_price",
            "fiat_type",
            "coin_symbol",
            "created_at",
          ],
          ["coin_name", "coin_symbol"],
          ["currency_code", "currency_symbol"],
          { coin_family: { [Op.in]: req.body.coin_family } },
          { wallet_address: { [Op.in]: req?.body?.addrsListKeys } },
          per_page,
          offset
        );

      return response.success(res, {
        data: {
          success: true,
          data: notifications_data?.rows,
          meta: {
            page: page,
            pages: Math.ceil(notifications_data.count / per_page),
            perPage: per_page,
            total: notifications_data.count,
          },
          message: language[lang].SUCCESS,
        },
      });
    } catch (err: any) {
      console.error("Error in user > notificationList.", err);
      await commonHelper.save_error_logs("users_notificationList", err.message);
      return response.error(res, { data: { status: false } });
    }
  }

  public async addAddressBook(req: Request, res: Response) {
    let lang: any = req.headers["content-language"] || "en";
    try {
      const user_id: number = req.userId;
      const { wallet_address, contact_name, address, coin_family } = req.body;
      let wallet_name = req.body.wallet_name;

      const wallet_address_exist: any =
        await address_book_wallet_queries.address_book_wallets_with_address_book(
          ["address_book_id"],
          ["id"],
          { wallet_address: wallet_address, coin_family: coin_family },
          { address: address }
        );

      if (wallet_address_exist) {
        return response.error(res, {
          data: {
            code: GlblCode.ERROR_CODE,
            status: false,
            message: language[lang].SAME_WALLET_ADDRESS_EXIST,
          },
        });
      }

      let address_book: any = await address_book_queries.address_books_find_one(
        ["id", "name", "address"],
        { address: address, user_id: user_id, name: contact_name }
      );

      if (!address_book) {
        address_book = await address_book_queries.address_book_create({
          address: address,
          user_id: user_id,
          name: contact_name,
          created_at: new Date(),
          updated_at: new Date(),
        });
      }
      let address_book_id = address_book?.id;

      const wallet_name_exist: number =
        await address_book_wallet_queries.address_book_wallet_get_count({
          address_book_id: address_book_id,
          name: wallet_name,
        });

      if (wallet_name_exist > GlblBooleanEnum.false) {
        return response.error(res, {
          data: {
            code: GlblCode.ERROR_CODE,
            status: false,
            message: language[lang].SAME_WALLET_NAME_EXIST,
          },
        });
      }
      let name: any;
      if (!wallet_name) {
        name = await userhelper.wallet_name(
          address_book_id,
          coin_family,
          wallet_name
        );
      } else {
        name = wallet_name;
      }
      wallet_name = name;
      const addressValidity: any = await global_helper.validate_address(
        wallet_address,
        coin_family
      );
      if (!addressValidity)
        throw new Error(`${language[lang].INVALID_ADDRESS} (${coin_family})`);

      const total_wallets: any =
        await address_book_wallet_queries.address_book_wallets_find_all(
          ["name"],
          { address_book_id: address_book_id }
        );
      if (total_wallets.length == 10) {
        return response.error(res, {
          data: {
            code: GlblCode.ERROR_CODE,
            status: false,
            message: language[lang].MAX_LIMIT,
          },
        });
      }

      await address_book_wallet_queries.address_book_wallet_create({
        address_book_id: address_book_id,
        name: wallet_name,
        wallet_address: wallet_address,
        coin_family: coin_family,
      });
      return response.success(res, {
        data: {
          code: GlblCode.SUCCESS,
          status: true,
          message: language[lang].ADDRESS_BOOK_SAVED,
        },
      });
    } catch (err: any) {
      console.error("Error in user > add_address_book.", err);
      await commonHelper.save_error_logs("users_add_address_book", err.message);
      return response.error(res, {
        data: {
          code: GlblCode.ERROR_CODE,
          status: false,
          message: language[lang].CATCH_MSG,
        },
      });
    }
  }

  public async addressBook(req: Request, res: Response) {
    let lang: any = req.headers["content-language"] || "en";
    try {
      const per_page: number = Number(
        req.body?.limit == undefined ? (req.body.limit = "10") : req.body.limit
      );
      const page: number = Number(
        req.body.page == undefined ? (req.body.page = "1") : req.body.page
      );
      const offset: number = (page - 1) * per_page;
      const search: any = req.body.search == undefined ? (req.body.search = "%%") : (req.body.search = "%" + req.body.search + "%");
      const set_order_by: string = req.body?.order_by == undefined || req.body?.order_by == "undefined" ? "name" : (req.body?.order_by as string);
      const set_order_type: string = req.body?.order_type == "undefined" || req.body?.order_type == undefined ? "ASC" : (req.body?.order_type as string);
      const { address, coin_family }: { address: string; coin_family: number } =
        req.body;
      const user_id: number = req.userId;

      const address_book_data: any =
        await address_book_queries.address_book_with_address_book_wallet_coins_joint(
          ["id", "name", "address", "created_at"],
          [
            "id",
            "address_book_id",
            "wallet_address",
            "name",
            "coin_family",
            "created_at",
          ],
          {
            coin_family: coin_family,
            [Op.or]: [
              { "$wallet_data.name$": { [Op.like]: search } },
              { "$address_books.name$": { [Op.like]: search } },
            ],
          },
          ["coin_image"],
          { is_token: GlblBooleanEnum.false },
          { address: address, user_id: user_id },
          per_page,
          offset,
          set_order_by,
          set_order_type
        );

      const address_book_data_number: any =
        await address_book_queries.address_book_count({
          name: { [Op.like]: search },
          address: address,
          user_id: user_id,
        });

      return response.success(res, {
        data: {
          data: address_book_data,
          meta: {
            page: page,
            pages: Math.ceil(address_book_data_number / per_page),
            perPage: per_page,
            total: address_book_data_number,
          },
          code: GlblCode.SUCCESS,
          status: true,
          message: language[lang].GET_ADDRESS_BOOK,
        },
      });
    } catch (err: any) {
      console.error("Error in user > address_book.", err);
      await commonHelper.save_error_logs("users_address_book", err.message);
      return response.error(res, {
        data: {
          data: [],
          code: GlblCode.ERROR_CODE,
          status: false,
          message: language[lang].CATCH_MSG,
        },
      });
    }
  }

  public async getWalletName(req: Request, res: Response) {
    let lang: any = req.headers["content-language"] || "en";
    try {
      const {
        contact_name,
        coin_family,
        address,
      }: {
        contact_name: string;
        coin_family: number;
        address: string;
      } = req.body;

      let wallet_name: string = req.body.wallet_name;
      const user_id: number = req.userId;

      const address_book: any = await address_book_queries.address_books_find_one(
        ["id", "name", "address"],
        { address: address, user_id: user_id, name: contact_name }
      );

      if (address_book) {
        let address_book_id: any = address_book?.id;
        let name: any = await userhelper.wallet_name(
          address_book_id,
          coin_family,
          wallet_name
        );
        wallet_name = name;
      } else {
        if (coin_family == config.STATIC_COIN_FAMILY.ETH) {
          wallet_name = WalletName.ETH;
        } else if (coin_family == config.STATIC_COIN_FAMILY.BTC) {
          wallet_name = WalletName.BTC;
        } else if (coin_family == config.STATIC_COIN_FAMILY.TRX) {
          wallet_name = WalletName.TRX;
        } else if (coin_family == config.STATIC_COIN_FAMILY.BNB) {
          wallet_name = WalletName.BNB;
        } else if (coin_family == config.STATIC_COIN_FAMILY.POL) {
          wallet_name = WalletName.POL;
        } else if (coin_family == config.STATIC_COIN_FAMILY.TICS) {
          wallet_name = WalletName.TICS;
        } else if (coin_family == config.STATIC_COIN_FAMILY.SOL) {
          wallet_name = WalletName.SOL;
        }
      }
      return response.success(res, {
        data: {
          code: GlblCode.SUCCESS,
          status: true,
          wallet_name: wallet_name,
        },
      });
    } catch (err: any) {
      console.error("Entered in user > get_wallet_name.", err);
      await commonHelper.save_error_logs("users_get_wallet_name", err.message);
      return response.error(res, {
        data: {
          code: GlblCode.ERROR_CODE,
          status: false,
          message: language[lang].CATCH_MSG,
        },
      });
    }
  }

  public async search(req: Request, res: Response) {
    let lang: any = req.headers["content-language"] || "en";
    try {
      console.log("req body user search>>>", req.body);
      const user_id: number = req.userId;
      const search: any = req.body.search == undefined ? (req.body.search = "%%") : (req.body.search = "%" + req.body.search + "%");

      let address_book: any = await address_book_queries.address_books_find_all(
        ["name"],
        { user_id: user_id, name: { [Op.like]: search } }
      );

      if (!address_book) {
        address_book = null;
      }

      return response.success(res, {
        data: {
          code: GlblCode.SUCCESS,
          status: true,
          contact_name: address_book,
        },
      });
    } catch (err: any) {
      console.error("Error in user > search.", err);
      await commonHelper.save_error_logs("users_search", err.message);
      return response.error(res, {
        data: {
          code: GlblCode.ERROR_CODE,
          status: false,
          message: language[lang].CATCH_MSG,
        },
      });
    }
  }

  public async deleteAddressBookWalletAddress(req: Request, res: Response) {
    let lang: any = req.headers["content-language"] || "en";
    try {
      const { id, address_book_id }: { id: number; address_book_id: number } =
        req.body;
      const user_id = req.userId;

      const addressBook = await address_book_queries.address_books_find_one(['user_id'], { id: address_book_id });

      if (!addressBook) {
        return response.error(res, {
          data: {
            code: GlblCode.ERROR_CODE,
            status: false,
            message: language[lang].NO_ADDRESSBOOK_EXIST,
          },
        });
      }

      if (addressBook.user_id != user_id) {
        return response.error(res, {
          data: {
            code: GlblCode.ERROR_CODE,
            status: false,
            message: language[lang].UNAUTHORIZED_ACCESS,
          },
        });
      }

      let address_book_wallet: number =
        await address_book_wallet_queries.address_book_wallet_get_count({
          address_book_id: address_book_id,
        });

      if (address_book_wallet == GlblBooleanEnum.false) {
        return response.error(res, {
          data: {
            code: GlblCode.ERROR_CODE,
            status: false,
            message: language[lang].NO_WALLET_ADDRESS_EXIST,
          },
        });
      } else if (address_book_wallet == GlblBooleanEnum.true) {
        await address_book_wallet_queries.address_book_wallet_destroy({
          id: id,
          address_book_id: address_book_id,
        });
        await address_book_queries.address_book_destroy({
          id: address_book_id,
        });
      } else {
        await address_book_wallet_queries.address_book_wallet_destroy({
          id: id,
          address_book_id: address_book_id,
        });
      }

      return response.success(res, {
        data: {
          code: GlblCode.SUCCESS,
          status: true,
          message: language[lang].DELETED_ADDRESSBOOK_WALLET,
        },
      });
    } catch (err: any) {
      console.error("Error in user > delete_address_book_wallet_address.", err);
      await commonHelper.save_error_logs(
        "users_delete_address_book_wallet_address",
        err.message
      );
      return response.error(res, {
        data: {
          code: GlblCode.ERROR_CODE,
          status: false,
          message: language[lang].CATCH_MSG,
        },
      });
    }
  }

  public async deleteAddressBook(req: Request, res: Response) {
    let lang: any = req.headers["content-language"] || "en";
    try {
      console.log("req body user deleteAddressBook>>>", req.body);
      const { id }: { id: number } = req.body;
      const user_id = req.userId;
      let address_book: any = await address_book_queries.address_book_count({
        id: id,
      });
      if (address_book == GlblBooleanEnum.false) {
        return response.error(res, {
          data: {
            code: GlblCode.ERROR_CODE,
            status: false,
            message: language[lang].NO_ADDRESSBOOK_EXIST,
          },
        });
      }

      const addressBook = await address_book_queries.address_books_find_one(['user_id'], { id: id });
      if (!addressBook) {
        return response.error(res, {
          data: {
            code: GlblCode.ERROR_CODE,
            status: false,
            message: language[lang].NO_ADDRESSBOOK_EXIST,
          },
        });
      }

      if (addressBook.user_id != user_id) {
        return response.error(res, {
          data: {
            code: GlblCode.ERROR_CODE,
            status: false,
            message: language[lang].UNAUTHORIZED_ACCESS,
          },
        });
      }

      await address_book_queries.address_book_destroy({ id: id });
      let address_book_wallet_data: number =
        await address_book_wallet_queries.address_book_wallet_get_count({
          address_book_id: id,
        });
      if (address_book_wallet_data > 0) {
        await address_book_wallet_queries.address_book_wallet_destroy({
          address_book_id: id,
        });
      }
      return response.success(res, {
        data: {
          code: GlblCode.SUCCESS,
          status: true,
          message: language[lang].ADDRESSBOOK_DELETED,
        },
      });
    } catch (err: any) {
      console.error("Error in user > delete_address_book.", err);
      await commonHelper.save_error_logs(
        "users_delete_address_book",
        err.message
      );
      return response.error(res, {
        data: {
          code: GlblCode.ERROR_CODE,
          status: false,
          message: language[lang].CATCH_MSG,
        },
      });
    }
  }

  public async announcementViewStatus(req: Request, res: Response) {
    try {
      console.log("req body user announcementViewStatus>>>", req.body);
      const key: number = req.body.key; // 0 or 1
      let data: any;
      let view_status: any;
      if (key == GlblBooleanEnum.true) {
        view_status = await Models.NotificationModel.findAll({
          attributes: ["notification_id", "view_status"],
          where: {
            wallet_address: { [Op.in]: req?.body?.addrsListKeys },
            [Op.or]: [{ view_status: 0 }, { view_status: null }],
          },
          raw: true,
        });
        if (view_status.length !== 0) {
          data = {
            new_notifications: 1,
          };
        } else {
          let ann_data: any = await Models.AnnouncementStatusModel.findOne({
            attributes: ["user_id"],
            where: {
              user_id: req.userId,
            },
            raw: true,
          });
          if (ann_data) {
            let seen_data: any = await Models.AnnouncementStatusModel.findOne({
              attributes: ["user_id"],
              where: {
                user_id: req.userId,
                view_status: 1,
              },
              raw: true,
            });
            if (seen_data) {
              data = {
                new_notifications: 0,
              };
            } else {
              data = {
                new_notifications: 1,
              };
            }
          } else {
            data = {
              new_notifications: GlblBooleanEnum.false,
            };
          }
        }
      } else {
        await Models.NotificationModel.update(
          {
            view_status: 1,
          },
          {
            where: {
              wallet_address: { [Op.in]: req?.body?.addrsListKeys },
              [Op.or]: [{ view_status: 0 }, { view_status: null }],
            },
          }
        );
        await Models.AnnouncementStatusModel.update(
          {
            view_status: 1,
          },
          {
            where: {
              user_id: req.userId,
            },
          }
        );
        data = {
          new_notifications: 0,
        };
      }
      data.status = true;
      response.success(res, { data: data });
    } catch (err: any) {
      console.error("Error in announcement_view_status API", err);
      await commonHelper.save_error_logs("users_announcements", err.message);
      return response.error(res, { data: { status: false } });
    }
  }

  /** get app languages */
  public async appLanguage(req: Request, res: Response) {
    let lang: any = req.headers["content-language"] || "en";
    try {
      const data: any = await Models.AppLanguagesModel.findAll({
        attributes: ["name", "code", "image"],
        where: { status: "1" },
      });
      return res.status(GlblCode.SUCCESS).send({
        status: true,
        code: GlblCode.SUCCESS,
        message: language[lang].SUCCESS,
        data: data,
      });
    } catch (err: any) {
      console.error("Error in user > app_language", err);
      await commonHelper.save_error_logs("user_app_language", err.message);
      response.error(res, {
        data: {
          status: false,
          message: language[lang].CATCH_MSG,
        },
      });
    }
  }

  public async getAnnouncementList(req: Request, res: Response) {
    let lang: any = req.headers['content-language'] || 'en';
    try {

      const per_page: number = Number(
        req.body?.limit == undefined ? (req.body.limit = "10") : req.body.limit
      );
      const page: number = Number(
        req.body.page == undefined ? (req.body.page = "1") : req.body.page
      );
      const offset: number = (page - 1) * per_page;

      const search: string = req.body?.search == undefined ? null : req.body.search;

      //object for get token list
      let obj: any = {
        where: { status: 'sent' },
        attributes: ["id", "title", "message", "created_at", "status"],
        order: [['id', 'DESC']],
        limit: per_page,
        offset: offset,
        page: page,
      }

      //search by title, message
      if (search) {
        obj.where[Op.or] = [
          { title: { [Op.like]: `%${search}%` } },
          { message: { [Op.like]: `%${search}%` } }
        ];
      }

      const get_notification_list: any = await NotificationHelper.getNotificationList(obj);

      return res.status(GlblCode.SUCCESS).send({
        message: language[lang].SUCCESS,
        status: true,
        code: GlblCode.SUCCESS,
        data: get_notification_list
      });

    } catch (err: any) {
      console.error("Error in user > getAnnouncementList", err);
      await commonHelper.save_error_logs("user_getAnnouncementList", err.message);
      response.error(res, {
        data: {
          status: false,
          message: language[lang].CATCH_MSG,
        },
      });
    }
  }

  public async getBannerList(req: Request, res: Response) {
    let lang: any = req.headers['content-language'] || 'en';
    try {

      const getBannerList: any = await BannerModel.findAll({
        where: { status: '1' },
        attributes: ["id", "link", "image_path", "created_at"]
      })

      return res.status(GlblCode.SUCCESS).send({
        message: language[lang].SUCCESS,
        status: true,
        code: GlblCode.SUCCESS,
        data: getBannerList
      });

    } catch (err: any) {
      console.error("Error in user > getAnnouncementList", err);
      await commonHelper.save_error_logs("user_getAnnouncementList", err.message);
      response.error(res, {
        data: {
          status: false,
          message: language[lang].CATCH_MSG,
        },
      });
    }
  }

  public async currentTimestamp(req: Request, res: Response) {
    let lang: any = req.headers['content-language'] || 'en';
    try {
      const { payload } = req.body;
      const checkPayload = Buffer.from(payload, 'hex').toString('utf8');
      if (!checkPayload || checkPayload !== "qubetics-wallet") {
        return response.error(res, {
          data: {
            status: false,
            message: "Unauthorized.",
          },
        });
      }

      const currentTimestamp = new Date()
        .toISOString()
        .replace('T', ' ')
        .replace(/\.\d{3}Z$/, '');

      return response.success(res, {
        data: {
          status: true,
          message: language[lang].SUCCESS,
          data: {
            current_timestamp: currentTimestamp
          },
        },
      });
    } catch (err: any) {
      console.error("Error in user > currentTimestamp", err);
      await commonHelper.save_error_logs("user_currentTimestamp", err.message);
      response.error(res, {
        data: {
          status: false,
          message: language[lang].CATCH_MSG,
        }
      });
    }
  }
}

export const userController = new UserController();
