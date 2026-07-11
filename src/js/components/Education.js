import { escapeHTML } from './renderUtils.js';

/**
 * Education — قائمة بسيطة من education.items، كل عنصر institute+degree على
 * اليسار وperiod+grade على اليمين (via .meta text-align:end في sections.css).
 * @param {object} data يحتاج data.education
 * @returns {string}
 */
export function renderEducation(data) {
  const { education } = data;
  const items = (education.items || [])
    .map((item) => `
      <div class="education-item">
        <div>
          <h3>${escapeHTML(item.institute)}</h3>
          <div class="degree">${escapeHTML(item.degree)}</div>
        </div>
        <div class="meta">
          <div>${escapeHTML(item.period)}</div>
          <div class="grade">${escapeHTML(item.grade)}</div>
        </div>
      </div>
    `)
    .join('');

  return `
    <section class="section" id="education">
      <div class="container">
        <div class="section-head">
          <span class="eyebrow"><span class="dot"></span>${escapeHTML(education.eyebrow || '')}</span>
          <h2>${escapeHTML(education.heading || '')}</h2>
        </div>

        <div class="education-list">${items}</div>
      </div>
    </section>
  `;
}
