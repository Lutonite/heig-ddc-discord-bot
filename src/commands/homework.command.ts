import type { Homework } from '#src/database/GuildDocument';
import { errorEmbed, successEmbed } from '#src/utils/embed-utils';
import { converter, getGuildCollection } from '#src/utils/firestore-utils';
import { ApplyOptions } from '@sapphire/decorators';
import type { Args } from '@sapphire/framework';
import { SubCommandPluginCommand } from '@sapphire/plugin-subcommands';
import dayjs from 'dayjs';
import {
    type EmbedFieldData,
    type Guild,
    type Message,
    MessageEmbed,
    type TextChannel,
} from 'discord.js';
import type {
    CollectionReference,
    DocumentSnapshot,
} from 'firebase-admin/firestore';

@ApplyOptions<SubCommandPluginCommand.Options>({
    name: 'homework',
    enabled: true,
    subCommands: [
        { input: 'show', default: true },
        { input: 'show-all', output: 'showAll' },
        'help',
        'add',
        'update',
        'delete',
    ],
    aliases: ['hw'],
    description: 'Manage homeworks. !hw help to show all commands',
    runIn: 'GUILD_TEXT',
})
export default class HomeworkCommand extends SubCommandPluginCommand {
    public async help(message: Message) {
        message.channel.send({
            embeds: [
                new MessageEmbed()
                    .setColor('#fad541')
                    .setTitle('Homework commands')
                    .setDescription(
                        'Manage homeworks for a channel. \n Alias: [hw, homework]',
                    )
                    .addFields(
                        {
                            name: 'Add homework',
                            value: '!hw add #channel dd.mm.yyyy Homework description',
                        },
                        {
                            name: 'Show homeworks (channel bound)',
                            value: '!hw show',
                        },
                        {
                            name: 'Show all homeworks',
                            value: '!hw show-all',
                        },
                        {
                            name: 'Delete homework',
                            value: '!hw delete ID',
                        },
                        {
                            name: 'Update homework',
                            value: '!hw update homework-id dd.mm.yyyy New description',
                        },
                    ),
            ],
        });
    }

    public async show(message: Message) {
        const { logger } = this.container;
        const channelName = (message.channel as TextChannel).name;
        if (!message.guild) {
            logger.error('No guild');
            return;
        }

        const guildDb = await this.getHomeworkCollection(message.guild);
        const homeworks = await guildDb
            .where('module', '==', channelName)
            .orderBy('date', 'asc')
            .get();

        if (homeworks.empty) {
            message.channel.send({
                embeds: [
                    new MessageEmbed()
                        .setColor('#fad541')
                        .setTitle(`No homework for ${channelName}`),
                ],
            });
            return;
        }

        message.channel.send({
            embeds: [
                new MessageEmbed()
                    .setColor('#fad541')
                    .setTitle(`Homeworks for ${channelName}`)
                    .addFields(...this.generateEmbedFieldData(homeworks.docs)),
            ],
        });
    }

    public async showAll(message: Message) {
        const { logger } = this.container;
        if (!message.guild) {
            logger.error('No guild');
            return;
        }

        const guildDb = await this.getHomeworkCollection(message.guild);
        const homeworks = await guildDb.orderBy('date', 'asc').get();

        if (homeworks.empty) {
            message.channel.send({
                embeds: [
                    new MessageEmbed()
                        .setColor('#fad541')
                        .setTitle(`No homework`),
                ],
            });
            return;
        }

        message.channel.send({
            embeds: [
                new MessageEmbed()
                    .setColor('#fad541')
                    .setTitle(`Homeworks for all channels`)
                    .addFields(...this.generateEmbedFieldData(homeworks.docs)),
            ],
        });
    }

    public async add(message: Message, args: Args) {
        const { logger } = this.container;
        if (!message.guild) {
            logger.error('No guild');
            return;
        }

        const channelName = await args
            .pick('guildTextChannel')
            .then((c) => c.name);
        const dueDate = await args.pick('dayjs');
        const description = await args.rest('string');

        const homework: Homework = {
            module: channelName,
            description,
            date: dueDate.toISOString(),
        };

        const guildDb = await this.getHomeworkCollection(message.guild);
        const doc = await guildDb.add(homework);

        message.channel.send({
            embeds: [
                new MessageEmbed()
                    .setColor('#6CC070')
                    .setTitle(`Homework added for ${channelName}`)
                    .setDescription(`ID: \`${doc.id}\``)
                    .addFields(
                        ...this.generateEmbedFieldData([await doc.get()]),
                    ),
            ],
        });
    }

    public async update(message: Message, args: Args) {
        const { logger } = this.container;
        if (!message.guild) {
            logger.error('No guild');
            return;
        }

        const id = await args.pick('string');
        const dueDate = await args.pick('dayjs');
        const description = await args.rest('string');

        const guildDb = await this.getHomeworkCollection(message.guild);
        const homeworkRef = guildDb.doc(id);

        try {
            await homeworkRef.update({
                date: dueDate.toISOString(),
                description,
            });

            const homework = await homeworkRef.get();
            message.channel.send({
                embeds: [
                    new MessageEmbed()
                        .setColor('#6CC070')
                        .setTitle(
                            `Homework modified for ${homework.data()?.module}`,
                        )
                        .setDescription(`ID: \`${homeworkRef.id}\``)
                        .addFields(...this.generateEmbedFieldData([homework])),
                ],
            });
        } catch (e: unknown) {
            logger.debug('[firestore] update error', e);
            message.channel.send({
                embeds: [errorEmbed(`No homework found with ID ${id}`)],
            });
        }
    }

    public async delete(message: Message, args: Args) {
        const { logger } = this.container;
        if (!message.guild) {
            logger.error('No guild');
            return;
        }

        const id = await args.pick('string');

        const guildDb = await this.getHomeworkCollection(message.guild);
        try {
            await guildDb.doc(id).delete({
                exists: true,
            });

            message.channel.send({
                embeds: [
                    successEmbed(`Homework with ID ${id} has been deleted.`),
                ],
            });
        } catch (e: unknown) {
            logger.debug('[firestore] delete error', e);
            message.channel.send({
                embeds: [errorEmbed(`No homework found with ID ${id}`)],
            });
        }
    }

    private generateEmbedFieldData(
        hws: DocumentSnapshot<Homework>[],
    ): EmbedFieldData[] {
        return hws.map((hw, i) => {
            return {
                name: `${i + 1}. ${hw.data()?.module} - ${
                    hw.data()?.description
                }`,
                value: `Due <t:${dayjs(hw.data()?.date).unix()}:R> (<t:${dayjs(
                    hw.data()?.date,
                ).unix()}:F>)\nID: \`${hw.id}\``,
            };
        });
    }

    private getHomeworkCollection(
        guild: Guild,
    ): Promise<CollectionReference<Homework>> {
        return getGuildCollection(guild).then((c) =>
            c.collection('homeworks').withConverter(converter<Homework>()),
        );
    }
}
