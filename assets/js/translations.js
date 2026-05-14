// Internationalization (i18n) System for RTL EduAll
class I18nManager {
    constructor() {
        this.currentLang = localStorage.getItem('language') || 'ar'; // Default to Arabic
        this.translations = {};
        this.originalTexts = new Map();
        this.isLoading = false;
        this.init();
    }

    async init() {
        this.storeOriginalTexts();
        await this.loadTranslations(this.currentLang);
        this.applyLanguage();
        this.setupLanguageSwitcher();
    }

    async loadTranslations(lang) {
        if (this.translations[lang]) return; // Already loaded

        this.isLoading = true;
        try {
            const response = await fetch(`assets/locales/${lang}.json`);
            if (!response.ok) {
                throw new Error(`Failed to load ${lang} translations`);
            }
            this.translations[lang] = await response.json();
        } catch (error) {
            console.error('Error loading translations:', error);
            // Fallback to empty object
            this.translations[lang] = {};
        } finally {
            this.isLoading = false;
        }
    }

    storeOriginalTexts() {
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            if (!this.originalTexts.has(key)) {
                if (element.tagName === 'INPUT' && element.hasAttribute('placeholder')) {
                    this.originalTexts.set(key, element.placeholder || '');
                } else {
                    this.originalTexts.set(key, element.textContent.trim());
                }
            }
        });
    }

    async switchLanguage(lang) {
        if (lang === this.currentLang) return;

        await this.loadTranslations(lang);
        this.currentLang = lang;
        localStorage.setItem('language', lang);
        this.applyLanguage();
    }

    applyLanguage() {
        const html = document.documentElement;

        // Set language and direction
        html.setAttribute('lang', this.currentLang);
        html.setAttribute('dir', this.currentLang === 'ar' ? 'rtl' : 'ltr');

        // Update all elements with data-i18n attribute
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.getTranslation(key);
            const fallback = this.currentLang === 'ar' ? this.originalTexts.get(key) : null;
            const text = translation !== null ? translation : fallback;
            if (text !== null && text !== undefined) {
                if (element.tagName === 'INPUT' && element.hasAttribute('placeholder')) {
                    element.placeholder = text;
                } else if (element.tagName === 'OPTION') {
                    element.textContent = text;
                } else {
                    element.textContent = text;
                }
            }
        });

        // Handle parameterized translations
        const paramElements = document.querySelectorAll('[data-i18n][data-count], [data-i18n][data-total], [data-i18n][data-hours]');
        paramElements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            const params = {};
            if (element.hasAttribute('data-count')) params.count = element.getAttribute('data-count');
            if (element.hasAttribute('data-total')) params.total = element.getAttribute('data-total');
            if (element.hasAttribute('data-hours')) params.hours = element.getAttribute('data-hours');
            const translation = this.getTranslation(key, params);
            const fallback = this.currentLang === 'ar' ? this.originalTexts.get(key) : null;
            const text = translation !== null ? translation : fallback;
            if (text !== null && text !== undefined) {
                element.textContent = text;
            }
        });

        // Update language switcher buttons
        this.updateLanguageSwitcher();

        // Dispatch custom event for other scripts to listen
        window.dispatchEvent(new CustomEvent('languageChanged', {
            detail: { language: this.currentLang, translations: this.translations[this.currentLang] }
        }));
    }

    getTranslation(key, params = {}) {
        const keys = key.split('.');
        let value = this.translations[this.currentLang];

        for (const k of keys) {
            value = value && value[k];
        }

        if (typeof value === 'string') {
            // Replace placeholders like {{count}}
            return value.replace(/\{\{(\w+)\}\}/g, (match, param) => params[param] || match);
        }

        return null; // Fallback to null when not found
    }

    translate(key, params = {}) {
        return this.getTranslation(key, params);
    }

    setupLanguageSwitcher() {
        const switcher = document.querySelector('.language-switcher');
        if (!switcher) return;

        const buttons = switcher.querySelectorAll('.lang-btn');
        buttons.forEach(button => {
            button.addEventListener('click', () => {
                const lang = button.getAttribute('data-lang');
                this.switchLanguage(lang);
            });
        });

        this.updateLanguageSwitcher();
    }

    updateLanguageSwitcher() {
        const switcher = document.querySelector('.language-switcher');
        if (!switcher) return;

        const buttons = switcher.querySelectorAll('.lang-btn');
        buttons.forEach(button => {
            const lang = button.getAttribute('data-lang');
            if (lang === this.currentLang) {
                button.classList.add('active');
                button.classList.remove('bg-main-25', 'text-neutral-700');
                button.classList.add('bg-main-600', 'text-white');
            } else {
                button.classList.remove('active');
                button.classList.remove('bg-main-600', 'text-white');
                button.classList.add('bg-main-25', 'text-neutral-700');
            }
        });
    }
}

// Global translation function
function t(key, params = {}) {
    if (window.i18nManager) {
        return window.i18nManager.translate(key, params);
    }
    return key;
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.i18nManager = new I18nManager();
});

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { I18nManager, t };
}
