export const STORAGE_VERSION = 1;

const PRIORITIES = new Set(["low", "medium", "high"]);
const TITLE_MAX_LENGTH = 100;

// Все функции принимают объект storage явно, чтобы их можно было проверить
// без обращения к глобальному window.localStorage.

function isValidTask(task) {
  if (task === null || typeof task !== "object") {
    return false;
  }
  if (typeof task.id !== "number" || !Number.isSafeInteger(task.id) || task.id <= 0) {
    return false;
  }
  if (typeof task.title !== "string") {
    return false;
  }
  const trimmed = task.title.trim();
  if (trimmed.length < 1 || trimmed.length > TITLE_MAX_LENGTH || trimmed !== task.title) {
    return false;
  }
  if (typeof task.completed !== "boolean") {
    return false;
  }
  return typeof task.priority === "string" && PRIORITIES.has(task.priority);
}

function copyTasks(tasks) {
  return tasks.map((task) => ({ ...task }));
}

// Проверяет весь массив целиком. Значение не исправляется и не нормализуется.
export function isValidTaskList(value) {
  if (!Array.isArray(value)) {
    return false;
  }
  const seen = new Set();
  for (const task of value) {
    if (!isValidTask(task) || seen.has(task.id)) {
      return false;
    }
    seen.add(task.id);
  }
  return true;
}

export function loadTasks(storage, key, fallbackTasks) {
  const fallback = (error) => ({
    ok: false,
    source: "fallback",
    tasks: copyTasks(fallbackTasks),
    error,
  });

  try {
    const raw = storage.getItem(key);
    if (raw === null) {
      return { ok: true, source: "initial", tasks: copyTasks(fallbackTasks) };
    }

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return fallback("Сохранённые данные повреждены (некорректный JSON). Используется исходный набор.");
    }

    if (parsed === null || typeof parsed !== "object" || parsed.version !== STORAGE_VERSION) {
      return fallback("Неподдерживаемая версия сохранённых данных. Используется исходный набор.");
    }
    if (!isValidTaskList(parsed.tasks)) {
      return fallback("Сохранённые задачи не соответствуют схеме. Используется исходный набор.");
    }
    return { ok: true, source: "storage", tasks: copyTasks(parsed.tasks) };
  } catch (error) {
    return fallback(`Не удалось прочитать localStorage: ${error.message}`);
  }
}

export function saveTasks(storage, key, tasks) {
  if (!isValidTaskList(tasks)) {
    return { ok: false, error: "Список задач не соответствует схеме и не был сохранён." };
  }
  try {
    storage.setItem(key, JSON.stringify({ version: STORAGE_VERSION, tasks }));
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: `Не удалось записать в localStorage: ${error.message}. После перезагрузки изменения могут быть потеряны.`,
    };
  }
}

export function removeSavedTasks(storage, key) {
  try {
    storage.removeItem(key);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: `Не удалось удалить сохранённые данные: ${error.message}` };
  }
}
