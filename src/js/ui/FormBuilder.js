import { escapeHTML } from '../components/renderUtils.js';

/**
 * FormBuilder — يبني نموذج HTML من مخطط حقول بسيط (يُستخدم مع fieldSchemas.js
 * في طبقة الإدارة)، ويقرأ القيم منه لاحقاً ككائن عادي. لا يتعامل مع الحفظ
 * أو التحقق من صحة البيانات على مستوى البورتفوليو — تلك مسؤولية
 * EditingController + PortfolioRepository.validatePortfolioData.
 *
 * @typedef {object} FieldSchema
 * @property {string} name مفتاح الحقل في الكائن الناتج
 * @property {'text'|'email'|'tel'|'url'|'textarea'|'select'|'image'} type
 * @property {string} label
 * @property {string} [hint]
 * @property {boolean} [required]
 * @property {{ value: string, label: string }[]} [options] مطلوبة لـ type='select'
 */

/**
 * @param {FieldSchema[]} schema
 * @param {Record<string, any>} values قيم أولية لكل حقل (name -> value)
 * @returns {string} HTML لكل الحقول (بدون <form> نفسه، حتى يقرر المستدعي غلافه)
 */
export function buildForm(schema, values = {}) {
  return schema.map((field) => buildField(field, values[field.name])).join('');
}

/**
 * @param {FieldSchema} field
 * @param {any} value
 * @returns {string}
 */
function buildField(field, value) {
  const id = `field-${field.name}`;
  const label = `<label for="${id}">${escapeHTML(field.label)}${field.required ? ' *' : ''}</label>`;
  const hint = field.hint ? `<span class="hint">${escapeHTML(field.hint)}</span>` : '';

  let control;
  switch (field.type) {
    case 'textarea':
      control = `<textarea id="${id}" name="${field.name}" ${field.required ? 'required' : ''}>${escapeHTML(value ?? '')}</textarea>`;
      break;

    case 'select': {
      const opts = (field.options || [])
        .map((opt) => `<option value="${escapeHTML(opt.value)}" ${opt.value === value ? 'selected' : ''}>${escapeHTML(opt.label)}</option>`)
        .join('');
      control = `<select id="${id}" name="${field.name}">${opts}</select>`;
      break;
    }

    case 'image':
      control = `
        <div class="field-image-preview" id="${id}-preview">
          ${value ? `<img src="${escapeHTML(value)}" alt="" />` : ''}
        </div>
        <label class="btn btn-outline btn-sm field-file-btn">
          اختر صورة
          <input type="file" id="${id}" name="${field.name}" accept="image/*" />
        </label>
        <input type="hidden" id="${id}-value" name="${field.name}__value" value="${escapeHTML(value ?? '')}" />
      `;
      break;

    default: // text, email, tel, url
      control = `<input type="${field.type}" id="${id}" name="${field.name}" value="${escapeHTML(value ?? '')}" ${field.required ? 'required' : ''} />`;
  }

  return `<div class="field">${label}${control}${hint}</div>`;
}

/**
 * يقرأ قيم كل الحقول من الحاوية المُعطاة (عادة .modal-body بعد buildForm)
 * استناداً إلى نفس المخطط، ويعيد كائناً { name: value }.
 * لحقول من نوع 'image' يعيد Data URL (base64) إن اختار المستخدم ملفاً جديداً،
 * أو القيمة الأصلية إن لم يغيّرها — متوافق مع "no backend" لأن الصورة
 * تُخزَّن كـ Data URL داخل بيانات البورتفوليو نفسها (localStorage).
 * @param {HTMLElement} container
 * @param {FieldSchema[]} schema
 * @returns {Promise<Record<string, any>>}
 */
export async function readFormValues(container, schema) {
  const result = {};

  for (const field of schema) {
    if (field.type === 'image') {
      const fileInput = container.querySelector(`#field-${field.name}`);
      const hiddenValue = container.querySelector(`#field-${field.name}-value`);
      const file = fileInput?.files?.[0];
      if (file) {
        result[field.name] = await fileToDataURL(file);
      } else {
        result[field.name] = hiddenValue?.value || '';
      }
      continue;
    }

    const el = container.querySelector(`#field-${field.name}`);
    if (!el) continue;
    result[field.name] = el.value;
  }

  return result;
}

/**
 * @param {File} file
 * @returns {Promise<string>}
 */
function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
