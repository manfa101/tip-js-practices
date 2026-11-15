import { useState } from 'react';
import { tasks as initialTasks, categories } from './data.js';
import { createInitialFilters } from './variant.js';
import { addTask, getTaskStats, removeTask, selectTasks, toggleTask, updateTask } from './domain/task-service.js';
import TaskForm from './components/TaskForm.jsx';
import TaskFilters from './components/TaskFilters.jsx';
import TaskList from './components/TaskList.jsx';
import TaskStats from './components/TaskStats.jsx';

// Для учебных локальных id: максимум полного массива плюс 1 (для пустого массива — 1).
function nextId(tasks) {
  return tasks.reduce((max, task) => Math.max(max, task.id), 0) + 1;
}

export default function App() {
  const [tasks, setTasks] = useState(() => initialTasks.map(task => ({ ...task })));
  const [filters, setFilters] = useState(createInitialFilters);
  const [editingId, setEditingId] = useState(null);
  const [notice, setNotice] = useState('');

  // Производные данные вычисляются при рендере и не хранятся в отдельном состоянии.
  const visibleTasks = selectTasks(tasks, filters);
  const stats = getTaskStats(tasks);
  const editingTask = editingId === null ? null : tasks.find(task => task.id === editingId) ?? null;

  function handleToggle(id) {
    setTasks(previous => toggleTask(previous, id));
    setNotice('Статус задачи изменён.');
  }

  function handleDelete(id) {
    const task = tasks.find(item => item.id === id);
    if (!task) return;
    // Подтверждение выполняется до обновления состояния; при отказе ничего не меняется.
    if (!window.confirm(`Удалить задачу «${task.title}»?`)) return;
    setTasks(previous => removeTask(previous, id));
    if (editingId === id) setEditingId(null);
    setNotice('Задача удалена.');
  }

  function handleEdit(id) {
    if (!tasks.some(task => task.id === id)) return;
    setEditingId(id);
    setNotice('');
  }

  // Синхронный контракт: true — сохранено, false — сохранение не состоялось.
  function handleSave(value) {
    if (editingId !== null) {
      if (!tasks.some(task => task.id === editingId)) return false;
      setTasks(previous => updateTask(previous, editingId, value));
      setEditingId(null);
      setNotice('Изменения сохранены.');
      return true;
    }
    setTasks(previous => addTask(previous, value, nextId(previous)));
    setNotice('Задача добавлена.');
    return true;
  }

  return (
    <main>
      <h1>Задачи на React</h1>
      <p>ПР7: данные в памяти. Обновление страницы восстанавливает исходный набор.</p>
      <p role="status">{notice}</p>
      <TaskStats stats={stats} />
      <TaskFilters filters={filters} categories={categories} onChange={setFilters} />
      <TaskForm
        key={editingId ?? 'new'}
        categories={categories}
        initialTask={editingTask}
        onSave={handleSave}
        onCancel={() => setEditingId(null)}
      />
      <TaskList
        tasks={visibleTasks}
        categories={categories}
        onToggle={handleToggle}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </main>
  );
}
