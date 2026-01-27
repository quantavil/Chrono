export class UIStore {
    isSidebarOpen = $state(true);
    isMobile = $state(false);
    isTablet = $state(false);
    focusedTaskId = $state<string | null>(null);
    private _view = $state<'dashboard' | 'settings'>('dashboard');

    constructor() {
        if (typeof window !== 'undefined') {
            this.updateMedia();
            window.addEventListener('resize', () => this.updateMedia());

            // Simple Hash Router
            const onHashChange = () => {
                const hash = window.location.hash;
                if (hash === '#settings') {
                    this._view = 'settings';
                } else {
                    this._view = 'dashboard';
                }
            };
            window.addEventListener('hashchange', onHashChange);
            onHashChange(); // Init state from URL
        }
    }

    get view() { return this._view; }
    set view(v: 'dashboard' | 'settings') {
        this._view = v;
        if (typeof window !== 'undefined') {
            const hash = v === 'settings' ? '#settings' : '';
            if (window.location.hash !== hash && window.location.hash !== '#' + hash) {
                // Push state to allow back button
                if (v === 'settings') window.location.hash = 'settings';
                else window.history.pushState(null, '', window.location.pathname);
            }
        }
    }

    private updateMedia() {
        this.isMobile = window.innerWidth < 768;
        this.isTablet = window.innerWidth < 1024;
    }

    focusNext(ids: string[]) {
        if (ids.length === 0) return;
        if (!this.focusedTaskId) {
            this.focusedTaskId = ids[0];
            return;
        }
        const index = ids.indexOf(this.focusedTaskId);
        if (index === -1 || index === ids.length - 1) {
            this.focusedTaskId = ids[0];
        } else {
            this.focusedTaskId = ids[index + 1];
        }
    }

    focusPrev(ids: string[]) {
        if (ids.length === 0) return;
        if (!this.focusedTaskId) {
            this.focusedTaskId = ids[ids.length - 1];
            return;
        }
        const index = ids.indexOf(this.focusedTaskId);
        if (index === -1 || index === 0) {
            this.focusedTaskId = ids[ids.length - 1];
        } else {
            this.focusedTaskId = ids[index - 1];
        }
    }
}

export const uiStore = new UIStore();
