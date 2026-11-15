const ALLOWED_PRIORITIES = new Set(["low", "medium", "high"]);
const TITLE_MAX_LENGTH = 100;

// Значение select приходит строкой; число получается явным преобразованием.
function parseCategoryId(raw) {
  if (typeof raw === "number") return raw;
  if (typeof raw !== "string" || raw.trim() === "") return NaN;
  return Number(raw.trim());
}

// Возвращает { valid, value, errors }.
// value содержит нормализованные title, priority и числовой categoryId.
export function validateTaskDraft(draft, categories) {
  const source = draft !== null && typeof draft === "object" ? draft : {};
  const knownCategories = Array.isArray(categories) ? categories : [];
  const errors = {};

  let title = "";
  if (typeof source.title !== "string") {
    errors.title = "Название должно быть строкой.";
  } else {
    title = source.title.trim();
    if (title.length < 1 || title.length > TITLE_MAX_LENGTH) {
      errors.title = `Название должно содержать от 1 до ${TITLE_MAX_LENGTH} символов.`;
    }
  }

  if (typeof source.priority !== "string" || !ALLOWED_PRIORITIES.has(source.priority)) {
    errors.priority = "Выберите приоритет: низкий, средний или высокий.";
  }

  const categoryId = parseCategoryId(source.categoryId);
  if (
    !Number.isSafeInteger(categoryId)
    || categoryId <= 0
    || !knownCategories.some((category) => category.id === categoryId)
  ) {
    errors.categoryId = "Выберите существующую категорию.";
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, value: null, errors };
  }
  return {
    valid: true,
    value: { title, priority: source.priority, categoryId },
    errors: {},
  };
}
