export class UIStore {
    isFocusModeOpen = $state(false);
    isSidebarOpen = $state(true); // For mobile/desktop responsiveness maybe?

    toggleFocusMode() {
        this.isFocusModeOpen = !this.isFocusModeOpen;
    }

    setFocusMode(value: boolean) {
        this.isFocusModeOpen = value;
    }
}

export const uiStore = new UIStore();
