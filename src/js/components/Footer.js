import { escapeHTML } from './renderUtils.js';

/**
 * Footer — يعيد استخدام meta.siteName/tagline وmeta.navigation، بلا بيانات
 * إضافية مطلوبة. سنة النسخ محسوبة في وقت التشغيل، لا مخزَّنة في البيانات.
 * @param {object} data يحتاج data.meta
 * @returns {string}
 */
export function renderFooter(data) {
  const { meta } = data;
  const year = new Date().getFullYear();

  const navCol = (meta.navigation || [])
    .map((link) => `<a href="#${escapeHTML(link.id)}">${escapeHTML(link.label)}</a>`)
    .join('');

  return `
    <footer>
      <div class="container">
        <div class="footer-grid">
          <div class="footer-brand">
            <strong>${escapeHTML(meta.siteName)}</strong>
            <p>${escapeHTML(meta.tagline || '')}</p>
          </div>
          <div class="footer-links">
            <div class="footer-col">
              <h5>الأقسام</h5>
              ${navCol}
            </div>
          </div>
        </div>
        <div class="footer-bottom">
          <span>© ${year} ${escapeHTML(meta.siteName)}</span>
        </div>
      </div>
    </footer>
  `;
}
