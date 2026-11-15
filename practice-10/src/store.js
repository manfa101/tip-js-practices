import { categories as seedCategories, tasks as seedTasks } from './data.js';
import { selectTasks, findTask } from './task-service.js';
const noFilters = { completed: null, priority: null, categoryId: null, q: '' };

export function createStore() {
  let tasks;
  let nextId;
  const categories = seedCategories.map(item => ({ ...item }));
  function reset() {
    tasks = seedTasks.map(item => ({ ...item }));
    nextId = Math.max(0, ...tasks.map(item => item.id)) + 1;
    return { reset: true, total: tasks.length };
  }
  reset();
  return {
    listTasks: (filters = noFilters) => selectTasks(tasks, filters).map(item => ({ ...item })),
    getTask: id => { const task = findTask(tasks, id); return task ? { ...task } : null; },
    listCategories: () => categories.map(item => ({ ...item })),
    reset,
    createTask(value) {
      // value уже проверен. Поля новой записи собираются явно; id и completed задаёт сервер.
      // Счётчик nextId только растёт: длина массива для id не используется.
      const task = {
        id: nextId,
        title: value.title,
        priority: value.priority,
        categoryId: value.categoryId,
        completed: false,
      };
      nextId += 1;
      tasks.push(task);
      return { ...task };
    },
    updateTask(id, changes) {
      const index = tasks.findIndex(item => item.id === id);
      if (index === -1) return null;
      // Применяются только разрешённые переданные поля; id сохраняется.
      const next = { ...tasks[index] };
      for (const key of ['title', 'priority', 'categoryId', 'completed']) {
        if (Object.hasOwn(changes, key)) next[key] = changes[key];
      }
      next.id = tasks[index].id;
      tasks[index] = next;
      return { ...next };
    },
    deleteTask(id) {
      const index = tasks.findIndex(item => item.id === id);
      if (index === -1) return false;
      tasks.splice(index, 1);
      // nextId после удаления не уменьшается.
      return true;
    },
  };
}
