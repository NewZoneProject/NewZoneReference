// Module: Scheduler Microservice Core
// Description: Minimal periodic task scheduler for NewZoneReference.
// File: index.js

const TASKS = [];
const MAX_TASKS = 200;

/**
 * Add task
 * @param {number} interval_ms
 * @param {string} callback_url
 * @param {any} payload
 * @returns {object}
 */
function addTask(interval_ms, callback_url, payload = null) {
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

/**
 * List tasks
 * @returns {Array}
 */
function listTasks() {
    return TASKS;
}

/**
 * Remove task
 * @param {string} id
 */
function removeTask(id) {
    const idx = TASKS.findIndex(t => t.id === id);
    if (idx !== -1) TASKS.splice(idx, 1);
}

/**
 * Main scheduler loop
 */
function startScheduler() {
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

module.exports = {
    addTask,
    listTasks,
    removeTask,
    startScheduler
};