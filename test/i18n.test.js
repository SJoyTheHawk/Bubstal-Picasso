const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function loadI18n({ cookie = '', languages = ['en-US'] } = {}) {
    const selector = {
        value: '',
        addEventListener() {}
    };
    const document = {
        cookie,
        documentElement: { lang: '' },
        title: '',
        querySelectorAll() { return []; },
        getElementById(id) { return id === 'language-select' ? selector : null; },
        dispatchEvent() {}
    };
    const window = {};
    const context = vm.createContext({
        CustomEvent: class CustomEvent {},
        document,
        navigator: { language: languages[0], languages },
        window
    });
    const source = fs.readFileSync(path.join(__dirname, '..', 'i18n.js'), 'utf8');
    const instrumented = source.replace('window.BubstalI18n = {', 'window.__messages = messages;\n    window.BubstalI18n = {');
    vm.runInContext(instrumented, context);
    return { document, i18n: window.BubstalI18n, messages: window.__messages, selector };
}

test('fresh visits use the browser language', () => {
    const { document, i18n, selector } = loadI18n({ languages: ['zh-TW', 'en-US'] });
    assert.equal(i18n.getLocale(), 'zh-TW');
    assert.equal(document.documentElement.lang, 'zh-TW');
    assert.equal(selector.value, 'zh-TW');
    assert.equal(i18n.t('work.title'), '建立商品圖片');
});

test('saved language cookie overrides the browser language', () => {
    const { i18n } = loadI18n({ cookie: 'bubstal_locale=en', languages: ['zh-TW'] });
    assert.equal(i18n.getLocale(), 'en');
    assert.equal(i18n.t('work.title'), 'Create product images');
});

test('changing language writes a long-lived site cookie', () => {
    const { document, i18n } = loadI18n({ languages: ['en-US'] });
    i18n.setLocale('zh-TW');
    assert.match(document.cookie, /^bubstal_locale=zh-TW;/);
    assert.match(document.cookie, /Max-Age=31536000/);
    assert.match(document.cookie, /Path=\//);
});

test('Shaper UI copy exists in both locales', () => {
    const { i18n } = loadI18n({ languages: ['en-US'] });
    for (const key of ['setup.season', 'setup.promotion', 'prompt.regenerate', 'prompt.generate', 'results.shaperFallback', 'purpose.feature_detail']) {
        assert.notEqual(i18n.t(key), key);
        i18n.setLocale('zh-TW', { persist: false });
        assert.notEqual(i18n.t(key), key);
        i18n.setLocale('en', { persist: false });
    }
});

test('English and Traditional Chinese dictionaries have matching keys', () => {
    const { messages } = loadI18n();
    assert.deepEqual(Object.keys(messages.en).sort(), Object.keys(messages['zh-TW']).sort());
});
