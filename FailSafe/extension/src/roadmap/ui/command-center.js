// FailSafe Unified Command Center — Main Entry Point
import { ConnectionClient } from './modules/connection.js';

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Connection Client
  const client = new ConnectionClient();
  
  const statusLabels = document.querySelectorAll('.connection-status');
  client.on('connection', (state) => {
    statusLabels.forEach(el => {
      if (state === 'connected') {
        el.innerHTML = '<span class="dot" style="background:var(--accent-green); width:8px; height:8px; border-radius:50%; display:inline-block; margin-right:6px"></span><span style="color:var(--text-muted); font-size: 0.8rem">Live</span>';
      } else if (state === 'connecting') {
        el.innerHTML = '<span class="dot" style="background:var(--accent-gold); width:8px; height:8px; border-radius:50%; display:inline-block; margin-right:6px; animation: pulse 1s infinite"></span><span style="color:var(--accent-gold); font-size: 0.8rem">Connecting</span>';
      } else {
        el.innerHTML = '<span class="dot" style="background:var(--accent-red); width:8px; height:8px; border-radius:50%; display:inline-block; margin-right:6px"></span><span style="color:var(--accent-red); font-size: 0.8rem">Disconnected</span>';
      }
    });
  });

  client.on('hub', (data) => {
    // We will pass this data to the active tab renderers in the next step
    console.log("Hub Snapshot Received:", data);
  });

  // Start polling/subscribing
  client.start();
  // Simple Tab Navigator
  const tabs = document.querySelectorAll('.tab-btn');
  const panels = document.querySelectorAll('.tab-panel');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Deactivate all
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));
      
      // Activate clicked
      tab.classList.add('active');
      const target = document.getElementById(tab.dataset.target);
      if (target) {
        target.classList.add('active');
      }
    });
  });

  // Restore Theme if saved
  const savedTheme = localStorage.getItem('fs-theme');
  if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
  }

  // Monitor manual theme changes to save
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.attributeName === "data-theme") {
        const theme = document.documentElement.getAttribute('data-theme');
        if (theme) {
          localStorage.setItem('fs-theme', theme);
        }
      }
    });
  });
  
  observer.observe(document.documentElement, { attributes: true });
});
