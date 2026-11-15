// Общий контрольный набор. Для своего варианта ниже предусмотрен отдельный массив.
// Идентификатор задачи не совпадает с её индексом в массиве.
export const demoTasks = [
  { id: 1, title: "Изучить функции", completed: true, priority: "medium" },
  { id: 4, title: "Подготовить модель задач", completed: false, priority: "high" },
  { id: 7, title: "Проверить методы массивов", completed: false, priority: "low" },
  { id: 10, title: "Оформить README", completed: true, priority: "medium" },
];

// Индивидуальный вариант: номер в журнале 23, ((23 - 1) % 8) + 1 = 7.
// Тема: «Подготовка учебного релиза». K = 6: выполнены первые шесть задач, то есть все.
export const variantNumber = 7;
export const variantTasks = [
  { id: 11, title: "Собрать список изменений", completed: true, priority: "medium" },
  { id: 23, title: "Проверить сборку проекта", completed: true, priority: "high" },
  { id: 37, title: "Обновить инструкцию запуска", completed: true, priority: "low" },
  { id: 41, title: "Согласовать версию релиза", completed: true, priority: "medium" },
  { id: 58, title: "Подготовить заметки к выпуску", completed: true, priority: "low" },
  { id: 64, title: "Опубликовать учебный релиз", completed: true, priority: "high" },
];
