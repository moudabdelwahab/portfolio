/**
 * العقد المجرّد لأي وسيلة تخزين.
 * أي Adapter جديد (API، Supabase...) يجب أن يطبّق نفس الدوال الثلاث
 * بنفس التوقيع حتى يعمل مع PortfolioRepository دون أي تعديل إضافي.
 */
export class StorageAdapter {
  /** @param {string} key @returns {Promise<any|null>} */
  async load(key) {
    throw new Error('StorageAdapter.load() لم يتم تنفيذها');
  }

  /** @param {string} key @param {any} value @returns {Promise<boolean>} */
  async save(key, value) {
    throw new Error('StorageAdapter.save() لم يتم تنفيذها');
  }

  /** @param {string} key @returns {Promise<boolean>} */
  async clear(key) {
    throw new Error('StorageAdapter.clear() لم يتم تنفيذها');
  }
}
