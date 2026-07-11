import { escapeHTML } from './renderUtils.js';

/**
 * About — نبذة نصية (paragraphs) + لوحة مجالات التركيز (focusAreas) كـ chips.
 * @param {object} data يحتاج data.about
 * @returns {string}
 */
export function renderAbout(data) {
  const { about } = data;

  const paragraphs = (about.paragraphs || [])
    .map((p) => `<p>${escapeHTML(p)}</p>`)
    .join('');

  const focusChips = (about.focusAreas || [])
    .map((f) => `<span class="chip">${escapeHTML(f.label)}</span>`)
    .join('');

  return `
    <section class="section" id="about">
      <div class="container">
        <div class="section-head">
          <span class="eyebrow"><span class="dot"></span>${escapeHTML(about.eyebrow || '')}</span>
          <h2>${escapeHTML(about.heading || '')}</h2>
        </div>

        <div class="about-grid">
          <div class="about-paragraphs">${paragraphs}</div>
          <div class="focus-panel glass">
            <h3>مجالات التركيز</h3>
            <div class="focus-chips">${focusChips}</div>
          </div>
        </div>
      </div>
    </section>
  `;
}
