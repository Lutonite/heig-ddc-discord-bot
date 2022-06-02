import type { DocumentReference } from 'firebase-admin/firestore';

export interface GuildClassHomework {
    description: string;
    date: string;
    session: DocumentReference;
}
