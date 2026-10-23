import { Server as HTTPServer, createServer } from "https";
import express, { NextFunction, Request, Response } from "express";
import { ServerInterface } from "./interfaces/server.interface";
import controllers from "./modules/controllers.index";
import cors from "cors";
import path from "path";
import expressFileUploader from "express-fileupload";
import { config } from "./config";
import helmet from "helmet";
import { encryptionMiddleware } from "./middlewares/encryption.middleware";
import { ValidationError } from "./middlewares/validate";
import { GlblCode, GlblMessages, InfoMessages } from "./constants/global_enum";
import ApiLimiter from "./middlewares/apiRateLimiter";
import sanitizeHtml from "sanitize-html";
import dataLogger from "./helpers/common/dataLogger.helper";

const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');
const basicAuth = require('express-basic-auth');


class Server implements ServerInterface {
  public app: express.Application;
  public httpServer: HTTPServer;
  public sslKey: Buffer;
  public sslCert: Buffer;

  constructor() {
    this.sslKey = Buffer.from(config.SSL.KEY);
    this.sslCert = Buffer.from(config.SSL.CERT);


    this.app = express();
    // Express 5 parses query strings with the "simple" parser by default; keep the Express 4 "extended" one (nested objects and arrays)
    this.app.set("query parser", "extended");

    this.app.use(expressFileUploader());
    this.httpServer = createServer({ key: this.sslKey, cert: this.sslCert, passphrase: config.SSL_PASS_PHRASE }, this.app);

    // crossOriginEmbedderPolicy is no longer on by default since helmet 7; keep sending it as before
    this.app.use(helmet({ crossOriginEmbedderPolicy: true }));
    this.app.use(helmet.contentSecurityPolicy({
      useDefaults: true,
      directives: {
        "frame-ancestors": "'none'",
      },
    }));
    this.app.use(helmet.dnsPrefetchControl());
    this.app.use(helmet.frameguard({
      action: "deny",
    }));
    this.app.use(helmet.hidePoweredBy());
    this.app.use(helmet.hsts());
    this.app.use(helmet.ieNoOpen());
    this.app.use(helmet.noSniff());
    this.app.use(helmet.permittedCrossDomainPolicies());
    this.app.use(helmet.referrerPolicy());

    this.app.use((req: Request, res: Response, next: NextFunction) => {
      res.setHeader("X-XSS-Protection", "1; mode=block");
      res.setHeader("Strict-Transport-Security", " max-age=31536000; includeSubDomains");
      next();
    });

    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ limit: '50mb', extended: true }));
    // Express 5 leaves req.body undefined when a request has no body (Express 4 gave {}). Many handlers and the
    // encryption middleware read req.body.<field> on every request, so keep the Express 4 default.
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.body === undefined) req.body = {};
      next();
    });
    // CORS_ORIGINS (optional): browser origins allowed to call the API, as an array or a comma-separated string.
    // When it is not set, any origin is allowed, as before.
    const corsOrigins: string[] = Array.isArray(config.CORS_ORIGINS)
      ? config.CORS_ORIGINS
      : String(config.CORS_ORIGINS || "").split(",").map((origin) => origin.trim()).filter(Boolean);
    this.app.use(corsOrigins.length ? cors({ origin: corsOrigins }) : cors());
    this.app.use(
      `/api/v1/static`,
      express.static(path.join(__dirname, "public"))
    );
    this.app.use(express.static(path.join(__dirname, 'public')))
    this.app.set('views', './views');
    this.app.use(encryptionMiddleware);
    this.app.use(ApiLimiter);

    this.app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.body && typeof req.body === "object") {
        const bodyString = JSON.stringify(req.body);
        const sanitizedString = sanitizeHtml(bodyString, {
          allowedTags: [],
          allowedAttributes: {},
        });
        if (sanitizedString !== bodyString) {
          return res.status(400).json({
            status: false,
            message: GlblMessages.INVALID_REQ_BODY,
          });
        }
        req.body = JSON.parse(sanitizedString);
      }

      next();
    });

    this.initializeControllers();

    // Basic authentication middleware for Swagger UI
    this.app.use('/KU8S5Ln7siecCst', basicAuth({
      users: { [config.SWAGGER_AUTH.USER]: config.SWAGGER_AUTH.PASS }, // Set your username and password here
      challenge: true, // Shows the login prompt
      unauthorizedResponse: 'Unauthorized access', // Response message if unauthorized
    }));
    this.app.use('/KU8S5Ln7siecCst', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

    this.startServer();
    this.checkHealth();

    this.app.use(function (
      err: any,
      req: Request,
      res: Response,
      next: NextFunction
    ) {
      console.error('err >>>>>> ', err.details);
      if (err instanceof ValidationError) {
        return res.status(err.statusCode).json({
          statusCode: err.statusCode,
          message: err.message,
          name: err.name,
          error: err.error
        });
      }
      return res.status(GlblCode.NOT_FOUND).json(
        {
          statusCode: GlblCode.NOT_FOUND,
          message: GlblMessages.CATCH_MSG
        }
      );
    });
  }

  public startServer() {
    this.httpServer.listen(config.PORT, () => {
      console.log('server listen on port:', config.PORT);
    });
    this.app.get("/", (req: Request, res: Response) => {
      res.send(InfoMessages.APP_INFO).status(GlblCode.SUCCESS);
    });
    this.app.get('/transaction-success', function (req, res) {
      res.sendFile(__dirname + '/views/index.html')
    });

    // Light
    this.app.get('/privacy', function (req, res) {
      res.sendFile(__dirname + '/public/pdf/web-privacy-policy-light.html');
    });
    this.app.get('/terms-and-conditions', function (req, res) {
      res.sendFile(__dirname + '/public/pdf/web-terms-and-conditions-light.html');
    });
    this.app.get('/about-us', function (req, res) {
      res.sendFile(__dirname + '/public/pdf/qubetics-about-us-light.html');
    });

    //Dark
    this.app.get('/privacy/dark', function (req, res) {
      res.sendFile(__dirname + '/public/pdf/web-privacy-policy-dark.html');
    });
    this.app.get('/terms-and-conditions/dark', function (req, res) {
      res.sendFile(__dirname + '/public/pdf/web-terms-and-conditions-dark.html');
    });
    this.app.get('/about-us/dark', function (req, res) {
      res.sendFile(__dirname + '/public/pdf/qubetics-about-us-dark.html');
    });

    this.app.get("/apple-app-site-association", (req, res) => {
      res.set('Content-Type', 'application/pkcs7-mime');
      res.status(200);
      res.sendFile(__dirname + "/apple-app-site-association")
    })
    process.on('uncaughtException', function (err) {
      console.log('Caught exception >>>>' + err);
    });

  }


  public initializeControllers() {
    const url: string = `/api/v1`;
    dataLogger.info(`=========================== ${url} =================================`);

    this.app.use(url, (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();

      let responseMessage: string | undefined;
      const originalJson = res.json.bind(res);
      const originalSend = res.send.bind(res);

      // 🔹 log incoming request
      dataLogger.logRequest({
        method: req.method,
        url: req.originalUrl,
        body: req.body,
        auth: req.headers.authorization,
        ip: req.ip ?? req.socket.remoteAddress,
        userAgent: req.headers["user-agent"],
      });

      // ✅ capture res.json
      res.json = function (body?: any) {
        responseMessage = body?.message;
        return originalJson(body);
      } as any;

      // ✅ capture res.send (important for non-json responses)
      res.send = function (body?: any) {
        if (!responseMessage && typeof body === "object") {
          responseMessage = body?.message;
        }
        return originalSend(body);
      } as any;

      // 🔹 after response finished
      res.on("finish", () => {
        const responseTime = Date.now() - startTime;

        dataLogger.logResponse(
          req.method,
          req.originalUrl,
          res.statusCode,
          responseTime,
          responseMessage || res.statusMessage
        );

        dataLogger.logSlowApi(req.method, req.originalUrl, responseTime);
      });

      next();
    });

    controllers.forEach((controller) => {
      this.app.use(url, controller.router);
    });
  }

  public checkHealth() {
    this.app.use("/", (req: Request, res: Response, next: NextFunction) => {
      const healthcheck: any = {
        uptime: process.uptime(),
        message: 'OK',
        timestamp: Date.now()
      };
      try {
        res.status(200).send(healthcheck);
      } catch (error) {
        healthcheck.message = error;
        res.status(503).send();
      }
    })
  }
}

new Server();
