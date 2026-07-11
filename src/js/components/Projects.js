import { escapeHTML, safeHref } from './renderUtils.js';
import { icon } from '../ui/icon.js';

/**
 * Projects — كل مشروع بطاقة (.project-card) تحتوي: رأس + وصف + شبكة مراحل
 * (project-phases، مصممة لأربع مراحل تحديداً حسب sections.css grid-template-columns:
 * repeat(4, 1fr)) + التركيز الحالي + الإنجازات.
 * المشروع الحالي الوحيد في البيانات هو Mad3oom بأربع مراحل بالضبط، وهذا
 * يطابق تصميم project-phases تماماً.
 */

/**
 * @param {object} project عنصر واحد من projects.items
 * @returns {string}
 */
function renderProjectCard(project) {
  const phasesHTML = (project.timeline || [])
    .map((phase, i) => {
      const items = (phase.items || [])
        .map((item) => `<li>${escapeHTML(item)}</li>`)
        .join('');
      return `
        <div class="phase-step">
          <div class="phase-num">${i + 1}</div>
          <span class="phase-label">${escapeHTML(phase.phase)}</span>
          <h4>${escapeHTML(phase.title)}</h4>
          ${phase.description ? `<p>${escapeHTML(phase.description)}</p>` : ''}
          <ul>${items}</ul>
        </div>
      `;
    })
    .join('');

  const focusChips = (project.currentFocus || [])
    .map((f) => `<span class="chip">${escapeHTML(f)}</span>`)
    .join('');

  const achievements = (project.achievements || [])
    .map((a) => `<li>${icon('check', { size: 16 })}<span>${escapeHTML(a)}</span></li>`)
    .join('');

  const liveLink = project.links?.live
    ? `<a href="${safeHref(project.links.live)}" class="btn btn-outline btn-icon" aria-label="زيارة المشروع" target="_blank" rel="noopener">${icon('external', { size: 16 })}</a>`
    : '';
  const repoLink = project.links?.repo
    ? `<a href="${safeHref(project.links.repo)}" class="btn btn-outline btn-icon" aria-label="مستودع الكود" target="_blank" rel="noopener">${icon('github', { size: 16 })}</a>`
    : '';

  return `
    <article class="project-card">
      <div class="project-head">
        <div>
          <h3>${escapeHTML(project.name)}</h3>
          <div class="project-meta">
            <span class="badge badge-active">${escapeHTML(project.status || '')}</span>
            <span>${escapeHTML(project.period || '')}</span>
          </div>
        </div>
        <div class="project-links">${liveLink}${repoLink}</div>
      </div>

      <p class="project-description">${escapeHTML(project.description)}</p>

      <div class="project-phases">${phasesHTML}</div>

      ${focusChips ? `
        <div class="project-subhead">التركيز الحالي</div>
        <div class="project-focus">${focusChips}</div>
      ` : ''}

      ${achievements ? `
        <div class="project-subhead">الإنجازات</div>
        <ul class="project-achievements check-list">${achievements}</ul>
      ` : ''}
    </article>
  `;
}

/**
 * @param {object} data يحتاج data.projects
 * @returns {string}
 */
export function renderProjects(data) {
  const { projects } = data;
  const cards = (projects.items || []).map(renderProjectCard).join('');

  return `
    <section class="section" id="projects">
      <div class="container">
        <div class="section-head">
          <span class="eyebrow"><span class="dot"></span>${escapeHTML(projects.eyebrow || '')}</span>
          <h2>${escapeHTML(projects.heading || '')}</h2>
        </div>

        <div class="projects-list">${cards}</div>
      </div>
    </section>
  `;
}
