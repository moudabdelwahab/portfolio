/**
 * أدوات مشتركة صغيرة تستخدمها كل الـ Components عند بناء HTML كنص.
 * الأهم هنا: escapeHTML — كل نص قادم من portfolio.default.json أو من تعديل
 * المستخدم في وضع الإدارة يجب أن يمر منها قبل إدراجه، لأن هذا المحتوى
 * قابل للتعديل بالكامل من admin.html ولا يجب الوثوق به كـ HTML خام.
 */

const ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/**
 * @param {string|number|null|undefined} value
 * @returns {string}
 */
export function escapeHTML(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[&<>"']/g, (ch) => ESCAPE_MAP[ch]);
}

/**
 * يبني سمة href آمنة لروابط قابلة للتنقّل قادمة من البيانات (email/tel/http/
 * مرساة داخلية). يمنع أي قيمة تبدأ بـ "javascript:" أو ما شابه من التسرب
 * كسمة href قابلة للتنفيذ. لا يقبل مسارات نسبية محلية عمداً — لهذا
 * safeAssetPath منفصلة (انظر أدناه)، لأن سياق الاستخدام مختلف تماماً
 * (وجهة تنقّل يفتحها المستخدم، وليس ملفاً محلياً يحمّله المتصفح).
 * @param {string|null|undefined} url
 * @returns {string} رابط آمن، أو "#" إن كانت القيمة فارغة أو مشبوهة
 */
export function safeHref(url) {
  if (!url) return '#';
  const trimmed = String(url).trim();
  if (/^(https?:|mailto:|tel:|#)/i.test(trimmed)) return escapeHTML(trimmed);
  return '#';
}

/**
 * يبني مسار src آمن لأصل محلي (صورة أفاتار مثلاً) قادم من البيانات. يقبل
 * فقط مسارات نسبية (assets/...) أو http(s) — يرفض أي قيمة تبدأ بـ
 * "javascript:", "data:text/html", أو ما شابه.
 * @param {string|null|undefined} path
 * @returns {string|null} مسار آمن، أو null إن كانت القيمة فارغة أو مشبوهة
 *   (null بدل "#" لأن المستدعي هنا يحتاج يعرف "لا توجد صورة" ليتصرف، مثلاً
 *   بعدم إدراج <img> إطلاقاً بدل إدراج src="#" الذي يطلب الصفحة نفسها).
 */
export function safeAssetPath(path) {
  if (!path) return null;
  const trimmed = String(path).trim();
  if (/^(https?:|\.{0,2}\/|[a-zA-Z0-9_-])/i.test(trimmed) && !/^javascript:/i.test(trimmed)) {
    return escapeHTML(trimmed);
  }
  return null;
}
