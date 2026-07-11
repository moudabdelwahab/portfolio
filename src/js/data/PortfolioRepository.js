import { LocalStorageAdapter } from './LocalStorageAdapter.js';
import { JSONLoader } from './JSONLoader.js';

const STORAGE_KEY = 'mad3oom:portfolio:data:v1';
const DEFAULT_JSON_URL = new URL('../../../data/portfolio.default.json', import.meta.url);

// كل قسم مطلوب في البيانات، ونوع الحقل الذي يجب أن يحتوي القائمة الأساسية له (إن وجد).
// يُستخدم هذا الجدول فقط للتحقق البسيط من صحة البنية، وليس Schema كامل.
const REQUIRED_SECTIONS = {
  meta: { listField: 'navigation' },
  profile: { listField: null },
  about: { listField: 'paragraphs' },
  experience: { listField: 'items' },
  skills: { listField: 'categories' },
  projects: { listField: 'items' },
  education: { listField: 'items' },
  contact: { listField: null },
};

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * تحقق بسيط وسريع من أن البيانات القادمة (من localStorage أو ملف مستورَد)
 * لها نفس شكل portfolio.default.json قبل الوثوق بها.
 * لا يتحقق من كل حقل فرعي عمداً — فقط من الأقسام الأساسية ونوع القوائم فيها،
 * لأن هذا يكفي لمنع بيانات تالفة أو ناقصة من كسر الـ Renderer.
 * @param {any} data
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validatePortfolioData(data) {
  const errors = [];

  if (!isPlainObject(data)) {
    return { valid: false, errors: ['البيانات ليست كائن JSON صالح'] };
  }

  for (const [section, rule] of Object.entries(REQUIRED_SECTIONS)) {
    const value = data[section];
    if (!isPlainObject(value)) {
      errors.push(`القسم "${section}" مفقود أو ليس كائناً صالحاً`);
      continue;
    }
    if (rule.listField && !Array.isArray(value[rule.listField])) {
      errors.push(`القسم "${section}" يجب أن يحتوي على مصفوفة في الحقل "${rule.listField}"`);
    }
  }

  return { valid: errors.length === 0, errors };
}

export class PortfolioRepository {
  #data = null;
  #source = 'none'; // 'localStorage' | 'default' | 'none'
  #listeners = new Set();
  #adapter;

  constructor(adapter = new LocalStorageAdapter()) {
    this.#adapter = adapter;
  }

  /**
   * يحمّل البيانات مرة واحدة عند بدء التطبيق:
   * localStorage أولاً (إن كانت صالحة) وإلا portfolio.default.json.
   * لا يكتب أي شيء في localStorage أثناء التحميل — الكتابة تحدث فقط عند تعديل فعلي.
   * @returns {Promise<object>}
   */
  async load() {
    const stored = await this.#adapter.load(STORAGE_KEY);
    if (stored) {
      const { valid, errors } = validatePortfolioData(stored);
      if (valid) {
        this.#data = stored;
        this.#source = 'localStorage';
        return structuredClone(this.#data);
      }
      console.warn('[PortfolioRepository] بيانات localStorage تالفة أو غير مطابقة، سيتم تجاهلها:', errors);
    }

    this.#data = await this.#loadDefault();
    this.#source = 'default';
    return structuredClone(this.#data);
  }

  async #loadDefault() {
    try {
      const defaults = await JSONLoader.load(DEFAULT_JSON_URL);
      const { valid, errors } = validatePortfolioData(defaults);
      if (!valid) {
        throw new Error(`portfolio.default.json غير مطابق للبنية المتوقعة: ${errors.join(' / ')}`);
      }
      return defaults;
    } catch (err) {
      console.error('[PortfolioRepository] فشل تحميل البيانات الافتراضية:', err);
      // شبكة آمنة أخيرة حتى لا ينهار التطبيق بالكامل إن تعذّر جلب الملف الافتراضي أيضاً
      return { meta: { navigation: [] }, profile: {}, about: { paragraphs: [] }, experience: { items: [] }, skills: { categories: [] }, projects: { items: [] }, education: { items: [] }, contact: {} };
    }
  }

  /** مصدر آخر تحميل ناجح، مفيد لعرضه في شريط الإدارة */
  getSource() {
    return this.#source;
  }

  /** @returns {object} نسخة كاملة معزولة عن الذاكرة الداخلية */
  getAll() {
    return structuredClone(this.#data);
  }

  /** @param {string} key @returns {any} نسخة معزولة من قسم واحد */
  getSection(key) {
    return this.#data ? structuredClone(this.#data[key]) : undefined;
  }

  /**
   * يستبدل قسماً واحداً فقط ثم يحفظ ويُبلّغ المشتركين بأن هذا القسم تحديداً تغيّر،
   * ليتمكن الـ Renderer من إعادة رسمه هو فقط دون بقية الصفحة.
   * @param {string} sectionKey
   * @param {any} newValue
   */
  async update(sectionKey, newValue) {
    if (!this.#data || !(sectionKey in this.#data)) {
      throw new Error(`قسم غير معروف: "${sectionKey}"`);
    }
    const draft = { ...this.#data, [sectionKey]: newValue };
    const { valid, errors } = validatePortfolioData(draft);
    if (!valid) {
      throw new Error(`تعديل مرفوض بسبب بنية غير صالحة: ${errors.join(' / ')}`);
    }

    this.#data = draft;
    this.#source = 'localStorage';
    await this.#persist();
    this.#notify(sectionKey);
  }

  /**
   * يستبدل كل البيانات دفعة واحدة (Undo/Redo، Import، Reset) ويُبلّغ بإعادة رسم كاملة.
   * @param {object} newData
   */
  async replaceAll(newData) {
    const { valid, errors } = validatePortfolioData(newData);
    if (!valid) {
      throw new Error(`البيانات المستوردة غير صالحة: ${errors.join(' / ')}`);
    }
    this.#data = newData;
    this.#source = 'localStorage';
    await this.#persist();
    this.#notify(null); // null = أعد رسم الصفحة بالكامل
  }

  /** يمسح أي تعديل محفوظ محلياً ويعيد تحميل البيانات الافتراضية من الملف */
  async reset() {
    await this.#adapter.clear(STORAGE_KEY);
    this.#data = await this.#loadDefault();
    this.#source = 'default';
    this.#notify(null);
  }

  /** @returns {string} نص JSON منسّق جاهز للتنزيل — لا علاقة له بأي DOM */
  exportJSON() {
    return JSON.stringify(this.#data, null, 2);
  }

  /**
   * @param {string|object} input نص JSON أو كائن جاهز
   * @throws يرمي خطأ واضحاً عند فشل التحليل أو التحقق، ليعرضه المستدعي في Toast
   */
  async importJSON(input) {
    let parsed = input;
    if (typeof input === 'string') {
      try {
        parsed = JSON.parse(input);
      } catch (err) {
        throw new Error('الملف المستورَد ليس JSON صالحاً');
      }
    }
    await this.replaceAll(parsed);
  }

  async #persist() {
    await this.#adapter.save(STORAGE_KEY, this.#data);
  }

  /**
   * @param {(payload: { sectionKey: string|null, data: object }) => void} listener
   * @returns {() => void} دالة لإلغاء الاشتراك
   */
  subscribe(listener) {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  #notify(sectionKey) {
    const payload = { sectionKey, data: this.getAll() };
    for (const listener of this.#listeners) listener(payload);
  }
}
