/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Product, InventoryTransaction, Customer, DeniTransaction, AppSettings } from '../types';
import { syncPushProduct, syncPushTransaction, syncPushCustomer, syncPushDeniTransaction, syncPushSettings, syncDeleteProduct } from '../lib/syncEngine';

const DB_NAME = 'stocksawa_db';
const DB_VERSION = 4;

export function initDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('IndexedDB failed to open');
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = request.result;

      if (!db.objectStoreNames.contains('products')) {
        db.createObjectStore('products', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('transactions')) {
        db.createObjectStore('transactions', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('customers')) {
        db.createObjectStore('customers', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('deni_transactions')) {
        db.createObjectStore('deni_transactions', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'id' });
      }
    };
  });
}

// Seed helper
export async function seedInitialDataIfNeeded(): Promise<void> {
  const db = await initDb();

  const getProductCount = (): Promise<number> => {
    return new Promise((resolve) => {
      const tx = db.transaction('products', 'readonly');
      const store = tx.objectStore('products');
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(0);
    });
  };

  const count = await getProductCount();
  if (count > 0) return; // Already seeded

  console.log('Seeding initial Kenyan retail shop inventory and customer database...');

  // Kenyan seed products
  const initialProducts: Product[] = [
    {
      id: 'p1',
      name: 'Jogoo Maize Meal 2KG',
      sku: '6111002000210',
      quantity: 45,
      sellingPrice: 190,
      costPrice: 165,
      imageUrl: null,
      createdAt: new Date(Date.now() - 3600000 * 24 * 10).toISOString(),
    },
    {
      id: 'p2',
      name: 'Royco Mchuzi Mix Beef 200g',
      sku: '6111005001221',
      quantity: 80,
      sellingPrice: 120,
      costPrice: 95,
      imageUrl: null,
      createdAt: new Date(Date.now() - 3600000 * 24 * 9).toISOString(),
    },
    {
      id: 'p3',
      name: 'Safari Tea Leaves 250g',
      sku: '6111003004509',
      quantity: 30,
      sellingPrice: 180,
      costPrice: 150,
      imageUrl: null,
      createdAt: new Date(Date.now() - 3600000 * 24 * 8).toISOString(),
    },
    {
      id: 'p4',
      name: 'Broadways Sweet Bread 400g',
      sku: '6111001009115',
      quantity: 15,
      sellingPrice: 65,
      costPrice: 52,
      imageUrl: null,
      createdAt: new Date(Date.now() - 3600000 * 24 * 1).toISOString(),
    },
    {
      id: 'p5',
      name: 'Kasuku Cooking Fat 1KG',
      sku: '6111008003102',
      quantity: 25,
      sellingPrice: 380,
      costPrice: 320,
      imageUrl: null,
      createdAt: new Date(Date.now() - 3600000 * 24 * 7).toISOString(),
    },
    {
      id: 'p6',
      name: 'Menengai Bar Soap White 800g',
      sku: '6111009002120',
      quantity: 12,
      sellingPrice: 160,
      costPrice: 135,
      imageUrl: null,
      createdAt: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
    },
    {
      id: 'p7',
      name: 'Ndovu Wheat Flour 2KG',
      sku: '6111010001000',
      quantity: 50,
      sellingPrice: 185,
      costPrice: 160,
      imageUrl: null,
      createdAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
    },
    {
      id: 'p8',
      name: 'Rina Vegetable Oil 1L',
      sku: '6111011001001',
      quantity: 20,
      sellingPrice: 350,
      costPrice: 310,
      imageUrl: null,
      createdAt: new Date(Date.now() - 3600000 * 24 * 4).toISOString(),
    },
    {
      id: 'p9',
      name: 'Ketepa Tea Bags 100s',
      sku: '6111012001002',
      quantity: 8,
      sellingPrice: 280,
      costPrice: 240,
      imageUrl: null,
      createdAt: new Date(Date.now() - 3600000 * 24 * 6).toISOString(),
    },
    {
      id: 'p10',
      name: 'Kabras Sugar 1KG',
      sku: '6111013001003',
      quantity: 100,
      sellingPrice: 150,
      costPrice: 130,
      imageUrl: null,
      createdAt: new Date(Date.now() - 3600000 * 24 * 1).toISOString(),
    },
    {
      id: 'p11',
      name: 'Soko Maize Meal 1KG',
      sku: '6111014001004',
      quantity: 60,
      sellingPrice: 95,
      costPrice: 80,
      imageUrl: null,
      createdAt: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
    },
    {
      id: 'p12',
      name: 'Omo Washing Powder 500g',
      sku: '6111015001005',
      quantity: 35,
      sellingPrice: 195,
      costPrice: 170,
      imageUrl: null,
      createdAt: new Date(Date.now() - 3600000 * 24 * 4).toISOString(),
    },
    {
      id: 'p13',
      name: 'Geisha Soap Aloe Vera',
      sku: '6111016001006',
      quantity: 40,
      sellingPrice: 85,
      costPrice: 70,
      imageUrl: null,
      createdAt: new Date(Date.now() - 3600000 * 24 * 8).toISOString(),
    },
    {
      id: 'p14',
      name: 'Aquafresh Toothpaste 100ml',
      sku: '6111017001007',
      quantity: 15,
      sellingPrice: 160,
      costPrice: 130,
      imageUrl: null,
      createdAt: new Date(Date.now() - 3600000 * 24 * 12).toISOString(),
    }
  ];

  const initialCustomers: Customer[] = [
    {
      id: 'c1',
      name: 'Mama Shiro (Grocer)',
      phone: '0712345678',
      debtBalance: 1200,
      createdAt: new Date(Date.now() - 3600000 * 24 * 30).toISOString(),
    },
    {
      id: 'c2',
      name: 'Baba Kevin (Boda Boda)',
      phone: '0722998877',
      debtBalance: 450,
      createdAt: new Date(Date.now() - 3600000 * 24 * 15).toISOString(),
    },
    {
      id: 'c3',
      name: 'Njuguna (Butcher)',
      phone: '0733554433',
      debtBalance: 0,
      createdAt: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
    }
  ];

  const initialDeniTransactions: DeniTransaction[] = [
    {
      id: 'dt1',
      customerId: 'c1',
      productId: 'p1',
      amount: 1200,
      type: 'credit',
      notes: 'Took 6 packets of Jogoo on credit',
      createdAt: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
      syncStatus: 'synced',
    },
    {
      id: 'dt2',
      customerId: 'c2',
      productId: 'p5',
      amount: 450,
      type: 'credit',
      notes: 'Bought Cooking Fat, to clear on Friday',
      createdAt: new Date(Date.now() - 3600000 * 24 * 1).toISOString(),
      syncStatus: 'synced',
    }
  ];

  // Seed into stores
  const pTx = db.transaction('products', 'readwrite');
  initialProducts.forEach(p => pTx.objectStore('products').put(p));

  const cTx = db.transaction('customers', 'readwrite');
  initialCustomers.forEach(c => cTx.objectStore('customers').put(c));

  const dTx = db.transaction('deni_transactions', 'readwrite');
  initialDeniTransactions.forEach(dt => dTx.objectStore('deni_transactions').put(dt));
}

// Core Product operations
export async function getProducts(): Promise<Product[]> {
  const db = await initDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('products', 'readonly');
    const store = tx.objectStore('products');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveProduct(product: Product): Promise<void> {
  const isOnline = typeof navigator !== 'undefined' && navigator.onLine;
  const productToSave: Product = { ...product, syncStatus: isOnline ? 'synced' : 'pending_sync' };
  const db = await initDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('products', 'readwrite');
    const store = tx.objectStore('products');
    const request = store.put(productToSave);
    request.onsuccess = () => {
      if (isOnline) syncPushProduct(productToSave);
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

export async function deleteProduct(id: string): Promise<void> {
  const db = await initDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('products', 'readwrite');
    const store = tx.objectStore('products');
    const request = store.delete(id);
    request.onsuccess = () => {
      syncDeleteProduct(id);
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

// Core Transactions operations
export async function getTransactions(): Promise<InventoryTransaction[]> {
  const db = await initDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('transactions', 'readonly');
    const store = tx.objectStore('transactions');
    const request = store.getAll();
    request.onsuccess = () => {
      // Sort transactions descending by date
      const sorted = (request.result as InventoryTransaction[]).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      resolve(sorted);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function saveTransaction(transaction: InventoryTransaction): Promise<void> {
  const isOnline = typeof navigator !== 'undefined' && navigator.onLine;
  const txToSave: InventoryTransaction = { ...transaction, syncStatus: isOnline ? 'synced' : 'pending_sync' };
  const db = await initDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('transactions', 'readwrite');
    const store = tx.objectStore('transactions');
    const request = store.put(txToSave);
    request.onsuccess = () => {
      if (isOnline) syncPushTransaction(txToSave);
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

// Core Customers operations
export async function getCustomers(): Promise<Customer[]> {
  const db = await initDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('customers', 'readonly');
    const store = tx.objectStore('customers');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveCustomer(customer: Customer): Promise<void> {
  const isOnline = typeof navigator !== 'undefined' && navigator.onLine;
  const customerToSave: Customer = { ...customer, syncStatus: isOnline ? 'synced' : 'pending_sync' };
  const db = await initDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('customers', 'readwrite');
    const store = tx.objectStore('customers');
    const request = store.put(customerToSave);
    request.onsuccess = () => {
      if (isOnline) syncPushCustomer(customerToSave);
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

// Core Deni Ledger operations
export async function getDeniTransactions(): Promise<DeniTransaction[]> {
  const db = await initDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('deni_transactions', 'readonly');
    const store = tx.objectStore('deni_transactions');
    const request = store.getAll();
    request.onsuccess = () => {
      const sorted = (request.result as DeniTransaction[]).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      resolve(sorted);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function saveDeniTransaction(transaction: DeniTransaction): Promise<void> {
  const isOnline = typeof navigator !== 'undefined' && navigator.onLine;
  const deniToSave: DeniTransaction = { ...transaction, syncStatus: isOnline ? 'synced' : 'pending_sync' };
  const db = await initDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('deni_transactions', 'readwrite');
    const store = tx.objectStore('deni_transactions');
    const request = store.put(deniToSave);
    request.onsuccess = () => {
      if (isOnline) syncPushDeniTransaction(deniToSave);
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

// Core Settings operations
export async function getSettings(): Promise<AppSettings | null> {
  const db = await initDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('settings', 'readonly');
    const store = tx.objectStore('settings');
    const request = store.get('current_settings');
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const db = await initDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('settings', 'readwrite');
    const store = tx.objectStore('settings');
    const request = store.put(settings);
    request.onsuccess = () => {
      syncPushSettings(settings);
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

// Clear/Reset DB
export async function resetDatabase(): Promise<void> {
  const db = await initDb();
  return new Promise((resolve, reject) => {
    const stores = ['products', 'transactions', 'customers', 'deni_transactions', 'settings'];
    const tx = db.transaction(stores, 'readwrite');

    stores.forEach(storeName => {
      tx.objectStore(storeName).clear();
    });

    tx.oncomplete = () => {
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}
