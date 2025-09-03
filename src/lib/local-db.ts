
import { logger } from './logger';

const DB_NAME = 'StagehandDB';
const DB_VERSION = 1;
const STORE_NAME = 'audioBlobs';

export class LocalDB {
  private db: IDBDatabase | null = null;
  private static instance: LocalDB;

  private constructor() {}

  public static getInstance(): LocalDB {
    if (!LocalDB.instance) {
      LocalDB.instance = new LocalDB();
    }
    return LocalDB.instance;
  }

  public openDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.db) {
        resolve();
        return;
      }
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        logger.error('IndexedDB error', request.error);
        reject('Error opening IndexedDB');
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        logger.log('IndexedDB opened successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
          logger.log('IndexedDB object store created');
        }
      };
    });
  }

  public async setItem(key: string, value: Blob): Promise<void> {
    await this.openDB();
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject('DB not initialized');
        return;
      }
      const transaction = this.db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(value, key);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  public async getItem(key: string): Promise<Blob | null> {
    await this.openDB();
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject('DB not initialized');
        return;
      }
      const transaction = this.db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  public async deleteItem(key: string): Promise<void> {
    await this.openDB();
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject('DB not initialized');
        return;
      }
      const transaction = this.db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(key);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }
}

export const localDB = LocalDB.getInstance();
