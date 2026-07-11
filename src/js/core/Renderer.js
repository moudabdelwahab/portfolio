import { sectionRegistry } from '../components/sectionRegistry.js';
import { renderNavbar, bindNavbar } from '../components/Navbar.js';
import { renderHero } from '../components/Hero.js';
import { renderAbout } from '../components/About.js';
import { renderExperience } from '../components/Experience.js';
import { renderSkills } from '../components/Skills.js';
import { renderProjects } from '../components/Projects.js';
import { renderEducation } from '../components/Education.js';
import { renderContact } from '../components/Contact.js';
import { renderFooter } from '../components/Footer.js';
import { loadSprite } from '../ui/icon.js';

/**
 * Renderer — مسؤول عن:
 * 1) الرسم الكامل الأول لكل الأقسام داخل #app، كل قسم في عنصر <div id="X-mount">
 *    خاص به حتى يمكن استبدال innerHTML لقسم واحد فقط دون لمس بقية الصفحة.
 * 2) إعادة الرسم الموجّهة (targeted) عند وصول إشعار من PortfolioRepository
 *    يحمل sectionKey محدد — نعيد رسم mount(s) هذا القسم فقط.
 * 3) إعادة الرسم الكاملة عند sectionKey === null (Import / Reset / Undo-Redo
 *    الذي يستبدل كل البيانات دفعة واحدة عبر replaceAll).
 *
 * لا تعرف هذه الطبقة شيئاً عن التخزين أو localStorage — تستقبل فقط كائن
 * البيانات الكامل وترسمه، تماماً كما وثّق ARCHITECTURE.md.
 */
export class Renderer {
  /**
   * @param {{ mountSelector?: string }} [options]
   */
  constructor({ mountSelector = '#app' } = {}) {
    this.mountSelector = mountSelector;
    this.root = document.querySelector(mountSelector);
    if (!this.root) {
      throw new Error(`[Renderer] لم يتم العثور على عنصر الجذر "${mountSelector}"`);
    }
  }

  /**
   * الرسم الأول: يبني هيكل الصفحة بالكامل بترتيب الأقسام الثابت، ثم يربط
   * أي سلوك تفاعلي (حالياً فقط Navbar). يُستدعى مرة واحدة عند بدء التطبيق.
   * @param {object} data
   */
  async mount(data) {
    await loadSprite();

    this.root.innerHTML = `
      <div id="navbar-mount">${renderNavbar(data)}</div>
      <main>
        <div id="hero-mount">${renderHero(data)}</div>
        <div id="about-mount">${renderAbout(data)}</div>
        <div id="experience-mount">${renderExperience(data)}</div>
        <div id="skills-mount">${renderSkills(data)}</div>
        <div id="projects-mount">${renderProjects(data)}</div>
        <div id="education-mount">${renderEducation(data)}</div>
        <div id="contact-mount">${renderContact(data)}</div>
      </main>
      <div id="footer-mount">${renderFooter(data)}</div>
    `;

    bindNavbar();
  }

  /**
   * يُستدعى من مستمع PortfolioRepository.subscribe().
   * @param {{ sectionKey: string|null, data: object }} payload
   */
  async update({ sectionKey, data }) {
    if (sectionKey === null) {
      await this.mount(data); // إعادة رسم كاملة (Import/Reset/Undo/Redo)
      return;
    }

    const entry = sectionRegistry[sectionKey];
    if (!entry) {
      console.warn(`[Renderer] لا يوجد إدخال في sectionRegistry للقسم "${sectionKey}" — سيتم تجاهله.`);
      return;
    }

    const htmlBySlot = entry.render(data);
    for (const [mountId, html] of Object.entries(htmlBySlot)) {
      const el = document.getElementById(mountId);
      if (el) el.innerHTML = html;
    }
    entry.afterRender?.();
  }
}
