import type { Snowflake } from 'discord-api-types/globals';

export interface GuildClass {
    semester: number;
    module: string;
    channel: Snowflake;
    name: string;
}

export type ClassId = 'ANG' | 'ASD' | 'EXP' | 'MAT2' | 'PRG2';
