import { PortfolioRepository } from './data/PortfolioRepository.js';
import { Renderer } from './core/Renderer.js';
import { HistoryManager } from './core/HistoryManager.js';
import { EditingController } from './admin/EditingController.js';
import { AdminToolbar } from './admin/AdminToolbar.js';
import { applyTheme, getStoredTheme } from './components/ThemeToggle.js';

/**
 * نقطة دخول admin.html. نفس PortfolioRepository وRenderer المستخدمين في
 * app.js تماماً (بلا أي فرع خاص بالإدارة داخلهما) — الفرق الوحيد هنا هو
 * إضافة EditingController فوق DOM بعد كل رسم، وAdminToolbar للتحكم
 * بالتراجع/الإعادة/الاستيراد/التصدير/إعادة التعيين.
 */
async function main() {
  const repo = new PortfolioRepository();
  const renderer = new Renderer({ mountSelector: '#app' });
  const history = new HistoryManager();

  const initialData = await repo.load();
  history.init(initialData);

  applyTheme(getStoredTheme() || initialData.meta.themeDefault || 'dark');

  // toolbar يُنشأ أولاً بلا onHistoryChange بعد لأن editing لم يُبنَ بعد؛
  // نربطهما ببعض بعد الإنشاء (كل منهما يحتاج مرجعاً للآخر: toolbar يحتاج
  // onDataReplaced ليعيد enhanceAll بعد undo/redo/reset/import، وediting
  // يحتاج onHistoryChange ليُحدِّث أزرار الشريط فور كل push()).
  let editing;
  const toolbar = new AdminToolbar(repo, history, () => {
    editing.enhanceAll();
  });
  editing = new EditingController(repo, history, () => {
    toolbar.refresh();
  });

  toolbar.mount();

  await renderer.mount(initialData);
  editing.enhanceAll();

  repo.subscribe(async (payload) => {
    await renderer.update(payload);
    editing.enhanceAll();
    toolbar.refresh(); // يُحدِّث badge المصدر تحديداً هنا؛ أزرار history تُحدَّث أيضاً عبر onHistoryChange
    toolbar.flashSaving();
  });
}

main().catch((err) => {
  console.error('[admin-app] فشل بدء لوحة التحكم:', err);
});
