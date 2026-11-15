import { ApiError } from './errors.js';

const ALLOWED_NAMES = new Set(['completed', 'priority', 'categoryId', 'q']);
const PRIORITIES = new Set(['low', 'medium', 'high']);
const MAX_QUERY_LENGTH = 100;

function invalidQuery(message, details) {
  return new ApiError(400, 'INVALID_QUERY', message, details);
}

// raw: строка; результат: безопасное положительное целое либо null.
// Запись должна целиком соответствовать /^[1-9]\d*$/: parseInt принял бы '4abc' как 4.
export function parsePositiveId(raw) {
  if (typeof raw !== 'string' || !/^[1-9]\d*$/.test(raw)) return null;
  const value = Number(raw);
  return Number.isSafeInteger(value) ? value : null;
}

// URLSearchParams -> { completed: boolean|null, priority: string|null,
// categoryId: number|null, q: string }. Ошибка: ApiError(400, 'INVALID_QUERY', ...).
// Неизвестные и повторяющиеся параметры запрещены.
export function parseFilters(searchParams) {
  // 1. Имена всех параметров.
  for (const name of new Set(searchParams.keys())) {
    if (!ALLOWED_NAMES.has(name)) {
      throw invalidQuery(`Неизвестный параметр запроса: ${name}.`, { parameter: name });
    }
    // 2. Повторения (даже с одинаковыми значениями) отклоняются.
    if (searchParams.getAll(name).length > 1) {
      throw invalidQuery(`Параметр ${name} указан несколько раз.`, { parameter: name });
    }
  }

  // 3. Значения. Отсутствие параметра (null) и пустое значение различаются.
  const filters = { completed: null, priority: null, categoryId: null, q: '' };

  if (searchParams.has('completed')) {
    const raw = searchParams.get('completed');
    if (raw === 'true') filters.completed = true;
    else if (raw === 'false') filters.completed = false;
    else throw invalidQuery('completed должен быть строкой true или false.', { parameter: 'completed' });
  }

  if (searchParams.has('priority')) {
    const raw = searchParams.get('priority');
    if (!PRIORITIES.has(raw)) {
      throw invalidQuery('priority должен быть low, medium или high.', { parameter: 'priority' });
    }
    filters.priority = raw;
  }

  if (searchParams.has('categoryId')) {
    const id = parsePositiveId(searchParams.get('categoryId'));
    if (id === null) {
      throw invalidQuery('categoryId должен быть положительным целым числом.', { parameter: 'categoryId' });
    }
    filters.categoryId = id;
  }

  if (searchParams.has('q')) {
    // Сначала обрезаются пробелы по краям, затем проверяется длина.
    const q = searchParams.get('q').trim();
    if (q.length > MAX_QUERY_LENGTH) {
      throw invalidQuery(`q не должен быть длиннее ${MAX_QUERY_LENGTH} символов.`, { parameter: 'q' });
    }
    filters.q = q;
  }

  // 4. Новый объект со всеми четырьмя полями.
  return filters;
}
