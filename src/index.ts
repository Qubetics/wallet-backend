// Conditional import based on server environment
import { Server as HTTPServer, createServer as createHTTPServer } from "http";
import { Server as HTTPSServer, createServer as createHTTPSServer } from "https";

import express, { NextFunction, Request, Response } from "express";
import { ServerInterface } from "./interfaces/server.interface";
import controllers from "./modules/controllers.index";
import cors from "cors";
import path from "path";
import expressFileUploader from "express-fileupload";
import { config } from "./config";
import helmet from "helmet";
import { encryptionMiddleware } from "./middlewares/encryption.middleware";
import { ValidationError, Joi } from 'express-validation';
import { GlblCode, GlblMessages, InfoMessages } from "./constants/global_enum";
import ApiLimiter from "./middlewares/apiRateLimiter";
import sanitizeHtml from "sanitize-html";

const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');
const basicAuth = require('express-basic-auth');
import fs from 'fs';


class Server implements ServerInterface {
  public app: express.Application;
  public httpServer: HTTPServer | HTTPSServer;
  public sslKey?: Buffer;
  public sslCert?: Buffer;
  private isStage: boolean;

  constructor() {
    // Validate that zookeeper configuration is loaded
    if (!config.SERVER) {
      throw new Error('❌ SERVER configuration not found in zookeeper. Please ensure zookeeper is properly configured.');
    }
    
    // Check if server environment is 'stage' for HTTP, otherwise use HTTPS
    this.isStage = config.SERVER === 'stage';
    
    console.log(`🔧 Detected environment: ${config.SERVER}`);
    console.log(`📋 Protocol selection: ${this.isStage ? 'HTTP' : 'HTTPS'}`);
    
    // Always read SSL certificates (they might be needed even for stage in some cases)
    try {
      this.sslKey = fs.readFileSync(path.join(__dirname, './cert/key.pem'));
      this.sslCert = fs.readFileSync(path.join(__dirname, './cert/cert.pem'));
      console.log('🔐 SSL certificates loaded successfully');
    } catch (error) {
      if (!this.isStage) {
        throw new Error(`❌ Failed to load SSL certificates for HTTPS mode: ${error}`);
      }
      console.warn('⚠️  SSL certificates not found, but continuing in HTTP mode for stage environment');
    }

    this.app = express();

    this.app.use(expressFileUploader());
    
    // Conditional server creation based on environment
    if (this.isStage) {
      console.log('🌍 Starting server in STAGE mode - Using HTTP configuration');
      this.httpServer = createHTTPServer(this.app);
    } else {
      console.log('🔒 Starting server in PRODUCTION mode - Using HTTPS configuration');
      if (!this.sslKey || !this.sslCert) {
        throw new Error('❌ SSL certificates are required for HTTPS mode but were not loaded properly');
      }
      this.httpServer = createHTTPSServer({ 
        key: this.sslKey, 
        cert: this.sslCert, 
        passphrase: config.SSL_PASS_PHRASE 
      }, this.app);
    }

    this.app.use(helmet());
    this.app.use(helmet.contentSecurityPolicy({
      useDefaults: true,
      directives: {
        "frame-ancestors": "'none'",
      },
    }));
    this.app.use(helmet.dnsPrefetchControl());
    this.app.use(helmet.expectCt());
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
    this.app.use(cors());
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
      users: { 'REDACTED': 'REDACTED' }, // Set your username and password here
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
    const protocol = this.isStage ? 'HTTP' : 'HTTPS';
    const url = this.isStage ? `http://localhost:${config.PORT}` : `https://localhost:${config.PORT}`;
    
    this.httpServer.listen(config.PORT, () => {
      console.log(`🚀 ${protocol} server listening on port: ${config.PORT}`);
      console.log(`📡 Server URL: ${url}`);
      console.log(`🔧 Environment: ${config.SERVER}`);
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
    console.log(
      "\n\n\n🌪🌪🌪🌪🌪🌪🌪🌪🌪🌪🌪🌪🌪🌪🌪🌪🌪🌪🌪🌪🌪🌪🌪🌪🌪🌪🌪",
      url,
      "🌪🌪🌪🌪🌪🌪🌪🌪🌪🌪🌪🌪🌪🌪🌪🌪🌪🌪🌪🌪🌪🌪🌪🌪🌪\n"
    );

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
