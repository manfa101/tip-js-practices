import { demoTasks, variantNumber, variantTasks } from "./data.js";
import {
  findTaskById,
  getPendingTasks,
  getTaskTitles,
  getTaskStats,
  addTask,
  setTaskCompleted,
  renameTask,
  removeTask,
} from "./task-service.js";

// Вывод сводки: вычисления выполняет task-service.js, здесь только форматирование.
function printStats(tasks) {
  const stats = getTaskStats(tasks);
  console.log(`Всего: ${stats.total}; выполнено: ${stats.completed}; осталось: ${stats.pending}`);
  if (stats.total === 0) {
    console.log("Задач пока нет");
  } else {
    console.log(`Прогресс: ${stats.progress.toFixed(1)}%`);
  }
}

// Применяет результат операции: при успехе возвращает новый массив,
// при ошибке выводит сообщение и оставляет состояние прежним.
function applyResult(current, label, result) {
  if (result.ok) {
    console.log(`${label}: успешно`);
    return result.tasks;
  }
  console.log(`${label}: отклонено. ${result.error}`);
  return current;
}

function printIds(label, tasks) {
  console.log(`${label}:`, tasks.map((task) => task.id));
}

// ---------- Общий сценарий на demoTasks ----------
console.log("=== Общий сценарий (demoTasks) ===");
const demoSnapshot = JSON.stringify(demoTasks);
let currentTasks = demoTasks;

console.log("\n1. Исходные данные");
console.table(currentTasks);
console.log("Названия:", getTaskTitles(currentTasks));
printIds("Невыполненные задачи (id)", getPendingTasks(currentTasks));
printStats(currentTasks);

console.log("\n2. Добавление задачи id 20");
currentTasks = applyResult(currentTasks, "Добавление", addTask(currentTasks, 20, "Добавить проверку", "high"));
printStats(currentTasks);

console.log("\n3. Завершение задачи id 4");
currentTasks = applyResult(currentTasks, "Смена статуса", setTaskCompleted(currentTasks, 4, true));
printStats(currentTasks);

console.log("\n4. Переименование задачи id 10");
currentTasks = applyResult(
  currentTasks,
  "Переименование",
  renameTask(currentTasks, 10, "Подготовить инструкцию запуска"),
);
printStats(currentTasks);

console.log("\n5. Удаление задачи id 7");
currentTasks = applyResult(currentTasks, "Удаление", removeTask(currentTasks, 7));
printStats(currentTasks);

console.log("\n6. Обработка ошибок (состояние не меняется)");
const before = currentTasks;
currentTasks = applyResult(currentTasks, "Добавление с повторяющимся id 4", addTask(currentTasks, 4, "Дубликат"));
currentTasks = applyResult(
  currentTasks,
  "Статус задачи 4 строкой \"true\"",
  setTaskCompleted(currentTasks, 4, "true"),
);
currentTasks = applyResult(currentTasks, "Удаление несуществующей задачи 777", removeTask(currentTasks, 777));
console.log("Состояние осталось тем же объектом:", currentTasks === before);

console.log("\n7. Итог");
console.table(currentTasks);
printIds("Итоговые id", currentTasks);
printIds("Невыполненные задачи (id)", getPendingTasks(currentTasks));
console.log("Задача id 10 найдена по id:", findTaskById(currentTasks, 10)?.title);
console.log("demoTasks не изменён:", JSON.stringify(demoTasks) === demoSnapshot);
console.log("demoTasks содержит записей:", demoTasks.length);

// ---------- Сценарий индивидуального варианта ----------
console.log(`\n=== Индивидуальный вариант ${variantNumber} (variantTasks) ===`);
const variantSnapshot = JSON.stringify(variantTasks);
let variantCurrent = variantTasks;

console.log("\nV1. Исходные данные");
console.table(variantCurrent);
printStats(variantCurrent);

console.log("\nV2. Добавление задачи id 80 с приоритетом high");
variantCurrent = applyResult(
  variantCurrent,
  "Добавление",
  addTask(variantCurrent, 80, "Проверить релиз на чистой машине", "high"),
);
printStats(variantCurrent);

console.log("\nV3. Установка completed = true для id 11");
variantCurrent = applyResult(variantCurrent, "Смена статуса", setTaskCompleted(variantCurrent, 11, true));
printStats(variantCurrent);

console.log("\nV4. Переименование задачи id 23");
variantCurrent = applyResult(
  variantCurrent,
  "Переименование",
  renameTask(variantCurrent, 23, "Проверить сборку проекта на тестовых данных"),
);
printStats(variantCurrent);

console.log("\nV5. Удаление задачи id 37");
variantCurrent = applyResult(variantCurrent, "Удаление", removeTask(variantCurrent, 37));
printStats(variantCurrent);

console.log("\nV6. Повторное добавление id 80 (должно быть отклонено)");
variantCurrent = applyResult(
  variantCurrent,
  "Повторное добавление",
  addTask(variantCurrent, 80, "Проверить релиз ещё раз", "high"),
);

console.log("\nV7. Итог");
console.table(variantCurrent);
printIds("Итоговые id", variantCurrent);
printStats(variantCurrent);
console.log("variantTasks не изменён:", JSON.stringify(variantTasks) === variantSnapshot);
