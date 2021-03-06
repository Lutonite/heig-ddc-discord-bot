import { errorEmbed } from '#src/utils/embed-utils';
import { ApplyOptions } from '@sapphire/decorators';
import { CommandDeniedPayload, Listener } from '@sapphire/framework';

@ApplyOptions<Listener.Options>({
    event: 'commandDenied',
})
export default class CommandDeniedListener extends Listener {
    run(error: Error, { message }: CommandDeniedPayload): unknown {
        return message.reply({
            embeds: [
                errorEmbed(
                    `Unauthorized command access. Reason:\n${error.message}`,
                ),
            ],
        });
    }
}
