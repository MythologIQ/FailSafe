// FailSafe Unified Command Center — Main Entry Point
document.addEventListener('DOMContentLoaded', () => {
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
