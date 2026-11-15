// Модуль работы со списком задач. Чистые функции: входные данные не изменяются.
// Для предусмотренных ошибок возвращается { ok: false, error: "..." }.

const PRIORITIES = ["low", "medium", "high"];
const TITLE_MAX_LENGTH = 100;

function isValidId(id) {
  return typeof id === "number" && Number.isSafeInteger(id) && id > 0;
}

function validateTitle(title) {
  if (typeof title !== "string") {
    return { ok: false, error: "Название должно быть строкой" };
  }
  const trimmed = title.trim();
  if (trimmed.length < 1 || trimmed.length > TITLE_MAX_LENGTH) {
    return { ok: false, error: `Название должно содержать от 1 до ${TITLE_MAX_LENGTH} символов` };
  }
  return { ok: true, value: trimmed };
}

function validatePriority(priority) {
  if (typeof priority !== "string" || !PRIORITIES.includes(priority)) {
    return { ok: false, error: "Приоритет должен быть low, medium или high" };
  }
  return { ok: true, value: priority };
}

export function createTask(id, title, priority = "medium") {
  if (!isValidId(id)) {
    return { ok: false, error: "id должен быть положительным безопасным целым числом" };
  }
  const titleResult = validateTitle(title);
  if (!titleResult.ok) {
    return titleResult;
  }
  const priorityResult = validatePriority(priority);
  if (!priorityResult.ok) {
    return priorityResult;
  }
  return {
    ok: true,
    task: { id, title: titleResult.value, completed: false, priority: priorityResult.value },
  };
}

export function findTaskById(tasks, id) {
  return tasks.find((task) => task.id === id);
}

export function getPendingTasks(tasks) {
  return tasks.filter((task) => task.completed === false);
}

export function getTaskTitles(tasks) {
  return tasks.map((task) => task.title);
}

export function getTaskStats(tasks) {
  const total = tasks.length;
  const completed = tasks.filter((task) => task.completed === true).length;
  const pending = total - completed;
  const progress = total > 0 ? (completed / total) * 100 : 0;
  return { total, completed, pending, progress };
}

export function addTask(tasks, id, title, priority = "medium") {
  const created = createTask(id, title, priority);
  if (!created.ok) {
    return created;
  }
  if (tasks.some((task) => task.id === created.task.id)) {
    return { ok: false, error: `Задача с id ${created.task.id} уже существует` };
  }
  return { ok: true, tasks: [...tasks, created.task] };
}

export function setTaskCompleted(tasks, id, completed) {
  if (!isValidId(id)) {
    return { ok: false, error: "id должен быть положительным безопасным целым числом" };
  }
  if (typeof completed !== "boolean") {
    return { ok: false, error: "completed должен быть true или false" };
  }
  if (findTaskById(tasks, id) === undefined) {
    return { ok: false, error: `Задача с id ${id} не найдена` };
  }
  return {
    ok: true,
    tasks: tasks.map((task) => (task.id === id ? { ...task, completed } : task)),
  };
}

export function renameTask(tasks, id, title) {
  if (!isValidId(id)) {
    return { ok: false, error: "id должен быть положительным безопасным целым числом" };
  }
  const titleResult = validateTitle(title);
  if (!titleResult.ok) {
    return titleResult;
  }
  if (findTaskById(tasks, id) === undefined) {
    return { ok: false, error: `Задача с id ${id} не найдена` };
  }
  return {
    ok: true,
    tasks: tasks.map((task) => (task.id === id ? { ...task, title: titleResult.value } : task)),
  };
}

export function removeTask(tasks, id) {
  if (!isValidId(id)) {
    return { ok: false, error: "id должен быть положительным безопасным целым числом" };
  }
  if (findTaskById(tasks, id) === undefined) {
    return { ok: false, error: `Задача с id ${id} не найдена` };
  }
  return { ok: true, tasks: tasks.filter((task) => task.id !== id) };
}
