import { getDatabase } from '@/lib/mongodb';
import { DocumentMetadata, CreateDocumentInput } from '@/lib/types/document.types';
import { ObjectId } from 'mongodb';

const COLLECTION = 'documents';

export async function createDocument(input: CreateDocumentInput): Promise<DocumentMetadata> {
    const db = await getDatabase();

    const docToInsert = {
        ...input,
        uploadedAt: new Date(),
        status: 'PENDING' as const,
        isApproved: false,
    };

    const result = await db.collection(COLLECTION).insertOne(docToInsert);

    return {
        ...docToInsert,
        _id: result.insertedId.toString(),
        id: result.insertedId.toString(),
    } as DocumentMetadata;
}

export async function getDocumentById(id: string): Promise<DocumentMetadata | null> {
    const db = await getDatabase();
    try {
        const doc = await db.collection(COLLECTION).findOne({ _id: new ObjectId(id) });
        if (!doc) return null;

        return {
            ...doc,
            _id: doc._id.toString(),
            id: doc._id.toString(),
        } as unknown as DocumentMetadata;
    } catch (error) {
        return null;
    }
}

export async function listUserDocuments(userId: string): Promise<DocumentMetadata[]> {
    const db = await getDatabase();
    const docs = await db.collection(COLLECTION)
        .find({ userId })
        .sort({ uploadedAt: -1 })
        .toArray();

    return docs.map(doc => ({
        ...doc,
        _id: doc._id.toString(),
        id: doc._id.toString(),
    })) as unknown as DocumentMetadata[];
}

export async function updateDocumentStatus(
    id: string,
    updates: Partial<DocumentMetadata>
): Promise<void> {
    const db = await getDatabase();
    await db.collection(COLLECTION).updateOne(
        { _id: new ObjectId(id) },
        { $set: updates }
    );
}

export async function deleteDocument(id: string): Promise<void> {
    const db = await getDatabase();
    await db.collection(COLLECTION).deleteOne({ _id: new ObjectId(id) });
}
