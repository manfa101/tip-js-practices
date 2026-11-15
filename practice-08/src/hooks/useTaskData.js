import { useCallback, useEffect, useRef, useState } from 'react';

// Основное задание ПР8: синхронизация React-состояния с API.
// api передаётся зависимостью, поэтому хук проверяется без настоящей сети.
export function useTaskData({ api, filters }) {
  const [snapshot, setSnapshot] = useState({ tasks: [], categories: [], meta: { total: 0 } });
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [mutationError, setMutationError] = useState(null);
  const [pending, setPending] = useState(false);
  // Счётчик обновлений: его изменение запускает новую загрузку (refresh и успешная мутация).
  const [revision, setRevision] = useState(0);
  // Признак монтирования восстанавливается в setup, поэтому хук работает в StrictMode.
  const mountedRef = useRef(false);
  // Контроллер активной мутации: служит и блокировкой повторного вызова, и способом отмены.
  const mutationRef = useRef(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // При размонтировании отменяется текущая запись; чтение отменяет собственный cleanup.
      mutationRef.current?.abort();
    };
  }, []);

  // Загрузка: выполняется при смене фильтров, refresh и после успешной мутации.
  const { q, completed, priority, categoryId } = filters;
  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    setStatus('loading');
    setError(null);
    // Старый снимок сохраняется до прихода нового результата.
    api
      .loadInitialData({ q, completed, priority, categoryId }, { signal: controller.signal })
      .then(data => {
        if (!active) return;
        setSnapshot(data);
        setStatus('ready');
      })
      .catch(loadError => {
        // Запоздавшая ошибка устаревшего или отменённого запроса состояние не меняет.
        if (!active) return;
        setError(loadError);
        setStatus('error');
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [api, q, completed, priority, categoryId, revision]);

  const refresh = useCallback(() => {
    setRevision(previous => previous + 1);
  }, []);

  // Общая схема изменяющей операции. Возвращает true только после подтверждённого успеха API.
  const mutate = useCallback(async operation => {
    if (!mountedRef.current || mutationRef.current !== null) return false;

    const controller = new AbortController();
    // Ссылка сохраняется синхронно, до первого await: это блокирует второй вызов.
    mutationRef.current = controller;
    setPending(true);
    setMutationError(null);
    try {
      await operation({ signal: controller.signal });
      if (!mountedRef.current || controller.signal.aborted) return false;
      // Новый GET выполнит эффект с актуальными фильтрами.
      setRevision(previous => previous + 1);
      return true;
    } catch (operationError) {
      if (!mountedRef.current || controller.signal.aborted) return false;
      setMutationError(operationError);
      return false;
    } finally {
      // Освобождается только контроллер своей операции.
      if (mutationRef.current === controller) mutationRef.current = null;
      if (mountedRef.current) setPending(false);
    }
  }, []);

  const saveTask = useCallback(
    (id, value) => mutate(options => (
      id === null ? api.createTask(value, options) : api.updateTask(id, value, options)
    )),
    [api, mutate],
  );
  const toggleTask = useCallback(
    task => mutate(options => api.setTaskCompleted(task.id, !task.completed, options)),
    [api, mutate],
  );
  const deleteTask = useCallback(id => mutate(options => api.deleteTask(id, options)), [api, mutate]);
  const resetData = useCallback(() => mutate(options => api.resetDemoData(options)), [api, mutate]);

  return {
    snapshot, status, error, mutationError, pending,
    refresh, saveTask, toggleTask, deleteTask, resetData,
  };
}
