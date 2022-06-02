import type { DocumentReference } from 'firebase-admin/firestore';

export interface GuildClassExams {
    description: string;
    date: string;
    session: DocumentReference;
}
