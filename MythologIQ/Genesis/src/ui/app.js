
const vscode = acquireVsCodeApi();

const UI = {
    guard: document.getElementById('protocol-guard'),
    taskHud: document.getElementById('task-hud'),
    taskName: document.getElementById('task-name'),
    taskStatus: document.getElementById('task-status'),
    stream: document.getElementById('cortex-stream'),
    btnAffirm: document.getElementById('affirm-btn'),
    
    log: (msg) => {
        const div = document.createElement('div');
        div.className = 'log-item';
        div.innerText = `> ${msg}`;
        UI.stream.appendChild(div);
        UI.stream.scrollTop = UI.stream.scrollHeight;
    },

    unlock: () => {
        UI.guard.classList.add('hidden');
        UI.taskHud.classList.remove('hidden');
        UI.startPolling();
    },

    updateTask: (data) => {
        UI.taskName.innerText = data.taskName || 'IDLE';
        UI.taskStatus.innerText = `[${data.taskStatus.toUpperCase()}]`;
    },

    startPolling: () => {
        // Poll every 2 seconds via IPC
        setInterval(() => {
            vscode.postMessage({ type: 'getTask' });
        }, 2000);
        // Initial fetch
        vscode.postMessage({ type: 'getTask' });
    }
};

// Event Listeners
UI.btnAffirm.addEventListener('click', () => {
    vscode.postMessage({ type: 'affirm', value: 'I trust the process' });
});

// Handle Incoming Messages
window.addEventListener('message', event => {
    const message = event.data; // The json data that the extension sent
    switch (message.type) {
        case 'access_granted':
            UI.log('Access Granted. Welcome to the Dojo.');
            UI.unlock();
            break;
        case 'access_denied':
            alert('Access Denied. Protocol Mismatch.');
            break;
        case 'taskUpdate':
            UI.updateTask(message.data);
            break;
    }
});

// UI.log('System online (IPC Mode). Awaiting affirmation.');
