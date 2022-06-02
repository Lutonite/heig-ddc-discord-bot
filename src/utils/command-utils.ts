import { container } from '@sapphire/framework';
import type { Message } from 'discord.js';

export const assertGuild = (
    message: Message,
): message is Message<true> & Message => {
    if (!message.inGuild()) {
        container.logger.error('no guild');
        throw new Error('Command must be used in a guild.');
    }

    return true;
};
