// FailSafe Dashboard Logic (IPC Mode)

const vscode = acquireVsCodeApi();
let currentTaskId = null;

document.addEventListener('DOMContentLoaded', () => {
    console.log('FailSafe Dashboard initialized (IPC Mode)');
    
    // Start polling via IPC
    setInterval(() => vscode.postMessage({ type: 'getStatus' }), 2000);
    vscode.postMessage({ type: 'getStatus' }); // Initial fetch

    // Button Listeners
    const btnComplete = document.getElementById('btn-complete');
    if (btnComplete) {
        btnComplete.addEventListener('click', () => {
            if (currentTaskId) {
               vscode.postMessage({ type: 'completeTask', taskId: currentTaskId });
            }
        });
    }
});

// Handle Incoming Messages
window.addEventListener('message', event => {
    const message = event.data;
    switch (message.type) {
        case 'statusUpdate':
            updateDashboard(message.data);
            break;
        case 'taskCompleted':
            console.log('Task completed:', message.data);
            // Refresh after completion
            vscode.postMessage({ type: 'getStatus' });
            break;
    }
});

function updateDashboard(data) {
    const taskNameEl = document.getElementById('current-task-name');
    const badgeEl = document.getElementById('task-status-badge');
    const timerEl = document.getElementById('task-timer');
    const serverStatusDot = document.querySelector('#server-status .dot');
    const brainStatusDot = document.querySelector('#brain-status .dot');

    // Mark as connected since we received a message
    if (serverStatusDot) serverStatusDot.style.backgroundColor = '#3fb950';
    if (brainStatusDot) brainStatusDot.style.backgroundColor = '#3fb950';

    if (data.currentTask) {
        currentTaskId = data.currentTask.id;
        if (taskNameEl) taskNameEl.textContent = data.currentTask.name;
        if (badgeEl) {
            badgeEl.textContent = 'Active';
            badgeEl.style.backgroundColor = 'var(--accent-primary)';
        }
        
        // Update Timer
        if (data.currentTask.startTime) {
            const start = new Date(data.currentTask.startTime).getTime();
            const now = Date.now();
            const diff = now - start;
            
            const hours = Math.floor(diff / 3600000);
            const minutes = Math.floor((diff % 3600000) / 60000);
            const seconds = Math.floor((diff % 60000) / 1000);
            
            if (timerEl) {
                timerEl.textContent = 
                    `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
        }
    } else {
        currentTaskId = null;
        if (taskNameEl) taskNameEl.textContent = data.nextTask ? `Next: ${data.nextTask.name}` : 'All Tasks Completed';
        if (badgeEl) {
             badgeEl.textContent = 'Idle';
             badgeEl.style.backgroundColor = 'grey';
        }
        if (timerEl) timerEl.textContent = '00:00:00';
    }
}
