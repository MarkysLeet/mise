import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface SyncDB extends DBSchema {
  mutations: {
    key: number;
    value: {
      id?: number;
      actionName: string;
      payload: any;
      timestamp: number;
      retryCount: number;
    };
    indexes: { 'by-timestamp': number };
  };
}

const DB_NAME = 'mise-sync-db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<SyncDB>> | null = null;

function getDB() {
  if (typeof window === 'undefined') return null;

  if (!dbPromise) {
    dbPromise = openDB<SyncDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('mutations')) {
          const store = db.createObjectStore('mutations', { keyPath: 'id', autoIncrement: true });
          store.createIndex('by-timestamp', 'timestamp');
        }
      },
    });
  }
  return dbPromise;
}

export async function addToQueue(actionName: string, payload: any) {
  const db = await getDB();
  if (!db) return;

  await db.add('mutations', {
    actionName,
    payload,
    timestamp: Date.now(),
    retryCount: 0,
  });
}

export async function getQueue() {
  const db = await getDB();
  if (!db) return [];

  return db.getAllFromIndex('mutations', 'by-timestamp');
}

export async function removeFromQueue(id: number) {
  const db = await getDB();
  if (!db) return;

  await db.delete('mutations', id);
}

export async function clearQueue() {
  const db = await getDB();
  if (!db) return;

  await db.clear('mutations');
}

export async function incrementRetryCount(id: number, currentItem: any) {
  const db = await getDB();
  if (!db) return;

  await db.put('mutations', {
    ...currentItem,
    retryCount: currentItem.retryCount + 1,
  });
}
