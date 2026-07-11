import { PortfolioRepository } from './data/PortfolioRepository.js';
import { Renderer } from './core/Renderer.js';
import { applyTheme, getStoredTheme } from './components/ThemeToggle.js';

/**
 * نقطة دخول index.html (الوضع العام، بدون أي طبقة تحرير).
 * التسلسل: طبّق الثيم المحفوظ → حمّل البيانات → ارسم كل شيء → استمع لأي
 * تغييرات مستقبلية في البيانات (يحدث فقط لو فُتح admin.html في تبويب آخر
 * وعدّل localStorage، بفضل subscribe العام في PortfolioRepository).
 */
async function main() {
  const repo = new PortfolioRepository();
  const renderer = new Renderer({ mountSelector: '#app' });

  const initialData = await repo.load();

  // الثيم الافتراضي من meta.themeDefault يُستخدم فقط لو المستخدم لم يختر
  // ثيماً من قبل (getStoredTheme يرجع null في هذه الحالة).
  applyTheme(getStoredTheme() || initialData.meta.themeDefault || 'dark');

  await renderer.mount(initialData);

  repo.subscribe((payload) => {
    renderer.update(payload);
  });
}

main().catch((err) => {
  console.error('[app] فشل بدء التطبيق:', err);
});
