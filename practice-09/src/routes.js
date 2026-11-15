import { Router } from 'express';
import { ApiError } from './errors.js';
import { parseFilters, parsePositiveId } from './validation.js';

export function createRouter(store) {
  const router = Router({ caseSensitive: true });
  router.get('/health', (req, res) => res.json({ data: { status: 'ok' } }));

  router.get('/categories', (req, res) => {
    const data = store.listCategories();
    res.json({ data, meta: { total: data.length } });
  });

  router.get('/tasks', (req, res) => {
    // Query разбирается из исходного URL; фильтры проверяются до обращения к хранилищу.
    const { searchParams } = new URL(req.originalUrl, 'http://localhost');
    const filters = parseFilters(searchParams);
    const data = store.listTasks(filters);
    // meta.total — размер выборки, а не всего хранилища.
    res.json({ data, meta: { total: data.length, filters } });
  });

  router.get('/tasks/:id', (req, res) => {
    // Express уже декодировал :id; повторный decodeURIComponent не нужен.
    const id = parsePositiveId(req.params.id);
    if (id === null) {
      throw new ApiError(400, 'INVALID_ID', 'Идентификатор задачи должен быть положительным целым числом.');
    }
    const task = store.getTask(id);
    if (task === null) {
      throw new ApiError(404, 'TASK_NOT_FOUND', 'Задача не найдена.', { id });
    }
    res.json({ data: task });
  });

  // Остальные методы на известных путях: 405 с заголовком Allow.
  // OPTIONS обработан приложением, HEAD обслуживается GET-маршрутами.
  router.all(['/health', '/categories', '/tasks', '/tasks/:id'], (req, res, next) => {
    res.set('Allow', 'GET, HEAD, OPTIONS');
    next(new ApiError(405, 'METHOD_NOT_ALLOWED', `Метод ${req.method} не поддерживается для этого пути.`));
  });

  return router;
}
