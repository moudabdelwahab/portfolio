/**
 * يدير سجل تراجع/إعادة (Undo/Redo) لبيانات البورتفوليو الكاملة أثناء التحرير.
 * لا يتعامل مع localStorage أو الشبكة إطلاقاً — فقط يحتفظ بلقطات (Snapshots)
 * من الكائن الكامل في الذاكرة، ويترك لـ EditingController مهمة تطبيق أي
 * لقطة عبر PortfolioRepository.replaceAll().
 *
 * يُستخدم فقط في admin.html (يخدم أزرار icon-undo / icon-redo في admin.css).
 */
export class HistoryManager {
  /** @param {{ limit?: number }} [options] limit: أقصى عدد لقطات محفوظة (افتراضي 50) */
  constructor({ limit = 50 } = {}) {
    this.limit = limit;
    /** @type {any[]} */
    this.#past = [];
    /** @type {any[]} */
    this.#future = [];
    this.#current = null;
  }

  #past;
  #future;
  #current;

  /**
   * يُستدعى مرة عند بدء التحرير لتثبيت النقطة الحالية كأساس للمقارنة،
   * دون اعتبارها خطوة تراجع بحد ذاتها.
   * @param {any} data
   */
  init(data) {
    this.#current = structuredClone(data);
    this.#past = [];
    this.#future = [];
  }

  /**
   * يسجّل حالة جديدة بعد تعديل فعلي. يمسح مستقبل الـ Redo لأن أي تعديل جديد
   * يُبطل فروع "إعادة" السابقة — هذا سلوك قياسي لأي Undo Stack.
   * @param {any} data الحالة الكاملة بعد التعديل
   */
  push(data) {
    if (this.#current !== null) {
      this.#past.push(this.#current);
      if (this.#past.length > this.limit) this.#past.shift();
    }
    this.#current = structuredClone(data);
    this.#future = [];
  }

  /** @returns {boolean} */
  canUndo() {
    return this.#past.length > 0;
  }

  /** @returns {boolean} */
  canRedo() {
    return this.#future.length > 0;
  }

  /** @returns {any|null} الحالة السابقة، أو null إن لم يوجد تراجع ممكن */
  undo() {
    if (!this.canUndo()) return null;
    this.#future.unshift(this.#current);
    this.#current = this.#past.pop();
    return structuredClone(this.#current);
  }

  /** @returns {any|null} الحالة التالية، أو null إن لم توجد إعادة ممكنة */
  redo() {
    if (!this.canRedo()) return null;
    this.#past.push(this.#current);
    this.#current = this.#future.shift();
    return structuredClone(this.#current);
  }
}
