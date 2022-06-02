import type { GuildClass } from '#src/database/guild-class';
import type { GuildClassSession } from '#src/database/guild-class-session';
import { assertGuild } from '#src/utils/command-utils';
import { errorEmbed, successEmbed } from '#src/utils/embed-utils';
import {
    getGuildClass,
    getGuildClasses,
    getGuildClassSessions,
} from '#src/utils/schedule-utils';
import { ApplyOptions } from '@sapphire/decorators';
import type { Args } from '@sapphire/framework';
import { reply, send } from '@sapphire/plugin-editable-commands';
import { SubCommandPluginCommand } from '@sapphire/plugin-subcommands';
import { oneLine } from 'common-tags';
import dayjs from 'dayjs';
import type { Message } from 'discord.js';
import { MessageEmbed } from 'discord.js';
import type { DocumentSnapshot } from 'firebase-admin/firestore';

const buildSessionEmbed = async (
    session: DocumentSnapshot<GuildClassSession>,
): Promise<MessageEmbed> => {
    const startSplit = session.data()?.start.split(':') ?? ['00', '00'];
    const endSplit = session.data()?.end.split(':') ?? ['00', '00'];
    return new MessageEmbed().setColor('#0099ff').setTitle(session.id)
        .setDescription(oneLine`
            Le ${dayjs()
                .day((session.data()?.day ?? 0) + 1)
                .format('dddd')}
            de <t:${dayjs()
                .local()
                .hour(Number.parseInt(startSplit[0], 10))
                .minute(Number.parseInt(startSplit[1], 10))
                .unix()}:t>
            à <t:${dayjs()
                .local()
                .hour(Number.parseInt(endSplit[0], 10))
                .minute(Number.parseInt(endSplit[1], 10))
                .unix()}:t>
        `);
};

const displaySessions = async (
    guildClass: DocumentSnapshot<GuildClass>,
    message: Message<true>,
): Promise<void> => {
    const sessions = await getGuildClassSessions(guildClass.ref).then((r) =>
        r?.get(),
    );
    if (!sessions) {
        await reply(message, {
            embeds: [
                errorEmbed('There are no sessions assigned to this class.'),
            ],
        });
        return;
    }

    await send(message, {
        content: `📅 **Schedule for "${guildClass?.get('name')}"**`,
        embeds: await Promise.all(
            sessions.docs.map((session) => buildSessionEmbed(session)),
        ),
    });
};

@ApplyOptions<SubCommandPluginCommand.Options>({
    name: 'schedule',
    enabled: true,
    options: true,
    subCommands: [
        { input: 'show', default: true },
        { input: 'show-all', output: 'showAll' },
        { input: 'add-class', output: 'addClass' },
        { input: 'edit-class', output: 'editClass' },
        { input: 'remove-class', output: 'removeClass' },
        { input: 'add-session', output: 'addSession' },
        { input: 'edit-session', output: 'editSession' },
        { input: 'delete-session', output: 'deleteSession' },
        'import',
        'help',
    ],
    description: oneLine`
        Manage the schedule for various classes.
        Type !schedule help for more information.
    `,
    runIn: 'GUILD_TEXT',
})
export default class ScheduleCommand extends SubCommandPluginCommand {
    public async show(message: Message, args: Args) {
        if (!assertGuild(message)) return;
        const channel = args.finished
            ? message.channel
            : await args.pick('guildTextChannel');

        const guildClass = await getGuildClass(message.guild, channel).then(
            (r) => r?.get(),
        );
        if (!guildClass) {
            await reply(message, {
                embeds: [
                    errorEmbed('There is no class assigned to this channel.'),
                ],
            });
            return;
        }

        await displaySessions(guildClass, message);
    }

    public async showAll(message: Message) {
        if (!assertGuild(message)) return;
        const guildClasses = await getGuildClasses(message.guild).then((r) =>
            r?.get(),
        );
        if (!guildClasses || guildClasses.empty) {
            await reply(message, {
                embeds: [
                    errorEmbed('There are no classes assigned to this server.'),
                ],
            });
            return;
        }

        await send(message, {
            content: `📅 **Schedule for all classes**:`,
        });

        await Promise.all(
            guildClasses.docs.map((guildClass) => {
                displaySessions(guildClass, message);
                return true;
            }),
        );
    }

    public async add(message: Message, args: Args) {
        if (!assertGuild(message)) return;

        const channel = await args.pick('guildTextChannel');
        const classId = await args.pick('string');
        const semester = await args.pick('number');
        const module = await args.pick('string');
        const fullName = await args.pick('string');

        const guildClass: GuildClass = {
            semester,
            module,
            name: fullName,
            channel: channel.id,
        };

        const guildClassCollection = await getGuildClasses(message.guild);
        await guildClassCollection.doc(classId).set(guildClass);

        await send(message, {
            embeds: [successEmbed(`Class "${classId}" added.`)],
        });
    }
}
