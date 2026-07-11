/**
 * ناقل أحداث عام (Pub/Sub) للتواصل بين أجزاء التطبيق التي لا يجب أن تعرف
 * بعضها مباشرة (مثال: EditingController يطلق 'admin:edit-request'،
 * و AdminToolbar يستمع له دون أن يعرف أي مكوّن أطلقه).
 *
 * هذا منفصل تماماً عن PortfolioRepository.subscribe(): الأخير خاص فقط
 * بتغيّرات بيانات البورتفوليو، بينما EventBus عام لأي حدث في التطبيق
 * (فتح Modal، عرض Toast، تبديل الثيم، إلخ).
 */
export class EventBus {
  #listeners = new Map(); // eventName -> Set<handler>

  /**
   * @param {string} eventName
   * @param {(payload?: any) => void} handler
   * @returns {() => void} دالة لإلغاء الاشتراك
   */
  on(eventName, handler) {
    if (!this.#listeners.has(eventName)) {
      this.#listeners.set(eventName, new Set());
    }
    this.#listeners.get(eventName).add(handler);
    return () => this.off(eventName, handler);
  }

  /**
   * @param {string} eventName
   * @param {(payload?: any) => void} handler
   */
  off(eventName, handler) {
    this.#listeners.get(eventName)?.delete(handler);
  }

  /**
   * @param {string} eventName
   * @param {any} [payload]
   */
  emit(eventName, payload) {
    const handlers = this.#listeners.get(eventName);
    if (!handlers) return;
    // ننسخ المجموعة قبل التكرار حتى لا ينكسر التكرار لو ألغى أحد الـ handlers
    // اشتراكه (أو اشترك آخر جديد) أثناء التنفيذ.
    for (const handler of [...handlers]) handler(payload);
  }

  /**
   * @param {string} eventName
   * @param {(payload?: any) => void} handler
   * @returns {() => void}
   */
  once(eventName, handler) {
    const unsubscribe = this.on(eventName, (payload) => {
      unsubscribe();
      handler(payload);
    });
    return unsubscribe;
  }
}

/** نسخة واحدة مشتركة عبر التطبيق بالكامل — يكفي استيرادها في أي مكان. */
export const eventBus = new EventBus();
