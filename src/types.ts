/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Product {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  sellingPrice: number;
  costPrice: number;
  imageUrl: string | null;
  createdAt: string;
}

export type ReasonCategory = 'Sale_Cash' | 'Sale_Mpesa' | 'Expired' | 'Damaged' | 'Deni' | 'Other';

export interface InventoryTransaction {
  id: string;
  productId: string;
  staffPinUsed: string | null;
  quantityChanged: number; // Stored as negative for deductions, positive for stock-ins
  reasonCategory: ReasonCategory;
  customReason: string | null;
  createdAt: string;
  syncStatus: 'synced' | 'pending_sync';
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  debtBalance: number; // Current accumulated debt in KES
  createdAt: string;
}

export interface DeniTransaction {
  id: string;
  customerId: string;
  productId: string | null;
  amount: number; // Positive for debt addition, negative for payments
  type: 'credit' | 'payment';
  notes: string;
  createdAt: string;
  syncStatus: 'synced' | 'pending_sync';
}

export interface AppSettings {
  id: 'current_settings';
  adminPin: string | null;
  theme: 'light' | 'dark';
}
