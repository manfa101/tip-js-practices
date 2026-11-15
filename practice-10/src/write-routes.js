import { ApiError } from './errors.js';
import { jsonBody } from './json-body.js';
import { requireTask } from './task-resource.js';
import { validateTaskInput } from './task-validation.js';

export function registerWriteRoutes(router, store) {
  const categoryIdSet = () => new Set(store.listCategories().map(category => category.id));

  router.post('/tasks', ...jsonBody, (req, res) => {
    const value = validateTaskInput(req.body, { partial: false, categoryIds: categoryIdSet() });
    const task = store.createTask(value);
    res.status(201).set('Location', `/api/tasks/${task.id}`).json({ data: task });
  });

  // Сначала requireTask (id и существование), затем разбор и проверка тела.
  router.patch('/tasks/:id', requireTask(store), ...jsonBody, (req, res) => {
    const changes = validateTaskInput(req.body, { partial: true, categoryIds: categoryIdSet() });
    const task = store.updateTask(req.task.id, changes);
    // Запись могла быть удалена, пока читалось тело: null означает 404, а не data: null.
    if (task === null) {
      throw new ApiError(404, 'TASK_NOT_FOUND', 'Задача не найдена.', { id: req.task.id });
    }
    res.json({ data: task });
  });

  router.delete('/tasks/:id', requireTask(store), (req, res) => {
    if (!store.deleteTask(req.task.id)) {
      throw new ApiError(404, 'TASK_NOT_FOUND', 'Задача не найдена.', { id: req.task.id });
    }
    // 204 без тела: JSON не отправляется.
    res.status(204).end();
  });
}
