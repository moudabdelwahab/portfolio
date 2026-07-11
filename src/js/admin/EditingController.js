import { icon } from '../ui/icon.js';
import { openModal, closeModal, confirmModal } from '../ui/Modal.js';
import { buildForm, readFormValues } from '../ui/FormBuilder.js';
import { makeSortable } from '../ui/DragDrop.js';
import { toast } from '../ui/Toast.js';
import { sectionSchemas, itemSchemas } from './fieldSchemas.js';

/**
 * EditingController — الطبقة الوحيدة التي تعرف أن التطبيق في وضع إدارة.
 * كل الأقسام والمكوّنات (Navbar, Hero, About...) تبقى بلا أي علم بالتحرير —
 * هذا الملف يضيف الأزرار/الأغلفة فوق DOM بعد رسمه، ويترجم تفاعل المستخدم
 * إلى استدعاءات PortfolioRepository.update() / reset() / إلخ.
 *
 * استراتيجية العرض: بعد كل رسم (كامل أو موجّه) من Renderer، نستدعي
 * enhance(sectionKey) لإضافة .editable / .edit-btn حول عناصر القسم الجذرية،
 * و.editable-item / .item-toolbar حول كل عنصر قائمة، ونربط أحداثها.
 */
export class EditingController {
  /**
   * @param {import('../data/PortfolioRepository.js').PortfolioRepository} repository
   * @param {import('../core/HistoryManager.js').HistoryManager} history
   * @param {() => void} [onHistoryChange] يُستدعى فور تسجيل خطوة جديدة في
   *   history — منفصل عمداً عن PortfolioRepository.subscribe لأن الأخير لا
   *   يعرف شيئاً عن HistoryManager، وتحديث أزرار التراجع/الإعادة في الشريط
   *   يحتاج توقيتاً مضموناً بعد push() تحديداً، لا بعد أي إشعار بيانات عام.
   */
  constructor(repository, history, onHistoryChange) {
    this.repository = repository;
    this.history = history;
    this.onHistoryChange = onHistoryChange;
  }

  /**
   * يُستدعى مرة بعد كل رسم كامل لتفعيل التحرير على كل الأقسام دفعة واحدة.
   */
  enhanceAll() {
    this.enhanceSection('meta');
    this.enhanceSection('profile');
    this.enhanceSection('about');
    this.enhanceListSection('experience', 'items', 'experience.items');
    this.enhanceSkills();
    this.enhanceListSection('projects', 'items', 'projects.items');
    this.enhanceListSection('education', 'items', 'education.items');
    this.enhanceSection('contact');
  }

  /**
   * يضيف زر تحرير واحد لحقول القسم "المفردة" (عنوان، bio، إلخ) —
   * يُستخدم للأقسام التي مخططها في sectionSchemas بلا قائمة عناصر مصاحبة
   * تحتاج توليداً منفصلاً (meta/profile/about/contact، وأيضاً عناوين
   * experience/skills/projects/education قبل قوائمها).
   * @param {string} sectionKey
   */
  enhanceSection(sectionKey) {
    if (sectionKey === 'meta') {
      // #site-navbar نفسه position:fixed — لا نضع .editable عليه مباشرة
      // (position:relative من .editable قد يتعارض مع position:fixed بحسب
      // ترتيب تحميل CSS). النقطة الآمنة هي .brand الداخلي غير المثبَّت.
      const brand = document.getElementById('navbar-brand');
      if (brand) this.#wrapEditable(brand, () => this.#openSectionForm('meta'));
      return;
    }

    const mount = document.getElementById(`${sectionKey}-mount`);
    if (!mount) return;

    const headEl = mount.querySelector('.section-head') || mount.firstElementChild;
    if (!headEl) return;

    this.#wrapEditable(headEl, () => this.#openSectionForm(sectionKey));
  }

  /**
   * لأقسام تحتوي section-head + قائمة عناصر (experience/projects/education):
   * يفعّل التحرير على section-head (عبر enhanceSection)، ثم يفعّل السحب/
   * الإضافة/الحذف على قائمة العناصر.
   * @param {string} sectionKey
   * @param {string} listField اسم الحقل الذي يحمل المصفوفة (عادة 'items')
   * @param {string} schemaKey مفتاح itemSchemas المطابق (مثال 'experience.items')
   */
  enhanceListSection(sectionKey, listField, schemaKey) {
    this.enhanceSection(sectionKey);

    const mount = document.getElementById(`${sectionKey}-mount`);
    if (!mount) return;

    // كل مكوّنات الأقسام (Experience/Projects/Education) تضع عناصر القائمة
    // كأبناء مباشرين لحاوية واحدة (timeline / projects-list / education-list) —
    // نلتقطها كأول عنصر تالٍ لـ .section-head داخل .container.
    const container = mount.querySelector('.container');
    const listEl = container?.querySelector(
      '.experience-timeline, .projects-list, .education-list'
    );
    if (!listEl) return;

    const itemSelector = ':scope > .timeline-item, :scope > .project-card, :scope > .education-item';
    const items = Array.from(listEl.querySelectorAll(itemSelector));

    items.forEach((itemEl, index) => {
      this.#wrapListItem(itemEl, {
        onEdit: () => this.#openItemForm(sectionKey, listField, schemaKey, index),
        onDelete: () => this.#deleteItem(sectionKey, listField, index),
        onDuplicate: () => this.#duplicateItem(sectionKey, listField, index),
      });
    });

    this.#addAddItemButton(listEl, sectionKey, listField, schemaKey);

    makeSortable(listEl, {
      itemSelector: '.editable-item',
      onReorder: (fromIndex, toIndex) => this.#reorderItems(sectionKey, listField, fromIndex, toIndex),
    });
  }

  /**
   * skills لها هيكل مختلف (فئات، وكل فئة لها قائمة items داخلية)، فتُعامَل
   * بمنطق منفصل بدل إعادة استخدام enhanceListSection القياسي.
   */
  enhanceSkills() {
    this.enhanceSection('skills');

    const mount = document.getElementById('skills-mount');
    if (!mount) return;
    const grid = mount.querySelector('.skills-grid');
    if (!grid) return;

    const categories = Array.from(grid.querySelectorAll(':scope > .skill-category'));
    categories.forEach((catEl, catIndex) => {
      const h3 = catEl.querySelector('h3');
      if (h3) {
        this.#wrapEditable(h3, () => this.#openItemForm('skills', 'categories', 'skills.categories', catIndex));
      }

      const chipList = catEl.querySelector('.chip-list');
      if (!chipList) return;

      const chips = Array.from(chipList.querySelectorAll(':scope > .chip'));
      chips.forEach((chipEl, itemIndex) => {
        this.#wrapListItem(chipEl, {
          compact: true,
          onEdit: () => this.#openSkillItemForm(catIndex, itemIndex),
          onDelete: () => this.#deleteSkillItem(catIndex, itemIndex),
        });
      });

      this.#addAddItemButton(chipList, 'skills', null, 'skills.categories.items', {
        onAdd: () => this.#addSkillItem(catIndex),
        compact: true,
      });
    });

    makeSortable(grid, {
      itemSelector: '.editable-item',
      onReorder: (fromIndex, toIndex) => this.#reorderItems('skills', 'categories', fromIndex, toIndex),
    });
  }

  // ---------------------------------------------------------------------
  // DOM enhancement helpers
  // ---------------------------------------------------------------------

  /**
   * @param {HTMLElement} el
   * @param {() => void} onEdit
   */
  #wrapEditable(el, onEdit) {
    el.classList.add('editable');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'edit-btn';
    btn.setAttribute('aria-label', 'تحرير');
    btn.innerHTML = icon('edit', { size: 14 });
    btn.addEventListener('click', onEdit);
    el.appendChild(btn);
  }

  /**
   * @param {HTMLElement} el
   * @param {{ onEdit: () => void, onDelete: () => void, onDuplicate?: () => void, compact?: boolean }} handlers
   */
  #wrapListItem(el, { onEdit, onDelete, onDuplicate, compact = false }) {
    el.classList.add('editable-item');

    const toolbar = document.createElement('div');
    toolbar.className = 'item-toolbar';

    const dragBtn = document.createElement('button');
    dragBtn.type = 'button';
    dragBtn.className = 'drag-handle';
    dragBtn.setAttribute('aria-label', 'إعادة الترتيب بالسحب');
    dragBtn.innerHTML = icon('grip', { size: compact ? 12 : 13 });
    toolbar.appendChild(dragBtn);

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.setAttribute('aria-label', 'تحرير');
    editBtn.innerHTML = icon('edit', { size: compact ? 12 : 13 });
    editBtn.addEventListener('click', onEdit);
    toolbar.appendChild(editBtn);

    if (onDuplicate) {
      const dupBtn = document.createElement('button');
      dupBtn.type = 'button';
      dupBtn.setAttribute('aria-label', 'تكرار');
      dupBtn.innerHTML = icon('duplicate', { size: 13 });
      dupBtn.addEventListener('click', onDuplicate);
      toolbar.appendChild(dupBtn);
    }

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'action-delete';
    deleteBtn.setAttribute('aria-label', 'حذف');
    deleteBtn.innerHTML = icon('trash', { size: compact ? 12 : 13 });
    deleteBtn.addEventListener('click', onDelete);
    toolbar.appendChild(deleteBtn);

    el.appendChild(toolbar);
  }

  /**
   * @param {HTMLElement} containerEl
   * @param {string} sectionKey
   * @param {string|null} listField
   * @param {string} schemaKey
   * @param {{ onAdd?: () => void, compact?: boolean }} [override]
   */
  #addAddItemButton(containerEl, sectionKey, listField, schemaKey, override = {}) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'add-item-btn';
    btn.innerHTML = `${icon('plus', { size: override.compact ? 13 : 15 })}<span>إضافة عنصر</span>`;
    btn.addEventListener('click', override.onAdd || (() => this.#addItem(sectionKey, listField, schemaKey)));
    containerEl.appendChild(btn);
  }

  // ---------------------------------------------------------------------
  // Data operations — كل واحدة تقرأ القسم الحالي، تعدّله، وتمرره لـ
  // PortfolioRepository.update() الذي يتولى التحقق والحفظ والإشعار.
  // Renderer معاد رسمه تلقائياً عبر subscribe في admin-app.js، وبعده
  // enhanceAll() يُعاد استدعاؤه لإعادة تفعيل التحرير على DOM الجديد.
  // ---------------------------------------------------------------------

  /** @param {string} sectionKey */
  async #openSectionForm(sectionKey) {
    const schema = sectionSchemas[sectionKey];
    if (!schema) return;
    const current = this.repository.getSection(sectionKey);

    openModal({
      title: 'تحرير القسم',
      bodyHTML: `<form id="section-edit-form">${buildForm(schema, current)}</form>`,
      actions: [
        { label: 'إلغاء', variant: 'outline', onClick: () => {} },
        {
          label: 'حفظ',
          variant: 'primary',
          closeOnClick: false,
          onClick: async () => {
            const form = document.getElementById('section-edit-form');
            const values = await readFormValues(form, schema);
            await this.#commitSectionUpdate(sectionKey, { ...current, ...values });
            closeModal();
          },
        },
      ],
    });
  }

  /**
   * @param {string} sectionKey
   * @param {string} listField
   * @param {string} schemaKey
   * @param {number} index
   */
  async #openItemForm(sectionKey, listField, schemaKey, index) {
    const schema = itemSchemas[schemaKey];
    if (!schema) return;
    const section = this.repository.getSection(sectionKey);
    const list = section[listField];
    const currentItem = list[index];

    openModal({
      title: 'تحرير العنصر',
      bodyHTML: `<form id="item-edit-form">${buildForm(schema, currentItem)}</form>`,
      actions: [
        { label: 'إلغاء', variant: 'outline', onClick: () => {} },
        {
          label: 'حفظ',
          variant: 'primary',
          closeOnClick: false,
          onClick: async () => {
            const form = document.getElementById('item-edit-form');
            const values = await readFormValues(form, schema);
            const newList = [...list];
            newList[index] = { ...currentItem, ...values };
            await this.#commitSectionUpdate(sectionKey, { ...section, [listField]: newList });
            closeModal();
          },
        },
      ],
    });
  }

  /**
   * @param {string} sectionKey
   * @param {string|null} listField
   * @param {string} schemaKey
   */
  async #addItem(sectionKey, listField, schemaKey) {
    const schema = itemSchemas[schemaKey];
    if (!schema) return;
    const section = this.repository.getSection(sectionKey);
    const list = section[listField] || [];

    const blank = Object.fromEntries(schema.map((f) => [f.name, '']));

    openModal({
      title: 'إضافة عنصر جديد',
      bodyHTML: `<form id="add-item-form">${buildForm(schema, blank)}</form>`,
      actions: [
        { label: 'إلغاء', variant: 'outline', onClick: () => {} },
        {
          label: 'إضافة',
          variant: 'primary',
          closeOnClick: false,
          onClick: async () => {
            const form = document.getElementById('add-item-form');
            const values = await readFormValues(form, schema);
            const newItem = { id: `${listField}-${Date.now()}`, ...values };
            await this.#commitSectionUpdate(sectionKey, { ...section, [listField]: [...list, newItem] });
            closeModal();
          },
        },
      ],
    });
  }

  /**
   * @param {string} sectionKey
   * @param {string} listField
   * @param {number} index
   */
  async #deleteItem(sectionKey, listField, index) {
    const confirmed = await confirmModal({
      title: 'حذف العنصر',
      message: 'هل أنت متأكد من حذف هذا العنصر؟ لا يمكن التراجع عن هذا الإجراء من هنا مباشرة (لكن يمكن استخدام تراجع من الشريط العلوي).',
      confirmLabel: 'حذف',
    });
    if (!confirmed) return;

    const section = this.repository.getSection(sectionKey);
    const list = section[listField];
    const newList = list.filter((_, i) => i !== index);
    await this.#commitSectionUpdate(sectionKey, { ...section, [listField]: newList });
  }

  /**
   * @param {string} sectionKey
   * @param {string} listField
   * @param {number} index
   */
  async #duplicateItem(sectionKey, listField, index) {
    const section = this.repository.getSection(sectionKey);
    const list = section[listField];
    const original = list[index];
    const copy = { ...original, id: `${listField}-${Date.now()}` };
    const newList = [...list.slice(0, index + 1), copy, ...list.slice(index + 1)];
    await this.#commitSectionUpdate(sectionKey, { ...section, [listField]: newList });
  }

  /**
   * @param {string} sectionKey
   * @param {string} listField
   * @param {number} fromIndex
   * @param {number} toIndex
   */
  async #reorderItems(sectionKey, listField, fromIndex, toIndex) {
    const section = this.repository.getSection(sectionKey);
    const list = [...section[listField]];
    const [moved] = list.splice(fromIndex, 1);
    list.splice(toIndex, 0, moved);
    await this.#commitSectionUpdate(sectionKey, { ...section, [listField]: list });
  }

  // --- skills-specific (فئة تحتوي عناصر فرعية، بنية مختلفة عن باقي الأقسام) ---

  /**
   * @param {number} catIndex
   * @param {number} itemIndex
   */
  async #openSkillItemForm(catIndex, itemIndex) {
    const schema = itemSchemas['skills.categories.items'];
    const section = this.repository.getSection('skills');
    const categories = section.categories;
    const currentItem = categories[catIndex].items[itemIndex];

    openModal({
      title: 'تحرير المهارة',
      bodyHTML: `<form id="skill-item-form">${buildForm(schema, currentItem)}</form>`,
      actions: [
        { label: 'إلغاء', variant: 'outline', onClick: () => {} },
        {
          label: 'حفظ',
          variant: 'primary',
          closeOnClick: false,
          onClick: async () => {
            const form = document.getElementById('skill-item-form');
            const values = await readFormValues(form, schema);
            const newCategories = categories.map((cat, i) => {
              if (i !== catIndex) return cat;
              const newItems = cat.items.map((it, j) => (j === itemIndex ? { ...it, ...values } : it));
              return { ...cat, items: newItems };
            });
            await this.#commitSectionUpdate('skills', { ...section, categories: newCategories });
            closeModal();
          },
        },
      ],
    });
  }

  /** @param {number} catIndex */
  async #addSkillItem(catIndex) {
    const schema = itemSchemas['skills.categories.items'];
    const section = this.repository.getSection('skills');
    const categories = section.categories;
    const blank = Object.fromEntries(schema.map((f) => [f.name, '']));

    openModal({
      title: 'إضافة مهارة',
      bodyHTML: `<form id="add-skill-item-form">${buildForm(schema, blank)}</form>`,
      actions: [
        { label: 'إلغاء', variant: 'outline', onClick: () => {} },
        {
          label: 'إضافة',
          variant: 'primary',
          closeOnClick: false,
          onClick: async () => {
            const form = document.getElementById('add-skill-item-form');
            const values = await readFormValues(form, schema);
            const newItem = { id: `skill-${Date.now()}`, ...values };
            const newCategories = categories.map((cat, i) =>
              i === catIndex ? { ...cat, items: [...cat.items, newItem] } : cat
            );
            await this.#commitSectionUpdate('skills', { ...section, categories: newCategories });
            closeModal();
          },
        },
      ],
    });
  }

  /**
   * @param {number} catIndex
   * @param {number} itemIndex
   */
  async #deleteSkillItem(catIndex, itemIndex) {
    const confirmed = await confirmModal({
      title: 'حذف المهارة',
      message: 'هل تريد حذف هذه المهارة؟',
      confirmLabel: 'حذف',
    });
    if (!confirmed) return;

    const section = this.repository.getSection('skills');
    const categories = section.categories;
    const newCategories = categories.map((cat, i) =>
      i === catIndex ? { ...cat, items: cat.items.filter((_, j) => j !== itemIndex) } : cat
    );
    await this.#commitSectionUpdate('skills', { ...section, categories: newCategories });
  }

  // ---------------------------------------------------------------------

  /**
   * نقطة واحدة يمر منها كل تعديل: تحدّث المستودع (الذي يتحقق من الصحة
   * ويحفظ ويُشعر Renderer)، وتسجّل لقطة في HistoryManager، وتعرض Toast.
   * أي خطأ تحقق من PortfolioRepository يُعرض كـ toast.error بدل كسر الواجهة.
   *
   * ملاحظة توقيت: history.push() يحدث بعد نجاح update() (حتى لا تُسجَّل
   * حالة فشل التحقق كخطوة تراجع صالحة). onHistoryChange (إن مُرِّرت) تُستدعى
   * بعده مباشرة لتحديث أزرار التراجع/الإعادة في الشريط — منفصلة تماماً عن
   * إشعار PortfolioRepository.subscribe الذي يُحدِّث فقط badge المصدر
   * والعرض، وليس حالة history (انظر admin-app.js للتوصيل الكامل).
   * @param {string} sectionKey
   * @param {any} newValue
   */
  async #commitSectionUpdate(sectionKey, newValue) {
    try {
      await this.repository.update(sectionKey, newValue);
      this.history.push(this.repository.getAll());
      this.onHistoryChange?.();
      toast.success('تم الحفظ');
    } catch (err) {
      toast.error(err.message || 'تعذّر حفظ التعديل');
    }
  }
}
