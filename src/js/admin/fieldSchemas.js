/**
 * fieldSchemas — تعريف بيانات بحت (بدون أي DOM) لحقول كل قسم القابلة
 * للتحرير عبر FormBuilder. مقسّمة إلى:
 * 1) sectionSchemas: الحقول "المفردة" في كل قسم (عنوان، eyebrow، نص سيرة...).
 * 2) itemSchemas: حقول عنصر واحد داخل قائمة قابلة لإعادة الترتيب/الإضافة/
 *    الحذف (experience.items[i]، skills.categories[i].items[j]، إلخ) —
 *    هذه تُحرَّر عبر Modal منفصل لكل عنصر، وليس ضمن نموذج القسم الكامل،
 *    حتى يبقى كل Modal صغيراً ومركّزاً.
 *
 * كل مفتاح هنا يطابق حرفياً اسم الحقل في data/portfolio.default.json —
 * لا تحويل أسماء، حتى يبقى الربط مع PortfolioRepository مباشراً وواضحاً.
 */

export const sectionSchemas = {
  meta: [
    { name: 'siteName', type: 'text', label: 'اسم الموقع', required: true },
    { name: 'tagline', type: 'text', label: 'الشعار / الوصف القصير' },
    { name: 'seoDescription', type: 'textarea', label: 'وصف SEO', hint: 'يظهر في نتائج البحث ومعاينات المشاركة' },
  ],

  profile: [
    { name: 'name', type: 'text', label: 'الاسم الكامل', required: true },
    { name: 'title', type: 'text', label: 'المسمى الوظيفي', required: true },
    { name: 'bio', type: 'textarea', label: 'نبذة قصيرة (Hero)' },
    { name: 'avatar', type: 'image', label: 'الصورة الشخصية' },
    { name: 'location', type: 'text', label: 'الموقع' },
  ],

  about: [
    { name: 'eyebrow', type: 'text', label: 'العنوان الفرعي العلوي' },
    { name: 'heading', type: 'text', label: 'عنوان القسم' },
  ],

  experience: [
    { name: 'eyebrow', type: 'text', label: 'العنوان الفرعي العلوي' },
    { name: 'heading', type: 'text', label: 'عنوان القسم' },
  ],

  skills: [
    { name: 'eyebrow', type: 'text', label: 'العنوان الفرعي العلوي' },
    { name: 'heading', type: 'text', label: 'عنوان القسم' },
  ],

  projects: [
    { name: 'eyebrow', type: 'text', label: 'العنوان الفرعي العلوي' },
    { name: 'heading', type: 'text', label: 'عنوان القسم' },
  ],

  education: [
    { name: 'eyebrow', type: 'text', label: 'العنوان الفرعي العلوي' },
    { name: 'heading', type: 'text', label: 'عنوان القسم' },
  ],

  contact: [
    { name: 'eyebrow', type: 'text', label: 'العنوان الفرعي العلوي' },
    { name: 'heading', type: 'text', label: 'عنوان القسم' },
    { name: 'email', type: 'email', label: 'البريد الإلكتروني' },
    { name: 'phone', type: 'tel', label: 'الهاتف' },
    { name: 'location', type: 'text', label: 'الموقع' },
    { name: 'linkedin', type: 'url', label: 'رابط LinkedIn' },
    { name: 'github', type: 'url', label: 'رابط GitHub' },
  ],
};

/**
 * مخططات عناصر القوائم القابلة للإضافة/الحذف/إعادة الترتيب. كل مفتاح هنا
 * يطابق sectionKey.listField (مثال: 'experience.items') حتى يسهل ربطه
 * بـ EditingController دون جدول ترجمة إضافي.
 */
export const itemSchemas = {
  'experience.items': [
    { name: 'role', type: 'text', label: 'المسمى الوظيفي', required: true },
    { name: 'company', type: 'text', label: 'الشركة' },
    { name: 'period', type: 'text', label: 'الفترة الزمنية', hint: 'مثال: أغسطس 2025 — حتى الآن' },
    { name: 'summary', type: 'textarea', label: 'الوصف' },
  ],

  'skills.categories': [
    { name: 'label', type: 'text', label: 'اسم الفئة', required: true },
  ],

  // عنصر مهارة مفردة داخل فئة (skills.categories[i].items[j])
  'skills.categories.items': [
    { name: 'label', type: 'text', label: 'اسم المهارة', required: true },
  ],

  'projects.items': [
    { name: 'name', type: 'text', label: 'اسم المشروع', required: true },
    { name: 'period', type: 'text', label: 'الفترة الزمنية' },
    { name: 'status', type: 'text', label: 'الحالة' },
    { name: 'description', type: 'textarea', label: 'الوصف' },
  ],

  'education.items': [
    { name: 'institute', type: 'text', label: 'المؤسسة التعليمية', required: true },
    { name: 'degree', type: 'text', label: 'الدرجة العلمية' },
    { name: 'period', type: 'text', label: 'الفترة الزمنية' },
    { name: 'grade', type: 'text', label: 'التقدير' },
  ],
};
