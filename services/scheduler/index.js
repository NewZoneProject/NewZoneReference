/**
 * Scheduler Microservice
 * Minimal task scheduler for NewZoneReference
 * Pure Node.js, no dependencies
 */

const TASKS = [];
const MAX_TASKS = 200;

export function addTask(interval_ms, callback_url, payload = null) {
  const id = "task-" + Math.random().toString(36).slice(2, 10);

  const task = {
    id,
    interval_ms,
    callback_url,
    payload,
    last_run: 0
  };

  TASKS.push(task);
  if (TASKS.length > MAX_TASKS) TASKS.shift();

  return task;
}

export function listTasks() {
  return TASKS;
}

export function removeTask(id) {
  const idx = TASKS.findIndex(t => t.id === id);
  if (idx !== -1) TASKS.splice(idx, 1);
}

/**
 * Main scheduler loop
 */
export function startScheduler() {
  setInterval(() => {
    const now = Date.now();

    for (const task of TASKS) {
      if (now - task.last_run >= task.interval_ms) {
        task.last_run = now;

        try {
          fetch(task.callback_url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ts: now,
              task_id: task.id,
              payload: task.payload
            })
          });
        } catch {
          // ignore errors
        }
      }
    }
  }, 500); // scheduler tick
}