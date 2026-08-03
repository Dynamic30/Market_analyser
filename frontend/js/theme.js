// ============================================================
// THEME — light → dark → sepia, shared by index.html and admin.html
// Applies the saved theme as soon as it loads (scripts sit at the
// end of <body>, so #theme-icon / #theme-label already exist).
// ============================================================
const themes = ['light', 'dark', 'sepia'];
const themeIcons = { light: '☀', dark: '☾', sepia: '☕' };
const themeLabels = { light: 'Light', dark: 'Dark', sepia: 'Sepia' };

function applyTheme(t) {
    document.body.classList.remove('dark', 'sepia');
    if (t !== 'light') document.body.classList.add(t);
    document.getElementById('theme-icon').textContent = themeIcons[t];
    document.getElementById('theme-label').textContent = themeLabels[t];
    try { localStorage.setItem('theme', t); } catch (e) {}
}

function cycleTheme() {
    const current = localStorage.getItem('theme') || 'light';
    const next = themes[(themes.indexOf(current) + 1) % themes.length];
    applyTheme(next);
}

applyTheme(localStorage.getItem('theme') || 'light');
