import ZooKeeper from './connections/zookeeper';
(async () => {
    await ZooKeeper.connectZookeeper();
    await require('./config/index');
    await require('./index');
})();