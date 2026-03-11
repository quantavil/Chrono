<script lang="ts">
    import { X, type Icon as IconType } from "lucide-svelte";
    import * as Icons from "lucide-svelte";
    import { toastManager } from "$lib/stores/toast.svelte";
    import { getTodoStore } from "$lib/context";
    import type { List } from "$lib/types";

    interface Props {
        isOpen: boolean;
        listId?: string | null;
        onClose: () => void;
    }

    let { isOpen, listId = null, onClose }: Props = $props();
    const todoList = getTodoStore();

    let title = $state("");
    let selectedIcon = $state("ListTodo");
    let isEditing = $derived(!!listId);

    // Common icons for lists
    const AVAILABLE_ICONS = [
        "ListTodo",
        "Briefcase",
        "Home",
        "User",
        "Star",
        "Zap",
        "ShoppingCart",
        "Book",
        "Coffee",
        "Heart",
        "Target",
        "Flag",
        "MapPin",
        "Calendar",
        "Clock",
    ];

    $effect(() => {
        if (isOpen && listId) {
            const list = todoList.lists.find((l) => l.id === listId);
            if (list) {
                if (list.isDefault) {
                    toastManager.error("Cannot edit default list");
                    onClose();
                    return;
                }
                title = list.title;
                selectedIcon = list.icon || "ListTodo";
            }
        } else if (isOpen) {
            title = "";
            selectedIcon = "ListTodo";
        }
    });

    function handleSubmit(e: Event) {
        e.preventDefault();
        try {
            if (isEditing && listId) {
                todoList.updateList(listId, { title, icon: selectedIcon });
                toastManager.success("List updated");
            } else {
                todoList.addList(title, selectedIcon);
                toastManager.success("List created");
            }
            onClose();
        } catch (err) {
            toastManager.error("Failed to save list");
        }
    }

    function handleDelete() {
        if (!listId) return;
        if (confirm("Are you sure? Tasks will be moved to My Tasks.")) {
            todoList.removeList(listId);
            onClose();
        }
    }
    function focusAction(node: HTMLElement) {
        node.focus();
    }
</script>

{#if isOpen}
    <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4"
        onclick={onClose}
        onkeydown={(e) => e.key === "Escape" && onClose()}
        role="button"
        tabindex="0"
    >
        <div
            class="bg-base-100 w-full max-w-[320px] rounded-2xl shadow-xl border border-base-200 overflow-hidden scale-100 transition-all cursor-default"
            role="dialog"
            aria-modal="true"
            tabindex="-1"
            onclick={(e) => e.stopPropagation()}
            onkeydown={(e) => e.stopPropagation()}
        >
            <form onsubmit={handleSubmit} class="p-4 space-y-4">
                <!-- Header / Title Input Combined -->
                <div class="flex items-center gap-3">
                    <div class="flex-1 relative">
                        <input
                            type="text"
                            bind:value={title}
                            use:focusAction
                            class="w-full bg-transparent border-none p-0 text-lg font-bold placeholder:text-neutral/30 focus:ring-0 focus:outline-none"
                            placeholder="List Name"
                            aria-label="List Name"
                            required
                        />
                    </div>
                    <button
                        type="button"
                        onclick={onClose}
                        class="text-neutral/40 hover:text-neutral transition-colors"
                    >
                        <X class="w-5 h-5" />
                    </button>
                </div>

                <!-- Icon Grid (Compact) -->
                <div class="space-y-2">
                    <span
                        class="text-[10px] font-bold uppercase text-neutral/40 tracking-wider"
                        id="icon-label">Icon</span
                    >
                    <div
                        class="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto scrollbar-hide"
                        role="radiogroup"
                        aria-labelledby="icon-label"
                    >
                        {#each AVAILABLE_ICONS as iconName (iconName)}
                            {@const Icon = (Icons as any)[iconName]}
                            {@const isSelected = selectedIcon === iconName}
                            <button
                                type="button"
                                class="w-8 h-8 rounded-lg flex items-center justify-center transition-all
                                {isSelected
                                    ? 'bg-primary text-white shadow-sm scale-110'
                                    : 'bg-base-200/50 text-neutral/50 hover:bg-base-200 hover:text-neutral'}"
                                onclick={() => (selectedIcon = iconName)}
                                title={iconName}
                            >
                                <Icon class="w-4 h-4" />
                            </button>
                        {/each}
                    </div>
                </div>

                <!-- Actions (Minimal) -->
                <div class="flex items-center justify-between pt-2">
                    {#if isEditing}
                        <button
                            type="button"
                            class="text-xs font-bold text-red-500 hover:text-red-600 transition-colors"
                            onclick={handleDelete}
                        >
                            Delete List
                        </button>
                    {:else}
                        <div></div>
                        <!-- Spacer -->
                    {/if}

                    <button
                        type="submit"
                        class="px-4 py-1.5 bg-primary text-white text-sm font-bold rounded-lg shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100"
                        disabled={!title.trim()}
                    >
                        {isEditing ? "Save" : "Create"}
                    </button>
                </div>
            </form>
        </div>
    </div>
{/if}
