import { ApiError } from "./api-client.js";
import { validateTaskDraft } from "./form-validation.js";

export function messageForError(error) {
  if (!(error instanceof ApiError)) return "Не удалось выполнить операцию.";
  if (error.kind === "timeout") return "Сервер не ответил вовремя. Попробуйте ещё раз.";
  if (error.kind === "network") return "Нет соединения с учебным API. Проверьте, запущен ли npm start.";
  if (error.kind === "invalid-response") return "Сервер вернул ответ неожиданного формата.";
  if (error.kind === "http" && error.status === 404) return "Запись уже отсутствует на сервере. Обновите список.";
  if (error.kind === "http") return error.message || `Сервер вернул ошибку ${error.status}.`;
  return "Не удалось выполнить операцию.";
}

// view — адаптер из dom-app.js. Контроллер не должен обращаться к document.
// Обязательные методы результата:
// start, applyFilters, refresh, submit, beginEdit, cancelEdit,
// toggleTask, deleteTask, resetData и destroy.
const API_METHODS = [
  "loadInitialData",
  "getTasks",
  "createTask",
  "updateTask",
  "setTaskCompleted",
  "deleteTask",
  "resetDemoData",
];
const VIEW_METHODS = [
  "setListState",
  "setTasks",
  "setCategories",
  "setTotal",
  "setFormTask",
  "showFormErrors",
  "setMutationPending",
  "notify",
];

function hasMethods(target, names) {
  return target !== null
    && typeof target === "object"
    && names.every((name) => typeof target[name] === "function");
}

export function createAppController({ api, view, validateDraft = validateTaskDraft } = {}) {
  if (!hasMethods(api, API_METHODS)) {
    throw new TypeError("api должен содержать методы предметного API задач.");
  }
  if (!hasMethods(view, VIEW_METHODS)) {
    throw new TypeError("view должен содержать методы интерфейса.");
  }
  if (typeof validateDraft !== "function") {
    throw new TypeError("validateDraft должен быть функцией.");
  }

  // Состояние контроллера: снимок последнего ответа сервера и параметры запроса.
  let tasks = [];
  let categories = [];
  let categoriesLoaded = false;
  let filters = {};
  let editingId = null;
  let activeLoad = null;
  let loadNumber = 0;
  let mutating = false;

  // Загрузка списка. Новая загрузка отменяет предыдущую, а результат применяется
  // только если номер загрузки остался последним (защита от гонки запросов).
  async function load() {
    const number = loadNumber + 1;
    loadNumber = number;
    activeLoad?.abort();
    const controller = new AbortController();
    activeLoad = controller;
    const options = { signal: controller.signal };

    view.setListState("loading");
    try {
      let result;
      if (categoriesLoaded) {
        result = await api.getTasks(filters, options);
      } else {
        // Пока категории не получены, повтор снова выполняет начальную загрузку.
        const initial = await api.loadInitialData(filters, options);
        if (number !== loadNumber) return;
        categories = initial.categories;
        categoriesLoaded = true;
        view.setCategories(categories);
        result = { tasks: initial.tasks, meta: initial.meta };
      }
      if (number !== loadNumber) return;

      tasks = result.tasks;
      view.setTasks(tasks, categories);
      view.setTotal(result.meta.total);
      view.setListState(tasks.length === 0 ? "empty" : "ready");
    } catch (error) {
      // Устаревший запрос и отмена — ожидаемое управление потоком, не ошибка.
      if (number !== loadNumber) return;
      if (error instanceof ApiError && error.kind === "aborted") return;
      view.setListState("error", messageForError(error));
    } finally {
      if (activeLoad === controller) activeLoad = null;
    }
  }

  // Общая схема изменяющей операции: блокировка, запрос, повторный GET, разблокировка.
  async function mutate(action, successMessage, onSuccess) {
    if (mutating) return;
    mutating = true;
    view.setMutationPending(true);
    try {
      await action();
      if (onSuccess) onSuccess();
      view.notify(successMessage, "success");
      await load();
    } catch (error) {
      view.notify(messageForError(error), "error");
    } finally {
      mutating = false;
      view.setMutationPending(false);
    }
  }

  function leaveEditing() {
    editingId = null;
    view.setFormTask(null);
    view.showFormErrors({});
  }

  function findTask(id) {
    return tasks.find((task) => task.id === id);
  }

  return {
    async start(initialFilters = {}) {
      filters = { ...initialFilters };
      await load();
    },

    async applyFilters(nextFilters = {}) {
      filters = { ...nextFilters };
      await load();
    },

    async refresh() {
      await load();
    },

    async submit(draft) {
      const checked = validateDraft(draft, categories);
      if (!checked.valid) {
        view.showFormErrors(checked.errors);
        return;
      }
      view.showFormErrors({});
      const value = checked.value;
      if (editingId === null) {
        await mutate(() => api.createTask(value), "Задача создана.", leaveEditing);
      } else {
        const id = editingId;
        await mutate(() => api.updateTask(id, value), "Задача изменена.", leaveEditing);
      }
    },

    beginEdit(id) {
      const task = findTask(id);
      if (task === undefined) {
        view.notify("Задача не найдена. Обновите список.", "error");
        return;
      }
      editingId = id;
      view.showFormErrors({});
      view.setFormTask(task);
    },

    cancelEdit() {
      leaveEditing();
    },

    async toggleTask(id) {
      const task = findTask(id);
      if (task === undefined) {
        view.notify("Задача не найдена. Обновите список.", "error");
        return;
      }
      await mutate(() => api.setTaskCompleted(id, !task.completed), "Статус задачи изменён.");
    },

    async deleteTask(id) {
      await mutate(
        () => api.deleteTask(id),
        "Задача удалена.",
        () => {
          if (editingId === id) leaveEditing();
        },
      );
    },

    async resetData() {
      await mutate(() => api.resetDemoData(), "Исходные данные восстановлены.", leaveEditing);
    },

    destroy() {
      loadNumber += 1;
      activeLoad?.abort();
      activeLoad = null;
    },
  };
}
