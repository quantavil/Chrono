export class UIStore {
    isFocusModeOpen = $state(false);
    isSidebarOpen = $state(true);
    isMobile = $state(false);
    isTablet = $state(false);
    focusedTaskId = $state<string | null>(null);

    constructor() {
        if (typeof window !== 'undefined') {
            this.updateMedia();
            window.addEventListener('resize', () => this.updateMedia());
        }
    }

    private updateMedia() {
        this.isMobile = window.innerWidth < 768;
        this.isTablet = window.innerWidth < 1024;
    }

    toggleFocusMode() {
        this.isFocusModeOpen = !this.isFocusModeOpen;
    }

    setFocusMode(value: boolean) {
        this.isFocusModeOpen = value;
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
