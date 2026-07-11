import { StorageAdapter } from './StorageAdapter.js';

/**
 * تنفيذ StorageAdapter عبر localStorage.
 * لا يرمي أي استثناء للخارج أبداً — أي خطأ (Quota، JSON تالف، خصوصية المتصفح)
 * يُسجَّل في console ويُعاد null/false بدلاً منه، حتى لا يتوقف التطبيق.
 */
export class LocalStorageAdapter extends StorageAdapter {
  async load(key) {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return null;
      return JSON.parse(raw);
    } catch (err) {
      console.warn(`[LocalStorageAdapter] تعذّرت قراءة المفتاح "${key}":`, err);
      return null;
    }
  }

  async save(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      console.warn(`[LocalStorageAdapter] تعذّر حفظ المفتاح "${key}":`, err);
      return false;
    }
  }

  async clear(key) {
    try {
      window.localStorage.removeItem(key);
      return true;
    } catch (err) {
      console.warn(`[LocalStorageAdapter] تعذّر مسح المفتاح "${key}":`, err);
      return false;
    }
  }
}
