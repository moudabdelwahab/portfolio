import { escapeHTML, safeHref } from './renderUtils.js';
import { icon } from '../ui/icon.js';

/**
 * Contact — بطاقة لكل قناة تواصل موجودة فعلياً في البيانات (email/phone/
 * location/linkedin/github). أي حقل فارغ أو غير موجود لا تُعرض بطاقته،
 * بدل عرض بطاقة فارغة أو رابط "#" بلا معنى.
 * @param {object} data يحتاج data.contact
 * @returns {string}
 */
export function renderContact(data) {
  const { contact } = data;

  const channels = [
    contact.email && {
      icon: 'mail', label: 'البريد الإلكتروني', value: contact.email,
      href: `mailto:${contact.email}`,
    },
    contact.phone && {
      icon: 'phone', label: 'الهاتف', value: contact.phone,
      href: `tel:${contact.phone}`,
    },
    contact.location && {
      icon: 'pin', label: 'الموقع', value: contact.location,
      href: null,
    },
    contact.linkedin && {
      icon: 'linkedin', label: 'LinkedIn', value: contact.linkedin.replace(/^https?:\/\//, ''),
      href: contact.linkedin,
    },
    contact.github && {
      icon: 'github', label: 'GitHub', value: contact.github.replace(/^https?:\/\//, ''),
      href: contact.github,
    },
  ].filter(Boolean);

  const cardsHTML = channels
    .map((ch) => {
      const inner = `
        <span class="icon-wrap">${icon(ch.icon, { size: 19 })}</span>
        <span>
          <strong>${escapeHTML(ch.label)}</strong>
          <span>${escapeHTML(ch.value)}</span>
        </span>
      `;
      return ch.href
        ? `<a class="contact-card" href="${safeHref(ch.href)}" target="_blank" rel="noopener">${inner}</a>`
        : `<div class="contact-card">${inner}</div>`;
    })
    .join('');

  return `
    <section class="section" id="contact">
      <div class="container">
        <div class="section-head">
          <span class="eyebrow"><span class="dot"></span>${escapeHTML(contact.eyebrow || '')}</span>
          <h2>${escapeHTML(contact.heading || '')}</h2>
        </div>

        <div class="contact-grid">${cardsHTML}</div>
      </div>
    </section>
  `;
}
