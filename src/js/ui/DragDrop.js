/**
 * DragDrop — إعادة ترتيب عناصر قائمة (مهارات/خبرات/مشاريع/مراحل Timeline)
 * بالسحب والإفلات، باستخدام HTML5 Drag & Drop الأصلي (بدون مكتبة خارجية،
 * التزاماً بقاعدة "لا Frameworks").
 *
 * يعتمد على:
 * - .drag-handle كمقبض السحب الوحيد (draggable على العنصر الأب، لكن نفعّله
 *   فقط عند بدء السحب من داخل .drag-handle حتى لا يتعارض مع تحديد النص
 *   أو أزرار .item-toolbar الأخرى داخل نفس العنصر).
 * - [draggable="true"].is-dragging لتظليل العنصر أثناء سحبه (components.css).
 * - .drop-indicator كخط إدراج بين العناصر (components.css).
 *
 * لا يلمس أي بيانات مباشرة — فقط يستدعي onReorder(fromIndex, toIndex) ليقرر
 * المستدعي (عادة EditingController) كيف يحدّث القسم عبر
 * PortfolioRepository.update().
 */

/**
 * @param {HTMLElement} listEl الحاوية المباشرة للعناصر القابلة لإعادة الترتيب
 * @param {{ itemSelector: string, handleSelector?: string, onReorder: (fromIndex: number, toIndex: number) => void }} config
 * @returns {() => void} دالة لإلغاء تفعيل السحب والإفلات على هذه القائمة
 */
export function makeSortable(listEl, { itemSelector, handleSelector = '.drag-handle', onReorder }) {
  let draggedEl = null;
  let indicator = null;

  function getItems() {
    return Array.from(listEl.querySelectorAll(itemSelector));
  }

  function ensureIndicator() {
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.className = 'drop-indicator';
    }
    return indicator;
  }

  function onDragStart(e) {
    const item = e.target.closest(itemSelector);
    if (!item) return;
    draggedEl = item;
    item.classList.add('is-dragging');
    e.dataTransfer.effectAllowed = 'move';
    // بعض المتصفحات تحتاج setData لتفعيل السحب حتى لو لم نستخدم البيانات فعلياً
    e.dataTransfer.setData('text/plain', '');
  }

  function onDragEnd() {
    draggedEl?.classList.remove('is-dragging');
    draggedEl = null;
    indicator?.remove();
  }

  function onDragOver(e) {
    if (!draggedEl) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const target = e.target.closest(itemSelector);
    if (!target || target === draggedEl) return;

    const rect = target.getBoundingClientRect();
    const isAfter = e.clientY > rect.top + rect.height / 2;
    const marker = ensureIndicator();

    if (isAfter) {
      target.after(marker);
    } else {
      target.before(marker);
    }
  }

  function onDrop(e) {
    if (!draggedEl) return;
    e.preventDefault();

    const itemsBefore = getItems();
    const fromIndex = itemsBefore.indexOf(draggedEl);

    if (indicator && indicator.parentElement === listEl) {
      listEl.insertBefore(draggedEl, indicator);
    }
    indicator?.remove();

    const itemsAfter = getItems();
    const toIndex = itemsAfter.indexOf(draggedEl);

    if (fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex) {
      onReorder(fromIndex, toIndex);
    }
  }

  // نفعّل draggable فقط عند الضغط على المقبض، حتى لا يتعارض السحب مع
  // إمكانية تحديد النص أو الضغط على أزرار أخرى داخل نفس العنصر.
  function onHandleMouseDown(e) {
    const handle = e.target.closest(handleSelector);
    if (!handle) return;
    const item = handle.closest(itemSelector);
    if (item) item.setAttribute('draggable', 'true');
  }

  function onHandleMouseUp() {
    getItems().forEach((item) => item.removeAttribute('draggable'));
  }

  listEl.addEventListener('mousedown', onHandleMouseDown);
  listEl.addEventListener('mouseup', onHandleMouseUp);
  listEl.addEventListener('dragstart', onDragStart);
  listEl.addEventListener('dragend', onDragEnd);
  listEl.addEventListener('dragover', onDragOver);
  listEl.addEventListener('drop', onDrop);

  return function destroy() {
    listEl.removeEventListener('mousedown', onHandleMouseDown);
    listEl.removeEventListener('mouseup', onHandleMouseUp);
    listEl.removeEventListener('dragstart', onDragStart);
    listEl.removeEventListener('dragend', onDragEnd);
    listEl.removeEventListener('dragover', onDragOver);
    listEl.removeEventListener('drop', onDrop);
    indicator?.remove();
  };
}
