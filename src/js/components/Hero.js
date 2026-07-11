import { escapeHTML, safeHref, safeAssetPath } from './renderUtils.js';

/**
 * Hero — الاستبدال المتعمّد لتصميم Robot الموجود في المرجع: Avatar +
 * Orbiting Skill Badges + خلفية Circuit متحركة (موثّق في ARCHITECTURE.md §5).
 * كل المواقع الدائرية للـ orbit-chip محسوبة هنا في JS لأن sections.css
 * يعرّف الشكل والحركة فقط، وليس الإحداثيات (تعتمد على عدد العناصر).
 */

/**
 * يوزّع عناصر highlights بالتساوي حول دائرة نصف قطرها given، إحداثيات
 * نسبية لمركز .hero-orbit (نستخدم % حتى تتكيف مع أي حجم شاشة).
 * @param {number} index
 * @param {number} total
 * @returns {{ top: string, left: string }}
 */
function orbitPosition(index, total) {
  const angle = (index / total) * 2 * Math.PI - Math.PI / 2; // نبدأ من الأعلى
  const radiusPct = 42; // نسبة من نصف قطر .hero-orbit
  const top = 50 + radiusPct * Math.sin(angle);
  const left = 50 + radiusPct * Math.cos(angle);
  return { top: `${top.toFixed(1)}%`, left: `${left.toFixed(1)}%` };
}

/**
 * @param {object} data الكائن الكامل، يحتاج data.profile
 * @returns {string}
 */
export function renderHero(data) {
  const { profile } = data;
  const initials = escapeHTML(profile.name || '').trim().charAt(0) || '؟';
  const highlights = profile.highlights || [];

  const orbitChips = highlights
    .map((h, i) => {
      const { top, left } = orbitPosition(i, highlights.length);
      return `<span class="orbit-chip" style="top:${top}; left:${left};">${escapeHTML(h.label)}</span>`;
    })
    .join('');

  const primaryCta = profile.primaryCta;
  const secondaryCta = profile.secondaryCta;

  const primaryBtn = primaryCta?.label
    ? `<a class="btn btn-primary" href="${safeHref(primaryCta.href)}"${primaryCta.type === 'download' ? ' download' : ''}>${escapeHTML(primaryCta.label)}</a>`
    : '';
  const secondaryBtn = secondaryCta?.label
    ? `<a class="btn btn-outline" href="${safeHref(secondaryCta.href)}">${escapeHTML(secondaryCta.label)}</a>`
    : '';

  return `
    <section class="hero" id="hero">
      <svg class="circuit-bg" viewBox="0 0 800 600" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0,80 H260 L320,140 H800" />
        <path d="M0,320 H180 L240,260 H520 L580,320 H800" />
        <path d="M0,520 H400 L460,460 H800" />
      </svg>

      <div class="container hero-grid">
        <div class="hero-copy">
          <div class="hero-eyebrow">
            <span class="eyebrow"><span class="dot"></span>${escapeHTML(profile.location || '')}</span>
          </div>
          <h1 class="gradient-text">${escapeHTML(profile.name)}</h1>
          <span class="role">${escapeHTML(profile.title)}</span>
          <p class="bio">${escapeHTML(profile.bio)}</p>
          <div class="hero-actions">
            ${primaryBtn}
            ${secondaryBtn}
          </div>
          <div class="hero-highlights">
            ${highlights.map((h) => `<span class="chip">${escapeHTML(h.label)}</span>`).join('')}
          </div>
        </div>

        <div class="hero-orbit">
          <div class="hero-halo"></div>
          <div class="hero-ring r1"></div>
          <div class="hero-ring r2"></div>
          <div class="hero-avatar avatar" style="display:flex;align-items:center;justify-content:center;font-size:2.5rem;font-weight:800;color:#fff;">
            ${(() => {
              const src = safeAssetPath(profile.avatar);
              return src ? `<img src="${src}" alt="${escapeHTML(profile.name)}" onerror="this.remove()" />` : '';
            })()}
            <span class="avatar-fallback">${initials}</span>
          </div>
          ${orbitChips}
        </div>
      </div>
    </section>
  `;
}
