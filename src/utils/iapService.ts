/**
 * Google Play / App Store のアプリ内課金。
 * npm に @capacitor-community/in-app-purchases は無いため @capacitor-community 相当の役割は @capgo/native-purchases が担う。
 */
import { Capacitor } from '@capacitor/core';
import { NativePurchases, PURCHASE_TYPE, type Transaction } from '@capgo/native-purchases';
import { setAdsRemoved } from './adsRemoved';
import { addNameChangeTicket } from './nameChangeTicket';

/** 商品 ID（Play Console / App Store Connect と一致させる） */
export const IAP_PRODUCTS = {
  REMOVE_ADS: 'remove_ads',
  NAME_CHANGE_TICKET: 'name_change_ticket',
  SUPPORTER_PACK: 'supporter_pack',
  BUNDLE_PACK: 'bundle_pack',
} as const;

function grantsRemoveAds(productId: string): boolean {
  return productId === IAP_PRODUCTS.REMOVE_ADS || productId === IAP_PRODUCTS.BUNDLE_PACK;
}

function isCompletedTransaction(transaction: Transaction): boolean {
  if (Capacitor.getPlatform() === 'android') {
    if (transaction.purchaseState !== undefined && transaction.purchaseState !== '1') {
      return false;
    }
  }
  return true;
}

const nameChangeTicketTransactionKey = (transactionId: string): string =>
  `real-card-battle:name-change-ticket-tx:${transactionId}`;

function grantNameChangeTicketOnce(transaction: Transaction): void {
  const transactionId = transaction.transactionId;
  if (!transactionId) {
    addNameChangeTicket(1);
    return;
  }
  if (typeof localStorage !== 'undefined') {
    const key = nameChangeTicketTransactionKey(transactionId);
    if (localStorage.getItem(key) === '1') return;
    localStorage.setItem(key, '1');
  }
  addNameChangeTicket(1);
}

function applyTransactionEntitlement(transaction: Transaction, options?: { grantConsumables?: boolean }): void {
  const productId = transaction.productIdentifier;
  if (!productId || !isCompletedTransaction(transaction)) return;
  if (grantsRemoveAds(productId)) {
    setAdsRemoved(true);
  }
  if (options?.grantConsumables && productId === IAP_PRODUCTS.NAME_CHANGE_TICKET) {
    grantNameChangeTicketOnce(transaction);
  }
}

async function syncEntitlementsFromStore(): Promise<void> {
  const { purchases } = await NativePurchases.getPurchases({ productType: PURCHASE_TYPE.INAPP });
  for (const t of purchases) {
    applyTransactionEntitlement(t);
  }
}

let iosTransactionListenerRegistered = false;

/** 起動時: リスナー登録（iOS）と購入状態の同期 */
export async function initIAP(): Promise<void> {
  try {
    const { isBillingSupported } = await NativePurchases.isBillingSupported();
    if (!isBillingSupported) return;

    if (Capacitor.getPlatform() === 'ios' && !iosTransactionListenerRegistered) {
      iosTransactionListenerRegistered = true;
      await NativePurchases.addListener('transactionUpdated', (transaction) => {
        applyTransactionEntitlement(transaction, { grantConsumables: true });
      });
    }

    // restorePurchases() は Apple ID 認証を要求するため起動時には呼ばない
    // ユーザーが「購入を復元」を押したときだけ restorePurchases() を実行する
    await syncEntitlementsFromStore();
  } catch (e) {
    console.error('IAP init error:', e);
  }
}

export async function purchaseProduct(productId: string): Promise<void> {
  try {
    const tx = await NativePurchases.purchaseProduct({
      productIdentifier: productId,
      productType: PURCHASE_TYPE.INAPP,
      isConsumable: productId === IAP_PRODUCTS.NAME_CHANGE_TICKET,
    });
    applyTransactionEntitlement(tx, { grantConsumables: true });
  } catch (e) {
    console.error('Purchase error:', e);
    throw e;
  }
}

export async function restorePurchases(): Promise<void> {
  try {
    await NativePurchases.restorePurchases();
    await syncEntitlementsFromStore();
  } catch (e) {
    console.error('Restore error:', e);
    throw e;
  }
}
