import { icon } from '../ui/icon.js';
import { confirmModal } from '../ui/Modal.js';
import { toast } from '../ui/Toast.js';

/**
 * AdminToolbar — الشريط الثابت أعلى admin.html (#admin-toolbar-root).
 * لا يحمل أي منطق تحرير للمحتوى نفسه (ذلك في EditingController) — فقط:
 * تراجع/إعادة (عبر HistoryManager)، إعادة تعيين للافتراضي، تصدير/استيراد
 * JSON كامل، ومؤشر آخر حفظ + مصدر البيانات الحالي (localStorage/default).
 */
export class AdminToolbar {
  /**
   * @param {import('../data/PortfolioRepository.js').PortfolioRepository} repository
   * @param {import('../core/HistoryManager.js').HistoryManager} history
   * @param {() => void} onDataReplaced يُستدعى بعد أي عملية تستبدل البيانات
   *   كاملة (undo/redo/reset/import) حتى يعيد المستدعي تفعيل EditingController
   *   على DOM المُعاد رسمه (Renderer نفسه يُشعَر عبر repository.subscribe).
   */
  constructor(repository, history, onDataReplaced) {
    this.repository = repository;
    this.history = history;
    this.onDataReplaced = onDataReplaced;
  }

  mount() {
    const root = document.getElementById('admin-toolbar-root');
    if (!root) return;

    root.innerHTML = `
      <div class="admin-toolbar">
        <div class="toolbar-group">
          <button type="button" class="toolbar-btn" id="btn-undo" aria-label="تراجع" title="تراجع">${icon('undo')}</button>
          <button type="button" class="toolbar-btn" id="btn-redo" aria-label="إعادة" title="إعادة">${icon('redo')}</button>
        </div>
        <div class="toolbar-group">
          <span class="autosave-indicator" id="autosave-indicator">
            <span class="dot"></span><span>محفوظ تلقائياً</span>
          </span>
          <span class="source-badge" id="source-badge"></span>
        </div>
        <div class="toolbar-group">
          <button type="button" class="toolbar-btn" id="btn-export" aria-label="تصدير JSON" title="تصدير JSON">${icon('export')}</button>
          <label class="toolbar-btn" id="btn-import" aria-label="استيراد JSON" title="استيراد JSON" style="cursor:pointer;">
            ${icon('import')}
            <input type="file" accept="application/json" id="import-input" />
          </label>
          <button type="button" class="toolbar-btn" id="btn-reset" aria-label="إعادة تعيين للافتراضي" title="إعادة تعيين للافتراضي">${icon('reset')}</button>
        </div>
      </div>
    `;

    this.#bind();
    this.refresh();
  }

  /** يُحدّث حالة تفعيل/تعطيل أزرار التراجع/الإعادة وشارة المصدر — يُستدعى بعد أي تعديل. */
  refresh() {
    const undoBtn = document.getElementById('btn-undo');
    const redoBtn = document.getElementById('btn-redo');
    const badge = document.getElementById('source-badge');

    if (undoBtn) undoBtn.disabled = !this.history.canUndo();
    if (redoBtn) redoBtn.disabled = !this.history.canRedo();
    if (badge) {
      const source = this.repository.getSource();
      badge.textContent = source === 'localStorage' ? 'محرَّر محلياً' : 'افتراضي';
    }
  }

  /** يعرض مؤشر "جارٍ الحفظ" لحظياً ثم يعيده لحالة "محفوظ" — تحسين بصري بسيط عند كل تعديل. */
  flashSaving() {
    const indicator = document.getElementById('autosave-indicator');
    if (!indicator) return;
    const label = indicator.querySelector('span:not(.dot)');
    if (!label) return;
    const original = label.textContent;
    label.textContent = 'جارٍ الحفظ...';
    setTimeout(() => { label.textContent = original; }, 600);
  }

  #bind() {
    document.getElementById('btn-undo')?.addEventListener('click', () => this.#undo());
    document.getElementById('btn-redo')?.addEventListener('click', () => this.#redo());
    document.getElementById('btn-export')?.addEventListener('click', () => this.#exportData());
    document.getElementById('btn-reset')?.addEventListener('click', () => this.#resetData());
    document.getElementById('import-input')?.addEventListener('change', (e) => this.#importData(e));
  }

  async #undo() {
    const previous = this.history.undo();
    if (!previous) return;
    await this.repository.replaceAll(previous);
    this.onDataReplaced?.();
    this.refresh();
    toast.info('تم التراجع');
  }

  async #redo() {
    const next = this.history.redo();
    if (!next) return;
    await this.repository.replaceAll(next);
    this.onDataReplaced?.();
    this.refresh();
    toast.info('تمت الإعادة');
  }

  #exportData() {
    const json = this.repository.exportJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'portfolio-data.json';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('تم تصدير البيانات');
  }

  async #resetData() {
    const confirmed = await confirmModal({
      title: 'إعادة التعيين للافتراضي',
      message: 'سيتم حذف كل التعديلات المحفوظة محلياً والعودة إلى البيانات الافتراضية. هل أنت متأكد؟',
      confirmLabel: 'إعادة التعيين',
    });
    if (!confirmed) return;

    try {
      await this.repository.reset();
      this.history.init(this.repository.getAll());
      this.onDataReplaced?.();
      this.refresh();
      toast.success('تمت إعادة التعيين للبيانات الافتراضية');
    } catch (err) {
      toast.error(err.message || 'تعذّرت إعادة التعيين');
    }
  }

  /** @param {Event} e */
  async #importData(e) {
    const input = /** @type {HTMLInputElement} */ (e.target);
    const file = input.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      await this.repository.importJSON(text);
      this.history.push(this.repository.getAll());
      this.onDataReplaced?.();
      this.refresh();
      toast.success('تم استيراد البيانات بنجاح');
    } catch (err) {
      toast.error(err.message || 'ملف JSON غير صالح');
    } finally {
      input.value = '';
    }
  }
}
