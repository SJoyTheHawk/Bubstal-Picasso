const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function loadTheme(stored = null) {
    const values = new Map(stored ? [['bubstal_theme', stored]] : []);
    const selector = { value: '', addEventListener() {} };
    const document = {
        readyState: 'complete',
        documentElement: { dataset: {}, removeAttribute(name) { delete this.dataset[name.replace('data-', '')]; } },
        getElementById(id) { return id === 'theme-select' ? selector : null; },
        addEventListener() {},
        dispatchEvent() {}
    };
    const context = vm.createContext({
        CustomEvent: class CustomEvent {},
        document,
        window: {
            localStorage: {
                getItem(key) { return values.get(key) ?? null; },
                setItem(key, value) { values.set(key, value); },
                removeItem(key) { values.delete(key); }
            }
        }
    });
    const source = fs.readFileSync(path.join(__dirname, '..', 'theme.js'), 'utf8');
    vm.runInContext(`${source}\n;globalThis.theme = window.BubstalTheme;`, context);
    return { context, theme: context.theme, document, selector, values };
}

test('theme defaults to system and applies explicit choices', () => {
    const { theme, document, selector } = loadTheme();
    assert.equal(theme.getTheme(), 'system');
    assert.equal(selector.value, 'system');
    theme.setTheme('dark');
    assert.equal(document.documentElement.dataset.theme, 'dark');
    assert.equal(selector.value, 'dark');
    theme.setTheme('system');
    assert.equal(document.documentElement.dataset.theme, undefined);
    assert.equal(selector.value, 'system');
});

test('theme choice persists and invalid values fall back to system', () => {
    const { theme, values } = loadTheme('dark');
    assert.equal(theme.getTheme(), 'dark');
    theme.setTheme('invalid');
    assert.equal(theme.getTheme(), 'system');
    assert.equal(values.has('bubstal_theme'), false);
});
