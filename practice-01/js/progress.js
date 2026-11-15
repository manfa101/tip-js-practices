"use strict";

const totalTasks = 10;
const completedTasks = 7;

function getProgressReport(total, completed) {
  if (typeof total !== "number" || typeof completed !== "number") {
    return "Ошибка: количество задач должно быть числом, строки не преобразуются";
  }
  if (!Number.isInteger(total) || !Number.isInteger(completed)) {
    return "Ошибка: количество задач должно быть целым числом";
  }
  if (total < 0 || completed < 0) {
    return "Ошибка: количество задач не может быть отрицательным";
  }
  if (total > 1000) {
    return "Ошибка: задач не может быть больше 1000";
  }
  if (completed > total) {
    return "Ошибка: выполнено больше, чем всего задач";
  }
  if (total === 0) {
    return "Задач пока нет";
  }

  const remaining = total - completed;
  const percent = ((completed / total) * 100).toFixed(1);

  let status;
  if (completed === 0) {
    status = "Не начато";
  } else if (completed === total) {
    status = "Завершено";
  } else {
    status = "В работе";
  }

  return [
    `Всего задач: ${total}`,
    `Выполнено: ${completed}`,
    `Осталось: ${remaining}`,
    `Прогресс: ${percent}%`,
    `Статус: ${status}`,
  ].join("\n");
}

console.log(getProgressReport(totalTasks, completedTasks));
