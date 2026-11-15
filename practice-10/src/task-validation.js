import { ApiError } from './errors.js';

const PRIORITIES = new Set(['low', 'medium', 'high']);
const TITLE_MAX_LENGTH = 100;
const CREATE_FIELDS = ['title', 'priority', 'categoryId'];
const PATCH_FIELDS = ['title', 'priority', 'categoryId', 'completed'];

function validationError(details) {
  return new ApiError(400, 'VALIDATION_ERROR', 'Данные не прошли проверку.', details);
}

// categoryIds — Set существующих id категорий.
// Возвращает НОВЫЙ объект только с нормализованными разрешёнными полями.
// partial=false: title, priority, categoryId обязательны; completed/id запрещены.
// partial=true: хотя бы одно из title, priority, categoryId, completed; id запрещён.
// Ошибка: ApiError(400, 'VALIDATION_ERROR', сообщение, details).
export function validateTaskInput(value, { partial = false, categoryIds } = {}) {
  // Объект без прототипа: имя поля вроде __proto__ не изменяет прототип и не теряется.
  const details = Object.create(null);

  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    details.body = 'Тело запроса должно быть JSON-объектом.';
    throw validationError(details);
  }

  const allowed = partial ? PATCH_FIELDS : CREATE_FIELDS;

  // Запрещённые и неизвестные имена: ошибка по каждому имени.
  for (const key of Object.keys(value)) {
    if (key === 'id') {
      details.id = 'Идентификатор назначается сервером и не может передаваться.';
    } else if (key === 'completed' && !partial) {
      details.completed = 'Статус при создании назначает сервер.';
    } else if (!allowed.includes(key)) {
      details[key] = 'Неизвестное поле.';
    }
  }

  const result = {};

  for (const key of allowed) {
    const present = Object.hasOwn(value, key);
    if (!present) {
      // Обязательность проверяется только при создании.
      if (!partial && CREATE_FIELDS.includes(key)) details[key] = 'Поле обязательно.';
      continue;
    }

    const raw = value[key];
    if (key === 'title') {
      if (typeof raw !== 'string') {
        details.title = 'Название должно быть строкой.';
      } else {
        const title = raw.trim();
        if (title.length < 1 || title.length > TITLE_MAX_LENGTH) {
          details.title = `Название должно содержать от 1 до ${TITLE_MAX_LENGTH} символов.`;
        } else {
          result.title = title;
        }
      }
    } else if (key === 'priority') {
      if (typeof raw !== 'string' || !PRIORITIES.has(raw)) {
        details.priority = 'Приоритет должен быть low, medium или high.';
      } else {
        result.priority = raw;
      }
    } else if (key === 'categoryId') {
      // В теле JSON нарушенные типы не приводятся: '2' отклоняется.
      if (!Number.isSafeInteger(raw) || raw <= 0) {
        details.categoryId = 'categoryId должен быть положительным целым числом.';
      } else if (!categoryIds?.has(raw)) {
        details.categoryId = 'Неизвестная категория.';
      } else {
        result.categoryId = raw;
      }
    } else if (key === 'completed') {
      if (typeof raw !== 'boolean') {
        details.completed = 'completed должен быть boolean.';
      } else {
        result.completed = raw;
      }
    }
  }

  // PATCH: нужно хотя бы одно допустимое поле.
  if (partial && Object.keys(details).length === 0 && Object.keys(result).length === 0) {
    details.body = 'Нужно передать хотя бы одно поле для изменения.';
  }

  if (Object.keys(details).length > 0) throw validationError(details);
  return result;
}
