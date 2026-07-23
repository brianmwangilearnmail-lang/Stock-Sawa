import { supabase } from './supabase';
import { Product, InventoryTransaction, Customer, DeniTransaction, AppSettings } from '../types';
import { initDb } from '../db/indexedDb';

// Helper to convert base64 data URL to File
async function dataUrlToFile(dataUrl: string, filename: string): Promise<File> {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}

// Helper to get the current authenticated user's ID
async function getCurrentUserId(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}

export async function syncPushProduct(product: Product) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return;

    let finalImageUrl = product.imageUrl;

    // If the image is a base64 string, upload it to Supabase Storage
    if (finalImageUrl && finalImageUrl.startsWith('data:image')) {
      const fileName = `${userId}/product-${product.id}-${Date.now()}.jpg`;
      const file = await dataUrlToFile(finalImageUrl, fileName);
      
      const { error } = await supabase.storage
        .from('product-images')
        .upload(fileName, file, { upsert: true });

      if (error) {
        console.error('Failed to upload image to Supabase Storage:', error);
      } else {
        const { data: publicUrlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(fileName);
          
        finalImageUrl = publicUrlData.publicUrl;
        
        // Update local IndexedDB with the real URL so we don't upload it again
        const updatedProduct = { ...product, imageUrl: finalImageUrl };
        const db = await initDb();
        const tx = db.transaction('products', 'readwrite');
        tx.objectStore('products').put(updatedProduct);
        
        // Push the updated product with real URL
        const { error: upsertError } = await supabase
          .from('products')
          .upsert({ ...updatedProduct, user_id: userId }, { onConflict: 'id' });
        if (upsertError) console.error('syncPushProduct image upsert error:', upsertError);
        return;
      }
    }

    const { error } = await supabase
      .from('products')
      .upsert({ ...product, imageUrl: finalImageUrl, user_id: userId }, { onConflict: 'id' });
    if (error) console.error('syncPushProduct error:', error);
  } catch (err) {
    console.error('Failed to sync product to Supabase', err);
  }
}

export async function syncPushTransaction(transaction: InventoryTransaction) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return;

    const { error } = await supabase
      .from('transactions')
      .upsert({ ...transaction, user_id: userId }, { onConflict: 'id' });
    if (error) console.error('syncPushTransaction error:', error);
  } catch (err) {
    console.error('Failed to sync transaction to Supabase', err);
  }
}

export async function syncPushCustomer(customer: Customer) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return;

    const { error } = await supabase
      .from('customers')
      .upsert({ ...customer, user_id: userId }, { onConflict: 'id' });
    if (error) console.error('syncPushCustomer error:', error);
  } catch (err) {
    console.error('Failed to sync customer to Supabase', err);
  }
}

export async function syncPushDeniTransaction(transaction: DeniTransaction) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return;

    const { error } = await supabase
      .from('deni_transactions')
      .upsert({ ...transaction, syncStatus: 'synced', user_id: userId }, { onConflict: 'id' });
    if (error) console.error('syncPushDeniTransaction error:', error);
  } catch (err) {
    console.error('Failed to sync deni transaction to Supabase', err);
  }
}

export async function syncPushSettings(settings: AppSettings) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return;

    const cloudSettings = { ...settings, id: `settings_${userId}`, user_id: userId };

    const { error } = await supabase
      .from('settings')
      .upsert(cloudSettings, { onConflict: 'id' });
    if (error) console.error('syncPushSettings error:', error);
  } catch (err) {
    console.error('Failed to sync settings to Supabase', err);
  }
}

export async function syncDeleteProduct(id: string) {
  try {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) console.error('syncDeleteProduct error:', error);
  } catch (err) {
    console.error('Failed to delete product from Supabase', err);
  }
}

// ============================================================
// SOFT PULL — Merge only. NEVER deletes local records.
// Safe to call on realtime events and periodic background syncs.
// Only writes records that exist in Supabase (adds/updates).
// ============================================================
function mergeIntoStore(db: IDBDatabase, storeName: string, records: any[]): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!records || records.length === 0) {
      resolve(); // Nothing to merge — do NOT clear local data
      return;
    }
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    records.forEach(r => store.put(r));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function syncPullAll(db: IDBDatabase) {
  try {
    const [productsRes, transactionsRes, customersRes, deniRes, settingsRes] = await Promise.all([
      supabase.from('products').select('*'),
      supabase.from('transactions').select('*'),
      supabase.from('customers').select('*'),
      supabase.from('deni_transactions').select('*'),
      supabase.from('settings').select('*'),
    ]);

    if (productsRes.error) console.error('Pull products error:', productsRes.error);
    if (transactionsRes.error) console.error('Pull transactions error:', transactionsRes.error);
    if (customersRes.error) console.error('Pull customers error:', customersRes.error);
    if (deniRes.error) console.error('Pull deni error:', deniRes.error);
    if (settingsRes.error) console.error('Pull settings error:', settingsRes.error);

    // Soft merge — only add/update records, NEVER clear local data
    const promises = [];
    if (!productsRes.error) promises.push(mergeIntoStore(db, 'products', productsRes.data ?? []));
    if (!transactionsRes.error) promises.push(mergeIntoStore(db, 'transactions', transactionsRes.data ?? []));
    if (!customersRes.error) promises.push(mergeIntoStore(db, 'customers', customersRes.data ?? []));
    if (!deniRes.error) promises.push(mergeIntoStore(db, 'deni_transactions', deniRes.data ?? []));
    if (!settingsRes.error) {
      const localSettings = (settingsRes.data ?? []).map(s => ({ ...s, id: 'current_settings' }));
      promises.push(mergeIntoStore(db, 'settings', localSettings));
    }

    await Promise.all(promises);
  } catch (err) {
    console.error('Failed to pull from Supabase', err);
  }
}

// ============================================================
// HARD PULL — Clear then replace. Use ONLY on fresh login.
// Should only be called AFTER resetDatabase() clears old user data.
// ============================================================
function clearAndWriteStore(db: IDBDatabase, storeName: string, records: any[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const clearReq = store.clear();
    clearReq.onsuccess = () => {
      records.forEach(r => store.put(r));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    };
    clearReq.onerror = () => reject(clearReq.error);
  });
}

export async function syncHardPullAll(db: IDBDatabase) {
  try {
    const [productsRes, transactionsRes, customersRes, deniRes, settingsRes] = await Promise.all([
      supabase.from('products').select('*'),
      supabase.from('transactions').select('*'),
      supabase.from('customers').select('*'),
      supabase.from('deni_transactions').select('*'),
      supabase.from('settings').select('*'),
    ]);

    if (productsRes.error) console.error('Hard pull products error:', productsRes.error);
    if (transactionsRes.error) console.error('Hard pull transactions error:', transactionsRes.error);
    if (customersRes.error) console.error('Hard pull customers error:', customersRes.error);
    if (deniRes.error) console.error('Hard pull deni error:', deniRes.error);
    if (settingsRes.error) console.error('Hard pull settings error:', settingsRes.error);

    const promises = [];
    if (!productsRes.error) promises.push(clearAndWriteStore(db, 'products', productsRes.data ?? []));
    if (!transactionsRes.error) promises.push(clearAndWriteStore(db, 'transactions', transactionsRes.data ?? []));
    if (!customersRes.error) promises.push(clearAndWriteStore(db, 'customers', customersRes.data ?? []));
    if (!deniRes.error) promises.push(clearAndWriteStore(db, 'deni_transactions', deniRes.data ?? []));
    if (!settingsRes.error) {
      const localSettings = (settingsRes.data ?? []).map(s => ({ ...s, id: 'current_settings' }));
      promises.push(clearAndWriteStore(db, 'settings', localSettings));
    }

    await Promise.all(promises);
  } catch (err) {
    console.error('Failed to hard pull from Supabase', err);
  }
}

export async function wipeCloudData() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return;
    
    await Promise.all([
      supabase.from('products').delete().eq('user_id', userId),
      supabase.from('transactions').delete().eq('user_id', userId),
      supabase.from('customers').delete().eq('user_id', userId),
      supabase.from('deni_transactions').delete().eq('user_id', userId),
      supabase.from('settings').delete().eq('user_id', userId)
    ]);
  } catch (err) {
    console.error('Failed to wipe cloud data', err);
  }
}

// ============================================================
// OFFLINE QUEUE — Push all pending_sync records to Supabase.
// Called when device comes back online.
// ============================================================
export async function syncPushAllPending(): Promise<number> {
  const db = await initDb();
  let count = 0;

  const getAll = <T>(storeName: string): Promise<T[]> =>
    new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).getAll();
      req.onsuccess = () => resolve(req.result as T[]);
      req.onerror = () => reject(req.error);
    });

  const markSynced = (storeName: string, id: string): Promise<void> =>
    new Promise((resolve) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        if (getReq.result) {
          store.put({ ...getReq.result, syncStatus: 'synced' });
        }
        resolve();
      };
    });

  const products = await getAll<any>('products');
  for (const p of products.filter(p => p.syncStatus === 'pending_sync')) {
    await syncPushProduct(p);
    await markSynced('products', p.id);
    count++;
  }

  const transactions = await getAll<any>('transactions');
  for (const t of transactions.filter(t => t.syncStatus === 'pending_sync')) {
    await syncPushTransaction(t);
    await markSynced('transactions', t.id);
    count++;
  }

  const customers = await getAll<any>('customers');
  for (const c of customers.filter(c => c.syncStatus === 'pending_sync')) {
    await syncPushCustomer(c);
    await markSynced('customers', c.id);
    count++;
  }

  const deniTxs = await getAll<any>('deni_transactions');
  for (const d of deniTxs.filter(d => d.syncStatus === 'pending_sync')) {
    await syncPushDeniTransaction(d);
    await markSynced('deni_transactions', d.id);
    count++;
  }

  console.log(`[OfflineSync] Pushed ${count} pending record(s) to Supabase.`);
  return count;
}
