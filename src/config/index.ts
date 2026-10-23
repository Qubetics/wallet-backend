import { config } from "./config";
import zookeeperConfig from "../connections/zookeeper.conn";
import { assertRequiredSecrets, REQUIRED_SECRETS } from "./required-secrets";

assertRequiredSecrets(zookeeperConfig.config, REQUIRED_SECRETS);

export { config };
