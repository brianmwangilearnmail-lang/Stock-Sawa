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

export async function syncPushProduct(product: Product) {
  try {
    let finalImageUrl = product.imageUrl;

    // If the image is a base64 string, upload it to Supabase Storage in the background
    if (finalImageUrl && finalImageUrl.startsWith('data:image')) {
      const fileName = `product-${product.id}-${Date.now()}.jpg`;
      const file = await dataUrlToFile(finalImageUrl, fileName);
      
      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(fileName, file, { upsert: true });

      if (error) {
        console.error('Failed to upload image to Supabase Storage:', error);
      } else {
        // Get public URL
        const { data: publicUrlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(fileName);
          
        finalImageUrl = publicUrlData.publicUrl;
        
        // Update local IndexedDB with the real URL so we don't upload it again
        const updatedProduct = { ...product, imageUrl: finalImageUrl };
        const db = await initDb();
        const tx = db.transaction('products', 'readwrite');
        tx.objectStore('products').put(updatedProduct);
        
        // Also upload the updated product row to Supabase
        await supabase.from('products').upsert(updatedProduct);
        return; // Exit early
      }
    }

    const { error } = await supabase.from('products').upsert({ ...product, imageUrl: finalImageUrl });
    if (error) throw error;
  } catch (err) {
    console.error('Failed to sync product to Supabase', err);
  }
}

export async function syncPushTransaction(transaction: InventoryTransaction) {
  try {
    await supabase.from('transactions').upsert(transaction);
  } catch (err) {
    console.error('Failed to sync transaction to Supabase', err);
  }
}

export async function syncPushCustomer(customer: Customer) {
  try {
    await supabase.from('customers').upsert(customer);
  } catch (err) {
    console.error('Failed to sync customer to Supabase', err);
  }
}

export async function syncPushDeniTransaction(transaction: DeniTransaction) {
  try {
    const { syncStatus, ...rest } = transaction as any;
    await supabase.from('deni_transactions').upsert({ ...rest, syncStatus: 'synced' });
  } catch (err) {
    console.error('Failed to sync deni transaction to Supabase', err);
  }
}

export async function syncPushSettings(settings: AppSettings) {
  try {
    await supabase.from('settings').upsert(settings);
  } catch (err) {
    console.error('Failed to sync settings to Supabase', err);
  }
}

export async function syncDeleteProduct(id: string) {
  try {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;
  } catch (err) {
    console.error('Failed to delete product from Supabase', err);
  }
}

export async function syncPullAll(db: IDBDatabase) {
  try {
    const [productsRes, transactionsRes, customersRes, deniRes, settingsRes] = await Promise.all([
      supabase.from('products').select('*'),
      supabase.from('transactions').select('*'),
      supabase.from('customers').select('*'),
      supabase.from('deni_transactions').select('*'),
      supabase.from('settings').select('*')
    ]);

    if (productsRes.data) {
      const tx = db.transaction('products', 'readwrite');
      productsRes.data.forEach(p => tx.objectStore('products').put(p));
    }
    if (transactionsRes.data) {
      const tx = db.transaction('transactions', 'readwrite');
      transactionsRes.data.forEach(t => tx.objectStore('transactions').put(t));
    }
    if (customersRes.data) {
      const tx = db.transaction('customers', 'readwrite');
      customersRes.data.forEach(c => tx.objectStore('customers').put(c));
    }
    if (deniRes.data) {
      const tx = db.transaction('deni_transactions', 'readwrite');
      deniRes.data.forEach(d => tx.objectStore('deni_transactions').put(d));
    }
    if (settingsRes.data) {
      const tx = db.transaction('settings', 'readwrite');
      settingsRes.data.forEach(s => tx.objectStore('settings').put(s));
    }
  } catch (err) {
    console.error('Failed to pull from Supabase', err);
  }
}
