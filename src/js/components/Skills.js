import { escapeHTML } from './renderUtils.js';
import { icon } from '../ui/icon.js';

/**
 * Skills — كل فئة (category) لها عنوان + قائمة chips من items.
 * .skill-category h3 في sections.css مصمم بـ display:flex لاستيعاب أيقونة
 * قبل النص، لكن لا يوجد حقل icon في بيانات skills.categories، فنربط أيقونة
 * مناسبة حسب id الفئة كتحسين عرض فقط — فئة غير معروفة تُعرض بدون أيقونة
 * بدل كسر العرض أو اختراع بيانات غير موجودة.
 */
const CATEGORY_ICON = {
  'cat-programming': 'terminal',
  'cat-backend': 'layers',
  'cat-cloud': 'upload',
  'cat-ai': 'briefcase',
  'cat-support': 'message',
};

/**
 * @param {object} data يحتاج data.skills
 * @returns {string}
 */
export function renderSkills(data) {
  const { skills } = data;
  const categories = skills.categories || [];

  const categoriesHTML = categories
    .map((cat) => {
      const iconName = CATEGORY_ICON[cat.id];
      const items = (cat.items || [])
        .map((item) => `<span class="chip">${escapeHTML(item.label)}</span>`)
        .join('');

      return `
        <div class="skill-category">
          <h3>${iconName ? icon(iconName, { size: 16 }) : ''}${escapeHTML(cat.label)}</h3>
          <div class="chip-list">${items}</div>
        </div>
      `;
    })
    .join('');

  return `
    <section class="section" id="skills">
      <div class="container">
        <div class="section-head">
          <span class="eyebrow"><span class="dot"></span>${escapeHTML(skills.eyebrow || '')}</span>
          <h2>${escapeHTML(skills.heading || '')}</h2>
        </div>

        <div class="skills-grid">${categoriesHTML}</div>
      </div>
    </section>
  `;
}
