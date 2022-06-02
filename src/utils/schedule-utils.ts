import type { GuildClass } from '#src/database/guild-class';
import type { GuildClassSession } from '#src/database/guild-class-session';
import { converter, getGuildCollection } from '#src/utils/firestore-utils';
import type { Guild, GuildTextBasedChannel } from 'discord.js';
import type {
    CollectionReference,
    DocumentReference,
} from 'firebase-admin/firestore';

export const getGuildClasses = async (
    guild: Guild,
): Promise<CollectionReference<GuildClass>> => {
    const guildDb = await getGuildCollection(guild);
    return guildDb.collection('classes').withConverter(converter<GuildClass>());
};

export const getGuildClass = async (
    guild: Guild,
    channel: GuildTextBasedChannel,
): Promise<DocumentReference<GuildClass> | undefined> => {
    const guildClass = await getGuildClasses(guild).then((classes) =>
        classes.where('channel', '==', channel.id).get(),
    );

    if (guildClass.empty) {
        return undefined;
    }

    return guildClass.docs[0].ref;
};

export const getGuildClassSessions = async (
    guildClass: DocumentReference<GuildClass>,
): Promise<CollectionReference<GuildClassSession> | undefined> => {
    return guildClass
        .collection('sessions')
        .withConverter(converter<GuildClassSession>());
};

export const getSessionType = (session: GuildClassSession): string => {
    switch (session.type) {
        case 'class':
            return '🎓 Cours';
        case 'lab':
            return '⚗ Laboratoire';
        default:
            return '❓';
    }
};
