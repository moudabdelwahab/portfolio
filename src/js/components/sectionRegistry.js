import { renderNavbar, bindNavbar } from './Navbar.js';
import { renderHero } from './Hero.js';
import { renderAbout } from './About.js';
import { renderExperience } from './Experience.js';
import { renderSkills } from './Skills.js';
import { renderProjects } from './Projects.js';
import { renderEducation } from './Education.js';
import { renderContact } from './Contact.js';
import { renderFooter } from './Footer.js';

/**
 * جدول ربط بين sectionKey (كما يُبلَّغ من PortfolioRepository.subscribe) وبين
 * دالة العرض المسؤولة عنه. هذا هو المصدر الذي يعتمد عليه Renderer.js لمعرفة
 * ماذا يرسم بالكامل، وماذا يعيد رسمه عند تعديل قسم واحد فقط.
 *
 * ملاحظة: meta ليس له قسم DOM مستقل خاص به — يُستهلك بواسطة كل من Navbar
 * وFooter معاً، لذلك تغييره يتطلب إعادة رسم كليهما (registry يعكس ذلك عبر
 * mountId مصفوفة من هدفين). كل قسم آخر له عنصر DOM واحد مطابق لاسمه.
 */
export const sectionRegistry = {
  meta: {
    mountIds: ['navbar-mount', 'footer-mount'],
    render(data) {
      return { 'navbar-mount': renderNavbar(data), 'footer-mount': renderFooter(data) };
    },
    afterRender() {
      bindNavbar();
    },
  },
  profile: {
    mountIds: ['hero-mount'],
    render(data) {
      return { 'hero-mount': renderHero(data) };
    },
  },
  about: {
    mountIds: ['about-mount'],
    render(data) {
      return { 'about-mount': renderAbout(data) };
    },
  },
  experience: {
    mountIds: ['experience-mount'],
    render(data) {
      return { 'experience-mount': renderExperience(data) };
    },
  },
  skills: {
    mountIds: ['skills-mount'],
    render(data) {
      return { 'skills-mount': renderSkills(data) };
    },
  },
  projects: {
    mountIds: ['projects-mount'],
    render(data) {
      return { 'projects-mount': renderProjects(data) };
    },
  },
  education: {
    mountIds: ['education-mount'],
    render(data) {
      return { 'education-mount': renderEducation(data) };
    },
  },
  contact: {
    mountIds: ['contact-mount'],
    render(data) {
      return { 'contact-mount': renderContact(data) };
    },
  },
};

/** الترتيب الفعلي لظهور الأقسام داخل #app عند الرسم الكامل. */
export const SECTION_ORDER = [
  'meta:navbar',
  'profile',
  'about',
  'experience',
  'skills',
  'projects',
  'education',
  'contact',
  'meta:footer',
];
