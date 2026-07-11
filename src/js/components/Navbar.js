import { icon } from '../ui/icon.js';
import { escapeHTML } from './renderUtils.js';
import { renderThemeToggle, bindThemeToggle } from './ThemeToggle.js';

/**
 * Navbar — يُبنى من meta.siteName و meta.navigation.
 * يتحكم أيضاً في: حالة is-scrolled، القائمة المتنقلة (mobile-menu)، والهامبرغر.
 * لا يحمل منطق تحرير — أي زر تحرير يُضاف فوقه بواسطة EditingController في وضع الإدارة.
 *
 * @param {object} data الكائن الكامل للبورتفوليو (يحتاج meta فقط، لكن يُمرَّر كاملاً
 *   بنفس نمط باقي الـ Components حتى يسهل تمرير data.profile لاحقاً لو احتاج البراند صورة)
 * @returns {string}
 */
export function renderNavbar(data) {
  const { meta } = data;
  const initials = escapeHTML(meta.siteName || '').trim().charAt(0) || 'م';

  const navLinks = (meta.navigation || [])
    .map((link) => `<a href="#${escapeHTML(link.id)}">${escapeHTML(link.label)}</a>`)
    .join('');

  return `
    <nav class="navbar" id="site-navbar">
      <div class="container">
        <a href="#" class="brand" id="navbar-brand" aria-label="${escapeHTML(meta.siteName)}">
          <span class="brand-mark">${initials}</span>
          <span class="brand-text">
            <strong>${escapeHTML(meta.siteName)}</strong>
            <small>${escapeHTML(meta.tagline || '')}</small>
          </span>
        </a>

        <div class="nav-links">${navLinks}</div>

        <div class="nav-cta">
          ${renderThemeToggle()}
          <button type="button" class="hamburger" id="hamburger-btn" aria-label="فتح القائمة" aria-expanded="false" aria-controls="mobile-menu">
            <span></span><span></span><span></span>
          </button>
        </div>
      </div>
    </nav>

    <div class="mobile-menu" id="mobile-menu">
      <div class="mobile-menu-top">
        <strong>${escapeHTML(meta.siteName)}</strong>
        <button type="button" class="modal-close" id="mobile-menu-close" aria-label="إغلاق القائمة">
          ${icon('x', { size: 16 })}
        </button>
      </div>
      ${navLinks}
    </div>
  `;
}

/**
 * يربط سلوك Navbar التفاعلي (لا علاقة له ببناء HTML): حالة التمرير،
 * فتح/إغلاق القائمة المتنقلة، إغلاقها عند اختيار رابط.
 * يُستدعى مرة واحدة بعد كل عملية رسم للـ Navbar (targeted أو كامل).
 */
export function bindNavbar() {
  bindThemeToggle();

  const navbar = document.getElementById('site-navbar');
  const hamburger = document.getElementById('hamburger-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  const mobileClose = document.getElementById('mobile-menu-close');

  if (navbar) {
    const onScroll = () => {
      navbar.classList.toggle('is-scrolled', window.scrollY > 12);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  function closeMenu() {
    mobileMenu?.classList.remove('is-open');
    hamburger?.setAttribute('aria-expanded', 'false');
  }

  function openMenu() {
    mobileMenu?.classList.add('is-open');
    hamburger?.setAttribute('aria-expanded', 'true');
  }

  hamburger?.addEventListener('click', () => {
    const isOpen = mobileMenu?.classList.contains('is-open');
    if (isOpen) closeMenu(); else openMenu();
  });

  mobileClose?.addEventListener('click', closeMenu);

  mobileMenu?.querySelectorAll('a').forEach((a) => {
    a.addEventListener('click', closeMenu);
  });
}
