import { computed, reactive } from 'vue';

const THEME_STORAGE_KEY = 'phrasenschwein.theme';

const readStoredThemePreference = () => {
    if (typeof window === 'undefined') return null;

    try {
        const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
        if (stored === 'dark' || stored === 'light') return stored;
    } catch {
        // Ignore storage access errors (e.g. blocked in privacy mode).
    }

    return null;
};

const resolveInitialDarkTheme = () => {
    const stored = readStoredThemePreference();
    if (stored) return stored === 'dark';

    if (typeof window === 'undefined') return false;

    return Boolean(window.matchMedia?.('(prefers-color-scheme: dark)')?.matches);
};

const syncDarkModeClass = (enabled) => {
    if (typeof document === 'undefined') return;

    document.documentElement.classList.toggle('app-dark', enabled);
};

const persistThemePreference = (enabled) => {
    if (typeof window === 'undefined') return;

    try {
        window.localStorage.setItem(THEME_STORAGE_KEY, enabled ? 'dark' : 'light');
    } catch {
        // Ignore storage access errors.
    }
};

const layoutConfig = reactive({
    preset: 'Aura',
    primary: 'emerald',
    surface: null,
    darkTheme: resolveInitialDarkTheme(),
    menuMode: 'static'
});

syncDarkModeClass(layoutConfig.darkTheme);

const layoutState = reactive({
    staticMenuInactive: false,
    overlayMenuActive: false,
    profileSidebarVisible: false,
    configSidebarVisible: false,
    sidebarExpanded: false,
    menuHoverActive: false,
    activeMenuItem: null,
    activePath: null
});

export function useLayout() {
    const toggleDarkMode = () => {
        if (!document.startViewTransition) {
            executeDarkModeToggle();

            return;
        }

        document.startViewTransition(() => executeDarkModeToggle());
    };

    const executeDarkModeToggle = () => {
        layoutConfig.darkTheme = !layoutConfig.darkTheme;
        syncDarkModeClass(layoutConfig.darkTheme);
        persistThemePreference(layoutConfig.darkTheme);
    };

    const toggleMenu = () => {
        if (isDesktop()) {
            if (layoutConfig.menuMode === 'static') {
                layoutState.staticMenuInactive = !layoutState.staticMenuInactive;
            }

            if (layoutConfig.menuMode === 'overlay') {
                layoutState.overlayMenuActive = !layoutState.overlayMenuActive;
            }
        } else {
            layoutState.mobileMenuActive = !layoutState.mobileMenuActive;
        }
    };

    const toggleConfigSidebar = () => {
        layoutState.configSidebarVisible = !layoutState.configSidebarVisible;
    };

    const hideMobileMenu = () => {
        layoutState.mobileMenuActive = false;
    };

    const changeMenuMode = (event) => {
        layoutConfig.menuMode = event.value;
        layoutState.staticMenuInactive = false;
        layoutState.mobileMenuActive = false;
        layoutState.sidebarExpanded = false;
        layoutState.menuHoverActive = false;
        layoutState.anchored = false;
    };

    const isDarkTheme = computed(() => layoutConfig.darkTheme);
    const isDesktop = () => window.innerWidth > 991;

    const hasOpenOverlay = computed(() => layoutState.overlayMenuActive);

    return {
        layoutConfig,
        layoutState,
        isDarkTheme,
        toggleDarkMode,
        toggleConfigSidebar,
        toggleMenu,
        hideMobileMenu,
        changeMenuMode,
        isDesktop,
        hasOpenOverlay
    };
}
