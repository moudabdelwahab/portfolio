/**
 * يحمّل assets/sprite.svg مرة واحدة فقط، ويحقنه Inline داخل #sprite-mount
 * (موجود في index.html و admin.html). هذا ضروري لأن <use href="sprite.svg#id">
 * من ملف خارجي غير موثوق في كل المتصفحات (تحديداً Safari) — لكن بمجرد أن
 * يكون الـ <symbol> نفسه داخل نفس المستند، فإن <use href="#id"> يعمل في كل مكان.
 *
 * الاستخدام في أي Component:
 *   el.innerHTML = icon('edit', { size: 16 });
 */

let loadPromise = null;

/**
 * يحمّل ويحقن الـ sprite مرة واحدة. أي استدعاء إضافي يعيد نفس الـ Promise
 * دون إعادة الجلب (fetch) أو الحقن مرتين.
 * @returns {Promise<void>}
 */
export function loadSprite() {
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const mount = document.getElementById('sprite-mount');
    if (!mount) {
      console.warn('[icon] لا يوجد #sprite-mount في الصفحة — لن يتم حقن الـ sprite.');
      return;
    }
    try {
      const response = await fetch('assets/sprite.svg');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const svgText = await response.text();
      mount.innerHTML = svgText;
    } catch (err) {
      console.error('[icon] فشل تحميل sprite.svg:', err);
    }
  })();

  return loadPromise;
}

/**
 * يبني وسم <svg> جاهز يستخدم <use> للإشارة إلى رمز داخل الـ sprite المحقون.
 * لا يتحقق من وجود المعرّف فعلياً — لو الاسم خاطئ سيظهر عنصر svg فارغ،
 * وهذا سلوك مقصود (فشل صامت في العرض بدلاً من كسر باقي الـ Component).
 * @param {string} name اسم الرمز بدون بادئة "icon-" (مثال: 'edit', 'trash')
 * @param {{ size?: number, className?: string }} [options]
 * @returns {string} HTML string لوسم svg جاهز للإدراج
 */
export function icon(name, { size = 20, className = '' } = {}) {
  const classAttr = className ? ` class="${className}"` : '';
  return `<svg width="${size}" height="${size}" aria-hidden="true"${classAttr}><use href="#icon-${name}"></use></svg>`;
}
