const PRIORITY_LABELS = Object.freeze({
  low: "Низкий",
  medium: "Средний",
  high: "Высокий",
});

function createButton(action, label) {
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.action = action;
  const text = document.createElement("span");
  text.className = "action-label";
  text.textContent = label;
  button.append(text);
  return button;
}

// Данные задачи приходят с сервера и считаются недоверенным текстом,
// поэтому все значения добавляются только через textContent.
export function createTaskElement(task, category) {
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

  const categoryNode = document.createElement("span");
  categoryNode.className = "task-category";
  categoryNode.textContent = category?.name ?? "Без категории";

  const actions = document.createElement("div");
  actions.className = "task-actions";
  actions.append(
    createButton("toggle", task.completed ? "Вернуть в работу" : "Выполнена"),
    createButton("edit", "Изменить"),
    createButton("delete", "Удалить"),
  );

  card.append(title, status, priority, categoryNode, actions);
  return card;
}

export function renderTaskList(list, tasks, categories) {
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const cards = tasks.map((task) => createTaskElement(task, categoryById.get(task.categoryId)));
  list.replaceChildren(...cards);
}
