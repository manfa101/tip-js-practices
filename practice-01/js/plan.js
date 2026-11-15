"use strict";

const totalTasks = 10;
const completedTasks = 7;
const dailyLimit = 3;

function getPlan(total, completed, limit) {
  if (typeof total !== "number" || typeof completed !== "number") {
    return ["Ошибка: количество задач должно быть числом"];
  }
  if (!Number.isInteger(total) || !Number.isInteger(completed)) {
    return ["Ошибка: количество задач должно быть целым числом"];
  }
  if (total < 0 || total > 1000 || completed < 0 || completed > total) {
    return ["Ошибка: некорректные значения задач"];
  }
  if (typeof limit !== "number" || !Number.isInteger(limit) || limit < 1 || limit > 1000) {
    return ["Ошибка: дневной лимит должен быть целым числом от 1 до 1000"];
  }

  const lines = [];
  let remaining = total - completed;
  lines.push(`Осталось задач: ${remaining}`);

  if (remaining === 0) {
    lines.push("Все задачи выполнены");
    lines.push("Потребуется дней: 0");
    return lines;
  }

  let day = 0;
  while (remaining > 0) {
    day += 1;
    const doneToday = Math.min(limit, remaining);
    remaining -= doneToday;
    lines.push(`День ${day}: выполнено ${doneToday}, осталось ${remaining}`);
  }
  lines.push(`Потребуется дней: ${day}`);
  return lines;
}

for (const line of getPlan(totalTasks, completedTasks, dailyLimit)) {
  console.log(line);
}
