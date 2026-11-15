const ALLOWED_PRIORITIES = new Set(["low", "medium", "high"]);
const TITLE_MAX_LENGTH = 100;

function isValidId(id) {
  return typeof id === "number" && Number.isSafeInteger(id) && id > 0;
}

// Значения формы приходят строками. Преобразование выполняется явно через Number;
// пустая строка не превращается в 0, а "4abc" не превращается в 4.
function parseId(raw) {
  if (typeof raw === "number") {
    return raw;
  }
  if (typeof raw !== "string") {
    return NaN;
  }
  const trimmed = raw.trim();
  if (trimmed === "") {
    return NaN;
  }
  return Number(trimmed);
}

// Чистая проверка данных формы. DOM и показ сообщений выполняются в main.js.
// draft: { id, title, priority }; editingId: null либо id редактируемой задачи.
export function validateTaskDraft(draft, tasks, editingId = null) {
  const errors = {};
  let id;

  if (editingId === null) {
    id = parseId(draft.id);
    if (!isValidId(id)) {
      errors.id = "Идентификатор должен быть положительным целым числом.";
    } else if (tasks.some((task) => task.id === id)) {
      errors.id = "Задача с таким идентификатором уже существует.";
    }
  } else {
    // В режиме редактирования id берётся из editingId, а не из поля формы.
    id = editingId;
    if (!isValidId(id) || !tasks.some((task) => task.id === id)) {
      errors.id = "Редактируемая задача не найдена.";
    }
  }

  let title = "";
  if (typeof draft.title !== "string") {
    errors.title = "Название должно быть строкой.";
  } else {
    title = draft.title.trim();
    if (title.length < 1 || title.length > TITLE_MAX_LENGTH) {
      errors.title = `Название должно содержать от 1 до ${TITLE_MAX_LENGTH} символов.`;
    }
  }

  if (typeof draft.priority !== "string" || !ALLOWED_PRIORITIES.has(draft.priority)) {
    errors.priority = "Выберите приоритет: низкий, средний или высокий.";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, value: { id, title, priority: draft.priority } };
}
