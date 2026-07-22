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
      
      const { data, error } = await supabase.storage
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

    const { error } = await supabase
      .from('settings')
      .upsert({ ...settings, user_id: userId }, { onConflict: 'id' });
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

// Clear all records in a store and repopulate with fresh data from Supabase.
// This prevents stale data from lingering when doing a full pull.
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

    // Clear stores and write fresh data (prevents cross-account contamination)
    await Promise.all([
      clearAndWriteStore(db, 'products', productsRes.data ?? []),
      clearAndWriteStore(db, 'transactions', transactionsRes.data ?? []),
      clearAndWriteStore(db, 'customers', customersRes.data ?? []),
      clearAndWriteStore(db, 'deni_transactions', deniRes.data ?? []),
      clearAndWriteStore(db, 'settings', settingsRes.data ?? []),
    ]);
  } catch (err) {
    console.error('Failed to pull from Supabase', err);
  }
}
