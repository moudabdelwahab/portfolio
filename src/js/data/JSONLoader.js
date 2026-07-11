/**
 * محمّل JSON عام عبر fetch — لا علاقة له ببنية بيانات البورتفوليو تحديداً،
 * فيمكن استخدامه لتحميل أي ملف JSON آخر مستقبلاً بنفس الطريقة.
 * يخزّن نتيجة كل رابط مؤقتاً (Cache) في الذاكرة لتفادي تكرار الطلب.
 */
const cache = new Map();

export const JSONLoader = {
  /**
   * @param {string|URL} url
   * @param {{ fresh?: boolean }} [options] fresh=true يتجاوز الكاش
   * @returns {Promise<any>}
   */
  async load(url, options = {}) {
    const key = String(url);
    if (!options.fresh && cache.has(key)) {
      return structuredClone(cache.get(key));
    }

    const response = await fetch(url, { cache: 'no-cache' });
    if (!response.ok) {
      throw new Error(`تعذّر تحميل ${key} — HTTP ${response.status}`);
    }

    const data = await response.json();
    cache.set(key, data);
    return structuredClone(data);
  },
};
