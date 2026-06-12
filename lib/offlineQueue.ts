// IndexedDB Helper for Offline PWA Queue

export interface OfflineFile {
    name: string;
    type: string;
    data: Blob; // Storing as Blob/File directly in IndexedDB
}

export interface OfflineSubmission {
    id: string;
    type: 'document_request' | 'complaint';
    payload: {
        documentType?: string;
        purpose?: string;
        formData?: Record<string, any>;
        complaintType?: string;
        subject?: string;
        description?: string;
        respondentName?: string;
        location?: string;
    };
    files: OfflineFile[];
    created_at: string;
}

const DB_NAME = 'e-barangay-offline-db';
const STORE_NAME = 'submissions-queue';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        if (typeof window === 'undefined' || !window.indexedDB) {
            reject(new Error('IndexedDB is not supported on this platform.'));
            return;
        }

        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
    });
}

export async function saveOfflineSubmission(submission: OfflineSubmission): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(submission);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
}

export async function getOfflineSubmissions(): Promise<OfflineSubmission[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result || []);
    });
}

export async function deleteOfflineSubmission(id: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
}

export async function clearOfflineQueue(): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
}
