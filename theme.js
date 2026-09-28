(function () {
    const STORAGE_KEY = 'bubstal_theme';
    const THEMES = new Set(['system', 'light', 'dark']);

    function normalizeTheme(value) {
        return THEMES.has(value) ? value : 'system';
    }

    function readTheme() {
        try {
            return normalizeTheme(window.localStorage.getItem(STORAGE_KEY));
        } catch (error) {
            return 'system';
        }
    }

    function applyTheme(value) {
        const theme = normalizeTheme(value);
        if (theme === 'system') document.documentElement.removeAttribute('data-theme');
        else document.documentElement.dataset.theme = theme;
        const selector = document.getElementById('theme-select');
        if (selector) selector.value = theme;
        document.dispatchEvent(new CustomEvent('bubstal:themechange', { detail: { theme } }));
        return theme;
    }

    function setTheme(value, { persist = true } = {}) {
        const theme = normalizeTheme(value);
        if (persist) {
            try {
                if (theme === 'system') window.localStorage.removeItem(STORAGE_KEY);
                else window.localStorage.setItem(STORAGE_KEY, theme);
            } catch (error) {}
        }
        return applyTheme(theme);
    }

    window.BubstalTheme = {
        getTheme: readTheme,
        setTheme,
        applyTheme
    };

    function init() {
        applyTheme(readTheme());
        document.getElementById('theme-select')?.addEventListener('change', event => {
            setTheme(event.target.value);
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
})();
