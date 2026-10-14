import { Kafka, Partitioners } from 'kafkajs';
import { config } from '../../config';
import * as Interface from '../../interfaces/kafka.interface';

class KafkaHelper {

    public kafka: any;
    private producer: any;
    public consumer: any;

    constructor() {
        this.connect();
    }

    async connect() {
        const KAFKA_BROKER = config.KAFKA_BROKER.split(',').map((broker: string) => broker.trim()).filter(Boolean);
        const kafkaCrednetials: Interface.KafkaCrednetials = {
            clientId: String(config.KAFKA_CLIENT_ID), // 'test'
            brokers: KAFKA_BROKER, // ['localhost:9092']
        };
        this.kafka = new Kafka(kafkaCrednetials);
        // the default partitioner of KafkaJS 2 is already in use; passing it explicitly silences the start-up warning
        this.producer = await this.kafka.producer({ createPartitioner: Partitioners.DefaultPartitioner });
        await this.producer.connect();
        console.log('producer connetced');
    }

    public async produceMessage(topic: string, messageData: any) {
        try {
            await this.producer.send({
                topic: topic,
                acks: 1,
                messages: [{ value: JSON.stringify(messageData) }],
            });
        } catch (error) {
            console.log('🔥 ~ ~ produceMessage error', error);
        }
    }

}

export default new KafkaHelper();
