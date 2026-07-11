import { icon } from './icon.js';
import { escapeHTML } from '../components/renderUtils.js';

/**
 * Modal — طبقة عامة فوق #modal-root (موجود في admin.html فقط). تُستخدم من
 * EditingController لعرض نماذج تعديل الأقسام، ولتأكيد الحذف.
 * لا تعرف شيئاً عن FormBuilder أو أي محتوى محدد — تستقبل HTML جاهزاً
 * للجسم (body) وقائمة أزرار (actions)، وتتولى فقط: العرض/الإخفاء،
 * إغلاق بالـ Escape أو النقر على الخلفية، وتركيز أول عنصر تفاعلي.
 */

let activeModal = null;

/**
 * @typedef {object} ModalAction
 * @property {string} label
 * @property {'primary'|'outline'|'danger'} [variant]
 * @property {() => void} onClick
 * @property {boolean} [closeOnClick] افتراضياً true
 */

/**
 * يفتح Modal جديد. يغلق أي Modal مفتوح حالياً أولاً (نافذة واحدة فقط في
 * كل مرة، تماماً كما يوحي وجود #modal-root واحد في admin.html).
 * @param {{ title: string, bodyHTML: string, actions?: ModalAction[] }} config
 * @returns {{ close: () => void }}
 */
export function openModal({ title, bodyHTML, actions = [] }) {
  closeModal();

  const root = document.getElementById('modal-root');
  if (!root) {
    console.warn('[Modal] لا يوجد #modal-root في الصفحة — لن يتم فتح أي نافذة.');
    return { close() {} };
  }

  const actionsHTML = actions
    .map((action, i) => {
      const variantClass = action.variant === 'danger' ? 'btn-danger'
        : action.variant === 'outline' ? 'btn-outline'
        : 'btn-primary';
      return `<button type="button" class="btn ${variantClass}" data-action-index="${i}">${escapeHTML(action.label)}</button>`;
    })
    .join('');

  root.innerHTML = `
    <div class="modal-overlay" id="active-modal-overlay">
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div class="modal-head">
          <h3 id="modal-title">${escapeHTML(title)}</h3>
          <button type="button" class="modal-close" id="modal-close-btn" aria-label="إغلاق">${icon('x', { size: 16 })}</button>
        </div>
        <div class="modal-body">${bodyHTML}</div>
        ${actionsHTML ? `<div class="modal-actions">${actionsHTML}</div>` : ''}
      </div>
    </div>
  `;

  const overlay = document.getElementById('active-modal-overlay');
  const closeBtn = document.getElementById('modal-close-btn');

  function handleKeydown(e) {
    if (e.key === 'Escape') closeModal();
  }

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });
  closeBtn.addEventListener('click', closeModal);
  document.addEventListener('keydown', handleKeydown);

  actions.forEach((action, i) => {
    const btn = root.querySelector(`[data-action-index="${i}"]`);
    btn?.addEventListener('click', () => {
      action.onClick();
      if (action.closeOnClick !== false) closeModal();
    });
  });

  // فتح الحركة في الإطار التالي حتى تعمل transition (opacity/transform) بدل القفز المباشر
  requestAnimationFrame(() => overlay.classList.add('is-open'));

  const firstFocusable = root.querySelector('input, textarea, select, button');
  firstFocusable?.focus();

  activeModal = {
    close() {
      overlay.classList.remove('is-open');
      document.removeEventListener('keydown', handleKeydown);
      setTimeout(() => { root.innerHTML = ''; }, 350); // يطابق --dur-med حتى تكتمل حركة الإغلاق قبل الحذف من الـ DOM
      activeModal = null;
    },
  };

  return activeModal;
}

/** يغلق أي Modal مفتوح حالياً، بلا تأثير إن لم يوجد شيء مفتوح. */
export function closeModal() {
  activeModal?.close();
}

/**
 * اختصار شائع: نافذة تأكيد بسيطة (حذف عنصر مثلاً) بدل بناء actions يدوياً
 * في كل مرة.
 * @param {{ title: string, message: string, confirmLabel?: string }} config
 * @returns {Promise<boolean>} true إن أكّد المستخدم، false إن ألغى أو أغلق
 */
export function confirmModal({ title, message, confirmLabel = 'تأكيد' }) {
  return new Promise((resolve) => {
    let resolved = false;
    openModal({
      title,
      bodyHTML: `<p>${escapeHTML(message)}</p>`,
      actions: [
        {
          label: 'إلغاء',
          variant: 'outline',
          onClick: () => { resolved = true; resolve(false); },
        },
        {
          label: confirmLabel,
          variant: 'danger',
          onClick: () => { resolved = true; resolve(true); },
        },
      ],
    });

    // لو أُغلقت النافذة بالـ Escape أو النقر على الخلفية بدل الأزرار، نعتبرها إلغاء.
    const root = document.getElementById('modal-root');
    const observer = new MutationObserver(() => {
      if (!resolved && root && root.innerHTML.trim() === '') {
        resolved = true;
        resolve(false);
        observer.disconnect();
      }
    });
    if (root) observer.observe(root, { childList: true });
  });
}
