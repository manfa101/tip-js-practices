import { ApiError } from "./api-client.js";

const ALLOWED_PRIORITIES = new Set(["low", "medium", "high"]);
const ALLOWED_FILTERS = new Set(["completed", "priority", "categoryId", "q"]);

function invalidResponse(message) {
  return new ApiError(message, { kind: "invalid-response" });
}

function isPositiveSafeInteger(value) {
  return Number.isSafeInteger(value) && value > 0;
}

function isTask(value) {
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

function isCategory(value) {
  return Boolean(
    value
    && typeof value === "object"
    && isPositiveSafeInteger(value.id)
    && typeof value.name === "string"
    && value.name.trim().length >= 1
    && value.name.trim().length <= 100,
  );
}

// Проверяет фильтры до запроса и возвращает новый объект только с допустимыми значениями.
function normalizeFilters(filters) {
  if (filters === null || typeof filters !== "object" || Array.isArray(filters)) {
    throw new TypeError("Фильтры должны быть обычным объектом.");
  }
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

// client — объект, созданный createApiClient.
// Контракт результата:
// getTasks(filters) -> Promise<{ tasks, meta }>
// getTaskById(id) -> Promise<task>
// getCategories() -> Promise<category[]>
// loadInitialData(filters) -> Promise<{ tasks, categories, meta }>
export function createTaskApi(client) {
  if (client === null || typeof client !== "object" || typeof client.requestJson !== "function") {
    throw new TypeError("client должен содержать метод requestJson.");
  }

  async function getTasks(filters = {}) {
    const query = normalizeFilters(filters);
    const payload = await client.requestJson("/tasks", { query });
    const { data, meta } = validateCollection(payload, isTask, "задач");
    return { tasks: data, meta };
  }

  async function getTaskById(id) {
    if (!isPositiveSafeInteger(id)) {
      throw new TypeError("id должен быть положительным целым числом.");
    }
    const payload = await client.requestJson(`/tasks/${id}`);
    if (payload === null || typeof payload !== "object" || !isTask(payload.data)) {
      throw invalidResponse("Ответ для задачи не соответствует схеме.");
    }
    return payload.data;
  }

  async function getCategories() {
    const payload = await client.requestJson("/categories");
    return validateCollection(payload, isCategory, "категорий").data;
  }

  async function loadInitialData(filters = {}) {
    // Оба запроса начинаются до общего await, поэтому выполняются параллельно.
    const tasksPromise = getTasks(filters);
    const categoriesPromise = getCategories();
    const [tasksResult, categories] = await Promise.all([tasksPromise, categoriesPromise]);
    return { tasks: tasksResult.tasks, categories, meta: tasksResult.meta };
  }

  return { getTasks, getTaskById, getCategories, loadInitialData };
}
