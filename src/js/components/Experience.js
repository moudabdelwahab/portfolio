import { escapeHTML } from './renderUtils.js';

/**
 * Experience — يستخدم بنية .timeline العامة (components.css، مشتركة مع
 * Projects timeline) لكن كل عنصر داخلياً هو .experience-item (sections.css)
 * وليس .timeline-title/.timeline-desc القياسي، لأن الحقول هنا مختلفة:
 * role + company منفصلين، وليس عنوان/وصف بسيطين.
 *
 * عنصر يُعتبر is-active إن كانت period تحتوي على "حتى الآن" (بلا حقل
 * status صريح في بيانات experience، على عكس projects التي لها status).
 * @param {object} data يحتاج data.experience
 * @returns {string}
 */
export function renderExperience(data) {
  const { experience } = data;
  const items = experience.items || [];

  const itemsHTML = items
    .map((item) => {
      const isActive = /حتى الآن/.test(item.period || '');
      const tags = (item.tags || [])
        .map((t) => `<span class="chip">${escapeHTML(t)}</span>`)
        .join('');

      return `
        <div class="timeline-item ${isActive ? 'is-active' : 'is-complete'} experience-item">
          <div class="timeline-dot"></div>
          <div class="timeline-time">${escapeHTML(item.period)}</div>
          <h3>${escapeHTML(item.role)}</h3>
          ${item.company ? `<div class="role-company"><span class="company">${escapeHTML(item.company)}</span></div>` : ''}
          <p class="timeline-desc">${escapeHTML(item.summary)}</p>
          <div class="timeline-tags">${tags}</div>
        </div>
      `;
    })
    .join('');

  return `
    <section class="section" id="experience">
      <div class="container">
        <div class="section-head">
          <span class="eyebrow"><span class="dot"></span>${escapeHTML(experience.eyebrow || '')}</span>
          <h2>${escapeHTML(experience.heading || '')}</h2>
        </div>

        <div class="timeline experience-timeline">
          <div class="timeline-track"></div>
          ${itemsHTML}
        </div>
      </div>
    </section>
  `;
}
