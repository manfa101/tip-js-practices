// Чистые функции: без React, DOM, сети, случайных значений и изменения аргументов.
// Точные контракты и допустимые входы приведены в методичке.
const PRIORITIES = new Set(['low', 'medium', 'high']);
const TITLE_MAX_LENGTH = 100;

// Значение select приходит строкой. Принимаются только целые числа, записанные цифрами:
// '2x', '' и дробные значения отклоняются (parseInt для этого не подходит).
function parseCategoryId(raw) {
  if (typeof raw === 'number') return raw;
  if (typeof raw !== 'string') return NaN;
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return NaN;
  return Number(trimmed);
}

export function validateTaskDraft(draft, categories) {
  const source = draft !== null && typeof draft === 'object' ? draft : {};
  const known = Array.isArray(categories) ? categories : [];
  const errors = {};

  let title = '';
  if (typeof source.title !== 'string') {
    errors.title = 'Название должно быть строкой.';
  } else {
    title = source.title.trim();
    if (title.length < 1 || title.length > TITLE_MAX_LENGTH) {
      errors.title = `Название должно содержать от 1 до ${TITLE_MAX_LENGTH} символов.`;
    }
  }

  if (typeof source.priority !== 'string' || !PRIORITIES.has(source.priority)) {
    errors.priority = 'Выберите приоритет: низкий, средний или высокий.';
  }

  const categoryId = parseCategoryId(source.categoryId);
  if (!Number.isSafeInteger(categoryId) || !known.some(category => category.id === categoryId)) {
    errors.categoryId = 'Выберите существующую категорию.';
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, value: null, errors };
  }
  return { valid: true, value: { title, priority: source.priority, categoryId }, errors: {} };
}

export function selectTasks(tasks, filters) {
  const query = (filters.q ?? '').trim().toLowerCase();
  return tasks.filter(task => {
    if (query !== '' && !task.title.toLowerCase().includes(query)) return false;
    if (filters.completed === 'true' && task.completed !== true) return false;
    if (filters.completed === 'false' && task.completed !== false) return false;
    if (filters.priority && task.priority !== filters.priority) return false;
    if (filters.categoryId && task.categoryId !== Number(filters.categoryId)) return false;
    return true;
  });
}

export function getTaskStats(tasks) {
  const total = tasks.length;
  const completed = tasks.filter(task => task.completed).length;
  return { total, completed, active: total - completed };
}

export function addTask(tasks, value, id) {
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new RangeError('id должен быть положительным целым числом.');
  }
  if (tasks.some(task => task.id === id)) {
    throw new RangeError(`Задача с id ${id} уже существует.`);
  }
  return [
    ...tasks,
    {
      id,
      title: value.title,
      priority: value.priority,
      categoryId: value.categoryId,
      completed: false,
    },
  ];
}

// Для неизвестного id возвращается исходный массив (та же ссылка), состояние не меняется.
export function updateTask(tasks, id, value) {
  if (!tasks.some(task => task.id === id)) return tasks;
  return tasks.map(task => (task.id === id
    ? { ...task, title: value.title, priority: value.priority, categoryId: value.categoryId }
    : task));
}

export function toggleTask(tasks, id) {
  if (!tasks.some(task => task.id === id)) return tasks;
  return tasks.map(task => (task.id === id ? { ...task, completed: !task.completed } : task));
}

export function removeTask(tasks, id) {
  if (!tasks.some(task => task.id === id)) return tasks;
  return tasks.filter(task => task.id !== id);
}
