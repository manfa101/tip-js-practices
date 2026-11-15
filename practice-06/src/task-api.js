import { ApiError } from "./api-client.js";

const ALLOWED_PRIORITIES = new Set(["low", "medium", "high"]);
const ALLOWED_FILTERS = new Set(["completed", "priority", "categoryId", "q"]);

function invalidResponse(message) {
  return new ApiError(message, { kind: "invalid-response" });
}

function isPositiveSafeInteger(value) {
  return Number.isSafeInteger(value) && value > 0;
}

export function isTask(value) {
  return Boolean(
    value
    && typeof value === "object"
    && isPositiveSafeInteger(value.id)
    && typeof value.title === "string"
    && value.title.trim().length >= 1
    && value.title.trim().length <= 100
    && typeof value.completed === "boolean"
    && ALLOWED_PRIORITIES.has(value.priority)
    && isPositiveSafeInteger(value.categoryId),
  );
}

export function isCategory(value) {
  return Boolean(
    value
    && typeof value === "object"
    && isPositiveSafeInteger(value.id)
    && typeof value.name === "string"
    && value.name.trim().length >= 1
    && value.name.trim().length <= 100,
  );
}

function requireId(id) {
  if (!isPositiveSafeInteger(id)) {
    throw new TypeError("id должен быть положительным целым числом.");
  }
}

function requireObject(value, name) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${name} должен быть обычным объектом.`);
  }
}

// Проверяет фильтры до запроса и возвращает новый объект только с допустимыми значениями.
function normalizeFilters(filters) {
  requireObject(filters, "Фильтры");
  const result = {};
  for (const [key, value] of Object.entries(filters)) {
    if (!ALLOWED_FILTERS.has(key)) {
      throw new TypeError(`Неизвестный фильтр: ${key}.`);
    }
    if (value === undefined) continue;
    if (key === "completed") {
      if (typeof value !== "boolean") throw new TypeError("completed должен быть boolean.");
      result.completed = value;
    } else if (key === "priority") {
      if (typeof value !== "string" || !ALLOWED_PRIORITIES.has(value)) {
        throw new TypeError("priority должен быть low, medium или high.");
      }
      result.priority = value;
    } else if (key === "categoryId") {
      if (!isPositiveSafeInteger(value)) {
        throw new TypeError("categoryId должен быть положительным целым числом.");
      }
      result.categoryId = value;
    } else if (key === "q") {
      if (typeof value !== "string") throw new TypeError("q должен быть строкой.");
      const trimmed = value.trim();
      if (trimmed.length > 100) throw new TypeError("q не должен быть длиннее 100 символов.");
      if (trimmed !== "") result.q = trimmed;
    }
  }
  return result;
}

// Проверяет коллекцию: массив, схема элементов, уникальность id и meta.total.
function validateCollection(payload, isItem, label) {
  if (payload === null || typeof payload !== "object") {
    throw invalidResponse(`Ответ ${label} не является объектом.`);
  }
  const { data, meta } = payload;
  if (!Array.isArray(data)) {
    throw invalidResponse(`Поле data ответа ${label} должно быть массивом.`);
  }
  const ids = new Set();
  for (const item of data) {
    if (!isItem(item)) {
      throw invalidResponse(`Элемент коллекции ${label} не соответствует схеме.`);
    }
    if (ids.has(item.id)) {
      throw invalidResponse(`В коллекции ${label} повторяется id ${item.id}.`);
    }
    ids.add(item.id);
  }
  if (meta === null || typeof meta !== "object" || meta.total !== data.length) {
    throw invalidResponse(`meta.total не совпадает с длиной коллекции ${label}.`);
  }
  return { data, meta };
}

function parseTask(payload) {
  if (payload === null || typeof payload !== "object" || !isTask(payload.data)) {
    throw invalidResponse("Ответ для задачи не соответствует схеме.");
  }
  return payload.data;
}

// Методы результата:
// getTasks, getTaskById, getCategories, loadInitialData, createTask, updateTask,
// setTaskCompleted, deleteTask и resetDemoData.
// Последний аргумент каждого метода данных — { signal }.
export function createTaskApi(client) {
  if (client === null || typeof client !== "object" || typeof client.requestJson !== "function") {
    throw new TypeError("client должен содержать метод requestJson.");
  }

  // signal добавляется только при наличии, чтобы не передавать пустые значения.
  const withSignal = (options, extra = {}) => (
    options?.signal ? { ...extra, signal: options.signal } : extra
  );

  async function getTasks(filters = {}, options = {}) {
    const query = normalizeFilters(filters);
    const payload = await client.requestJson("/tasks", withSignal(options, { query }));
    const { data, meta } = validateCollection(payload, isTask, "задач");
    return { tasks: data, meta };
  }

  async function getTaskById(id, options = {}) {
    requireId(id);
    return parseTask(await client.requestJson(`/tasks/${id}`, withSignal(options)));
  }

  async function getCategories(options = {}) {
    const payload = await client.requestJson("/categories", withSignal(options));
    return validateCollection(payload, isCategory, "категорий").data;
  }

  async function loadInitialData(filters = {}, options = {}) {
    // Оба запроса начинаются до общего await, поэтому выполняются параллельно.
    const tasksPromise = getTasks(filters, options);
    const categoriesPromise = getCategories(options);
    const [tasksResult, categories] = await Promise.all([tasksPromise, categoriesPromise]);
    return { tasks: tasksResult.tasks, categories, meta: tasksResult.meta };
  }

  // Сервер назначает id и начальный completed: клиент отправляет только черновик.
  async function createTask(draft, options = {}) {
    requireObject(draft, "draft");
    const payload = await client.requestJson(
      "/tasks",
      withSignal(options, { method: "POST", body: { ...draft } }),
    );
    return parseTask(payload);
  }

  async function updateTask(id, changes, options = {}) {
    requireId(id);
    requireObject(changes, "changes");
    const payload = await client.requestJson(
      `/tasks/${id}`,
      withSignal(options, { method: "PATCH", body: { ...changes } }),
    );
    return parseTask(payload);
  }

  async function setTaskCompleted(id, completed, options = {}) {
    requireId(id);
    if (typeof completed !== "boolean") {
      throw new TypeError("completed должен быть boolean.");
    }
    const payload = await client.requestJson(
      `/tasks/${id}`,
      withSignal(options, { method: "PATCH", body: { completed } }),
    );
    return parseTask(payload);
  }

  async function deleteTask(id, options = {}) {
    requireId(id);
    const result = await client.requestJson(`/tasks/${id}`, withSignal(options, { method: "DELETE" }));
    // Ожидается ответ 204, преобразованный клиентом в null.
    if (result !== null) {
      throw invalidResponse("Ответ на удаление должен быть пустым (204).");
    }
    return null;
  }

  async function resetDemoData(options = {}) {
    const payload = await client.requestJson("/debug/reset", withSignal(options, { method: "POST" }));
    const data = payload?.data;
    if (
      data === null
      || typeof data !== "object"
      || data.reset !== true
      || !Number.isSafeInteger(data.total)
    ) {
      throw invalidResponse("Ответ на сброс данных не соответствует схеме.");
    }
    return data;
  }

  return {
    getTasks,
    getTaskById,
    getCategories,
    loadInitialData,
    createTask,
    updateTask,
    setTaskCompleted,
    deleteTask,
    resetDemoData,
  };
}
