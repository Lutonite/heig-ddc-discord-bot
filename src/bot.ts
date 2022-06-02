import { container, LogLevel, SapphireClient } from '@sapphire/framework';
import '@sapphire/plugin-editable-commands/register';
import '@sapphire/plugin-hmr/register';
import '@sapphire/plugin-logger/register';
import { ScheduledTaskRedisStrategy } from '@sapphire/plugin-scheduled-tasks/register-redis';
import dayjs from 'dayjs';
import dayjsParser from 'dayjs-parser';
import 'dayjs/locale/fr-ch';
import duration from 'dayjs/plugin/duration';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import relativeTime from 'dayjs/plugin/relativeTime';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import weekday from 'dayjs/plugin/weekday';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import { GatewayIntentBits } from 'discord-api-types/v10';
import 'dotenv/config';
import { cert, initializeApp } from 'firebase-admin/app';
import { type Firestore, getFirestore } from 'firebase-admin/firestore';
import IORedis, { type Redis } from 'ioredis';

dayjs.extend(dayjsParser);
dayjs.extend(duration);
dayjs.extend(localizedFormat);
dayjs.extend(relativeTime);
dayjs.extend(timezone);
dayjs.extend(utc);
dayjs.extend(weekday);
dayjs.extend(weekOfYear);

dayjs.locale('fr-ch');
dayjs.tz.setDefault('Europe/Zurich');

initializeApp({
    credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: Buffer.from(
            process.env.FIREBASE_PRIVATE_KEY ?? '',
            'base64',
        ).toString('utf-8'),
    }),
});

container.database = getFirestore();

container.redisClient = new IORedis(process.env.REDIS_URL);
const { host, port, password, db } = container.redisClient.options;

const client = new SapphireClient({
    defaultPrefix: '!',
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildEmojisAndStickers,
        GatewayIntentBits.GuildIntegrations,
        GatewayIntentBits.GuildWebhooks,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildScheduledEvents,
        GatewayIntentBits.MessageContent,
    ],
    logger: {
        level: LogLevel.Debug,
    },
    tasks: {
        strategy: new ScheduledTaskRedisStrategy({
            bull: {
                redis: {
                    host,
                    port,
                    password,
                    db,
                },
                prefix: 'ddc.queue-',
            },
        }),
    },
    hmr: {
        enabled: process.env.NODE_ENV === 'development',
    },
});

client
    .login(process.env.DISCORD_TOKEN)
    .then(() => {
        client.logger.info('Successfully connected');
        client.logger.debug(
            'Loaded',
            client.stores.get('commands').size,
            'commands',
        );
        client.logger.debug(
            'Loaded',
            client.stores.get('scheduled-tasks').size,
            'tasks',
        );
    })
    // eslint-disable-next-line no-console
    .catch(console.error);

declare module '@sapphire/pieces' {
    interface Container {
        redisClient: Redis;
        database: Firestore;
    }
}
