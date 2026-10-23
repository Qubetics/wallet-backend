# Qubetics Wallet Backend (Decentralized Wallet)

API gateway for the Qubetics Wallet mobile app, admin panel and browser extension.

## Prerequisites

| Requirement | Version / notes |
|---|---|
| Node.js | 24.22.1 (same as the Docker image and `.nvmrc`) |
| npm | 11 (bundled with Node 24) |
| ZooKeeper | Holds the service configuration (see below) |
| MySQL | Main database (read and write hosts) |
| Redis | Cache |
| Kafka | Message broker shared with the chain services |

## Configuration

The service reads two environment variables from a `.env` file in the project root. Copy the example and fill it in:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `ZOOKEEPER_HOST` | ZooKeeper address, for example `localhost:2181` |
| `ZOOKEEPER_PATH` | ZooKeeper node that holds the configuration, for example `/qubetics_wallet` |

Every other setting is read from that ZooKeeper node, which holds a single JSON document. The main keys are:

| Area | Keys |
|---|---|
| Server | `PORT`, `SSL.KEY`, `SSL.CERT`, `SSL_PASS_PHRASE`, `CORS_ORIGINS` (optional: allowed browser origins; any origin when unset) |
| Database | `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_HOST_WRITE`, `DB_HOST_READ` |
| Redis / Kafka | `REDIS_CONN`, `KAFKA_BROKER` (comma-separated), `KAFKA_CLIENT_ID` |
| Auth and encryption | `JWT_SECRET`, `REFRESH_SECRET`, `ENCRYPT_SECRET`, `ENCRYPT_IV_SECRET`, `RSA_KEYS` |
| Push notifications | `FIREBASE_SERVICE_ACCOUNT` |
| File storage | `HUAWEI_OBS.*` |

The service refuses to start if any required key is missing (see `src/config/required-secrets.ts`):
`FIREBASE_SERVICE_ACCOUNT`, `RSA_KEYS.USER.PRIVATE`, `RSA_KEYS.USER.PUBLIC`, `RSA_KEYS.ADMIN.PRIVATE`, `RSA_KEYS.ADMIN.PUBLIC`, `SSL.KEY`, `SSL.CERT`, `ALCHEMY_SOLANA_KEY`, `SWAGGER_AUTH.USER`, `SWAGGER_AUTH.PASS`.

Never commit `.env` or any configuration values to the repository.

## Run locally

```bash
# 1. Install dependencies
npm install

# 2. Build and start (compiles TypeScript into build/ and starts the server)
npm run start
```

On start-up the service:

1. connects to ZooKeeper and loads the configuration,
2. checks the required keys,
3. connects to MySQL, Redis and Kafka,
4. starts the HTTPS server on `PORT`.

A successful start logs `server listen on port: <PORT>`, `Connected to redis client successfully`, `producer connetced` and `Database connected successfully.`

To check that the service is up, open `https://localhost:<PORT>/`. It returns `{"uptime": ..., "message": "OK", "timestamp": ...}`. The server uses the SSL certificate from the configuration, so a local or self-signed certificate shows a browser warning.

## Other commands

| Command | Description |
|---|---|
| `npm run build` | Compile TypeScript into `build/` and copy static files, without starting |
| `npm test` | Build and run the tests in `test/` |

## Run with Docker

```bash
docker build -t wallet-backend .
docker run -d --name wallet-backend \
  -e ZOOKEEPER_HOST=<zookeeper-host:port> \
  -e ZOOKEEPER_PATH=<config-node> \
  -p <PORT>:<PORT> \
  wallet-backend
```

ZooKeeper, MySQL, Redis and Kafka must be reachable from inside the container.

## Troubleshooting

| Symptom | Cause |
|---|---|
| `Missing ZooKeeper config keys: ...` | A required key is missing from the ZooKeeper node |
| Hangs at start-up with no `server listen` line | ZooKeeper unreachable, or wrong `ZOOKEEPER_HOST` / `ZOOKEEPER_PATH` |
| `ECONNREFUSED` for Redis, MySQL or Kafka | The service is not running, or the address in the configuration is wrong |
