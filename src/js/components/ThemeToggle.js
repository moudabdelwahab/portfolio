import { icon } from '../ui/icon.js';

/**
 * ThemeToggle — يبدّل data-theme على <html> بين 'dark' و 'light'.
 * يحفظ اختيار المستخدم في localStorage تحت مفتاح منفصل تماماً عن
 * مفتاح بيانات البورتفوليو (mad3oom:portfolio:data:v1)، لأن اختيار الثيم
 * ليس جزءاً من محتوى البورتفوليو نفسه ولا يجب أن يمر عبر PortfolioRepository
 * أو يُصدَّر ضمن exportJSON().
 */
const THEME_STORAGE_KEY = 'mad3oom:portfolio:theme';

/** @returns {string} HTML لزر تبديل الثيم، يعرض أيقونة القمر/الشمس حسب CSS (لا JS) */
export function renderThemeToggle() {
  return `
    <button type="button" class="theme-toggle" id="theme-toggle-btn" aria-label="تبديل الوضع الليلي/النهاري">
      <span class="icon-moon">${icon('moon', { size: 18 })}</span>
      <span class="icon-sun">${icon('sun', { size: 18 })}</span>
    </button>
  `;
}

/** يقرأ الثيم المحفوظ إن وجد، وإلا يعتمد على meta.themeDefault عند أول تحميل فقط. */
export function getStoredTheme() {
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    return null;
  }
}

/** @param {string} theme 'dark' | 'light' */
export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // localStorage قد يكون غير متاح (وضع خاص، Quota) — التطبيق يستمر بدون حفظ التفضيل فقط.
  }
}

/** يربط زر التبديل بعد كل رسم للـ Navbar. */
export function bindThemeToggle() {
  const btn = document.getElementById('theme-toggle-btn');
  btn?.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    applyTheme(current === 'dark' ? 'light' : 'dark');
  });
}
