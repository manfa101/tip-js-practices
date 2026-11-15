import { getTaskStats } from "./task-service.js";

const PRIORITY_LABELS = {
  low: "Низкий",
  medium: "Средний",
  high: "Высокий",
};

// Создаёт кнопку действия с вложенной подписью. Обработчики здесь не назначаются.
function createActionButton(action, label, pressed) {
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.action = action;
  if (pressed !== undefined) {
    button.setAttribute("aria-pressed", String(pressed));
  }
  const text = document.createElement("span");
  text.className = "action-label";
  text.textContent = label;
  button.append(text);
  return button;
}

// Здесь создаётся DOM, но не изменяется состояние приложения.
// Контракт карточки, селекторы и тексты описаны в методичке.
export function createTaskElement(task) {
  const card = document.createElement("li");
  card.className = "task-card";
  card.classList.toggle("is-completed", task.completed === true);
  card.dataset.taskId = String(task.id);

  const title = document.createElement("h3");
  title.className = "task-title";
  title.textContent = task.title;

  const status = document.createElement("span");
  status.className = "task-status";
  status.textContent = task.completed ? "Выполнена" : "В работе";

  const priority = document.createElement("span");
  priority.className = "task-priority";
  priority.textContent = PRIORITY_LABELS[task.priority] ?? task.priority;

  const actions = document.createElement("div");
  actions.className = "task-actions";
  actions.append(
    createActionButton("toggle", "Выполнена", task.completed === true),
    createActionButton("edit", "Изменить"),
    createActionButton("delete", "Удалить"),
  );

  card.append(title, status, priority, actions);
  return card;
}

export function renderTaskList(listElement, tasks) {
  // Сам listElement сохраняется: на нём находится делегированный обработчик.
  const cards = tasks.map((task) => createTaskElement(task));
  listElement.replaceChildren(...cards);
}

export function renderSummary(summaryElement, tasks, visibleCount) {
  // tasks — весь текущий массив, visibleCount — длина отфильтрованного списка.
  const stats = getTaskStats(tasks);
  const values = {
    total: String(stats.total),
    completed: String(stats.completed),
    pending: String(stats.pending),
    progress: `${stats.progress.toFixed(1)}%`,
    visible: String(visibleCount),
  };
  for (const [name, value] of Object.entries(values)) {
    const node = summaryElement.querySelector(`[data-stat="${name}"]`);
    if (node) {
      node.textContent = value;
    }
  }
}

export function renderEmptyState(messageElement, total, visibleCount) {
  if (visibleCount > 0) {
    messageElement.textContent = "";
    messageElement.hidden = true;
    return;
  }
  messageElement.textContent =
    total === 0 ? "Список задач пуст." : "Нет задач по выбранному фильтру.";
  messageElement.hidden = false;
}
