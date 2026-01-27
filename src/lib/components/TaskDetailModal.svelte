<script lang="ts">
    /**
     * TaskDetailModal Component
     * Advanced editing matching Phase 5 requirements
     * Refactored to Right Sidebar (Desktop) and Bottom Sheet (Mobile)
     */
    import { fade, fly } from "svelte/transition";
    import {
        X,
        Clock,
        Tag,
        Trash2,
        CheckCircle2,
        ChevronRight,
    } from "lucide-svelte";
    import type { TodoItem } from "$lib/stores/todo.svelte";
    import type { RecurrenceConfig } from "$lib/types";
    import { todoList } from "$lib/stores/todo.svelte";
    import { onMount } from "svelte";

    interface Props {
        isOpen: boolean;
        todo: TodoItem | null;
    }

    let { isOpen = $bindable(false), todo }: Props = $props();

    // Local State
    let title = $state("");
    let recurrenceDays = $state<number[]>([]); // 0=Sun, 1=Mon, etc.
    let startTime = $state("");
    let endTime = $state("");
    let tagsInput = $state("");
    let activeTags = $state<string[]>([]);
    let isMobile = $state(false);

    // Initial check for mobile
    function updateMedia() {
        if (typeof window !== "undefined") {
            isMobile = window.innerWidth < 768; // Tailwind md breakpoint
        }
    }

    onMount(() => {
        updateMedia();
        window.addEventListener("resize", updateMedia);
        return () => window.removeEventListener("resize", updateMedia);
    });

    // Initialize state when modal opens or todo changes
    $effect(() => {
        if (isOpen && todo) {
            title = todo.title;

            // Recurrence: map stored logic to UI
            // Assuming simplified logic: if recurrence exists, check its content.
            // For now, we only implemented 'none', 'daily' (all days), 'weekly' (needs days).
            // We'll map 'daily' to all 7 days selected, 'none' to none.
            if (todo.recurrence?.type === "daily") {
                recurrenceDays = [0, 1, 2, 3, 4, 5, 6];
            } else if (
                todo.recurrence?.type === "weekly" &&
                todo.recurrence.days
            ) {
                recurrenceDays = [...todo.recurrence.days];
            } else {
                recurrenceDays = [];
            }

            startTime = todo.startAt
                ? new Date(todo.startAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                  })
                : "";
            endTime = todo.endAt
                ? new Date(todo.endAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                  })
                : "";

            activeTags = [...todo.tags];
            tagsInput = "";
            tagsInput = "";
        }
    });

    function close() {
        isOpen = false;
    }

    function save() {
        if (!todo) return;

        // Recurrence Logic
        let recurrence: RecurrenceConfig | null = null;
        if (recurrenceDays.length === 7) {
            recurrence = { type: "daily" };
        } else if (recurrenceDays.length > 0) {
            recurrence = { type: "weekly", days: recurrenceDays };
        }

        // Tags
        // activeTags is source of truth

        // Simple time to ISO conversion logic for MVP
        const mergeDateAndTime = (timeStr: string) => {
            if (!timeStr) return null;
            const [hours, minutes] = timeStr.split(":").map(Number);
            const date = new Date();
            date.setHours(hours, minutes, 0, 0);
            return date.toISOString();
        };

        todo.applyUpdate({
            title,
            recurrence,
            tags: activeTags,
            start_at: mergeDateAndTime(startTime),
            end_at: mergeDateAndTime(endTime),
        });

        todoList.updateTitle(todo.id, title);
        close();
    }

    // --- Recurrence ---

    function toggleDay(dayIndex: number) {
        if (recurrenceDays.includes(dayIndex)) {
            recurrenceDays = recurrenceDays.filter((d) => d !== dayIndex);
        } else {
            recurrenceDays = [...recurrenceDays, dayIndex];
        }
    }

    const DAYS = [
        { label: "M", value: 1 },
        { label: "T", value: 2 },
        { label: "W", value: 3 },
        { label: "T", value: 4 },
        { label: "F", value: 5 },
        { label: "S", value: 6 },
        { label: "S", value: 0 },
    ];

    // --- Tags ---

    function addTag() {
        const trimmed = tagsInput.trim();
        if (trimmed && !activeTags.includes(trimmed)) {
            activeTags = [...activeTags, trimmed];
        }
        tagsInput = "";
    }

    function removeTag(tag: string) {
        activeTags = activeTags.filter((t) => t !== tag);
    }

    function handleTagKeydown(e: KeyboardEvent) {
        if (e.key === "Enter") {
            e.preventDefault();
            addTag();
        } else if (
            e.key === "Backspace" &&
            tagsInput === "" &&
            activeTags.length > 0
        ) {
            // Remove last tag on backspace if input empty
            activeTags = activeTags.slice(0, -1);
        }
    }

    function handleDeleteTask() {
        if (!todo) return;
        if (confirm("Are you sure you want to delete this task?")) {
            todoList.remove(todo.id);
            close();
        }
    }

    function handleResetTime() {
        if (!todo) return;
        startTime = "";
        endTime = "";
    }

    function showPicker(e: MouseEvent) {
        if ("showPicker" in HTMLInputElement.prototype) {
            try {
                (e.currentTarget as HTMLInputElement).showPicker();
            } catch (err) {
                // Ignore if not supported or prevented
            }
        }
    }

    // Transition params generator
    function getTransitionParams() {
        if (isMobile) {
            return { y: 300, duration: 300, opacity: 1 };
        }
        return { x: 300, duration: 300, opacity: 1 };
    }
</script>

{#if isOpen && todo}
    <!-- Backdrop -->
    <div
        class="fixed inset-0 z-50 bg-black/20 backdrop-blur-[2px] transition-opacity"
        transition:fade={{ duration: 200 }}
        onclick={close}
        onkeydown={(e) => e.key === "Escape" && close()}
        role="button"
        tabindex="0"
        aria-label="Close details"
    ></div>

    <!-- Sidebar / Bottom Sheet Container -->
    <div
        class="
      fixed z-50
      inset-x-0 bottom-0 md:inset-x-auto md:inset-y-0 md:right-0
      w-full md:w-96
      max-h-[85vh] md:max-h-full
      flex flex-col
      bg-base-100
      md:rounded-l-3xl rounded-t-3xl md:rounded-tr-none
      shadow-2xl
    "
        in:fly={getTransitionParams()}
        out:fly={getTransitionParams()}
        role="dialog"
        aria-modal="true"
    >
        <!-- Mobile Handle -->
        <div
            class="md:hidden flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing"
            onclick={close}
            role="button"
            tabindex="0"
            onkeydown={(e) => (e.key === "Enter" || e.key === " ") && close()}
        >
            <div class="w-12 h-1.5 rounded-full bg-neutral/20"></div>
        </div>

        <!-- Header -->
        <div
            class="flex items-center justify-between p-6 border-b border-base-200"
        >
            <div class="flex items-center gap-2">
                <!-- Completion Checkbox -->
                <button
                    onclick={() =>
                        todo && (todo.isCompleted = !todo.isCompleted)}
                    class="
                    w-6 h-6 rounded-lg border-2
                    flex items-center justify-center transition-all
                    {todo.isCompleted
                        ? 'bg-accent border-accent text-white'
                        : 'border-neutral/30 text-transparent hover:border-accent'}
                "
                >
                    <CheckCircle2 class="w-4 h-4" />
                </button>
                <h2 class="text-lg font-bold text-neutral">Task Details</h2>
            </div>

            <div class="flex items-center gap-1">
                <button
                    onclick={handleDeleteTask}
                    class="p-2 hover:bg-red-50 text-neutral/40 hover:text-red-500 rounded-xl transition-colors"
                    title="Delete Task"
                >
                    <Trash2 class="w-5 h-5" />
                </button>
                <button
                    onclick={close}
                    class="p-2 hover:bg-base-200 rounded-xl transition-colors"
                >
                    <X class="w-5 h-5 text-neutral/60" />
                </button>
            </div>
        </div>

        <!-- Scrollable Content -->
        <div class="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
            <!-- Editable Title -->
            <div class="space-y-2">
                <input
                    bind:value={title}
                    class="w-full bg-transparent text-xl font-bold text-neutral placeholder:text-neutral/30 outline-none"
                    placeholder="What needs to be done?"
                />
            </div>

            <!-- Time Blocking -->
            <div class="flex items-center justify-between">
                <h3
                    class="text-xs font-bold text-neutral/40 uppercase tracking-wider"
                >
                    Schedule
                </h3>
                {#if startTime || endTime}
                    <button
                        onclick={handleResetTime}
                        class="text-[10px] font-bold text-red-400 hover:text-red-500 transition-colors uppercase tracking-tight"
                    >
                        Clear Time
                    </button>
                {/if}
            </div>

            <div class="grid grid-cols-2 gap-3">
                <div
                    class="bg-base-200/50 rounded-2xl p-3 space-y-1 hover:bg-base-200 transition-colors cursor-pointer group"
                    onclick={() =>
                        (
                            document.getElementById(
                                "start-time-input",
                            ) as HTMLInputElement
                        )?.showPicker()}
                    onkeydown={(e) =>
                        (e.key === "Enter" || e.key === " ") &&
                        (
                            document.getElementById(
                                "start-time-input",
                            ) as HTMLInputElement
                        )?.showPicker()}
                    role="button"
                    tabindex="0"
                >
                    <label
                        for="start-time-input"
                        class="text-xs text-neutral/50 font-medium flex items-center gap-1.5 cursor-pointer"
                    >
                        <Clock
                            class="w-3.5 h-3.5 group-hover:text-primary transition-colors"
                        /> Start
                    </label>
                    <input
                        id="start-time-input"
                        type="time"
                        bind:value={startTime}
                        class="w-full bg-transparent font-medium text-sm outline-none text-neutral cursor-pointer"
                        onclick={showPicker}
                    />
                </div>
                <div
                    class="bg-base-200/50 rounded-2xl p-3 space-y-1 hover:bg-base-200 transition-colors cursor-pointer group"
                    onclick={() =>
                        (
                            document.getElementById(
                                "end-time-input",
                            ) as HTMLInputElement
                        )?.showPicker()}
                    onkeydown={(e) =>
                        (e.key === "Enter" || e.key === " ") &&
                        (
                            document.getElementById(
                                "end-time-input",
                            ) as HTMLInputElement
                        )?.showPicker()}
                    role="button"
                    tabindex="0"
                >
                    <label
                        for="end-time-input"
                        class="text-xs text-neutral/50 font-medium flex items-center gap-1.5 cursor-pointer"
                    >
                        <Clock
                            class="w-3.5 h-3.5 group-hover:text-primary transition-colors"
                        /> End
                    </label>
                    <input
                        id="end-time-input"
                        type="time"
                        bind:value={endTime}
                        class="w-full bg-transparent font-medium text-sm outline-none text-neutral cursor-pointer"
                        onclick={showPicker}
                    />
                </div>
            </div>

            <!-- Quick Time Presets -->
            <div class="flex flex-wrap gap-2">
                <button
                    class="px-2 py-1 rounded-lg bg-base-200 text-xs text-neutral/70 hover:bg-primary/10 hover:text-primary transition-colors"
                    onclick={() => {
                        startTime = "09:00";
                    }}
                >
                    Morning
                </button>
                <button
                    class="px-2 py-1 rounded-lg bg-base-200 text-xs text-neutral/70 hover:bg-primary/10 hover:text-primary transition-colors"
                    onclick={() => {
                        startTime = "13:00";
                    }}
                >
                    Afternoon
                </button>
                <button
                    class="px-2 py-1 rounded-lg bg-base-200 text-xs text-neutral/70 hover:bg-primary/10 hover:text-primary transition-colors border-r border-base-300 pr-3 mr-1"
                    onclick={() => {
                        startTime = "18:00";
                    }}
                >
                    Evening
                </button>

                <button
                    class="px-2 py-1 rounded-lg bg-base-200 text-xs text-neutral/70 hover:bg-primary/10 hover:text-primary transition-colors"
                    onclick={() => {
                        if (!startTime)
                            startTime = new Date().toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: false,
                            });
                        const [h, m] = startTime.split(":").map(Number);
                        const date = new Date();
                        date.setHours(h, m + 15);
                        endTime = date.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false,
                        });
                    }}
                >
                    +15m
                </button>
                <button
                    class="px-2 py-1 rounded-lg bg-base-200 text-xs text-neutral/70 hover:bg-primary/10 hover:text-primary transition-colors"
                    onclick={() => {
                        if (!startTime)
                            startTime = new Date().toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: false,
                            });
                        const [h, m] = startTime.split(":").map(Number);
                        const date = new Date();
                        date.setHours(h, m + 30);
                        endTime = date.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false,
                        });
                    }}
                >
                    +30m
                </button>
                <button
                    class="px-2 py-1 rounded-lg bg-base-200 text-xs text-neutral/70 hover:bg-primary/10 hover:text-primary transition-colors"
                    onclick={() => {
                        if (!startTime)
                            startTime = new Date().toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: false,
                            });
                        const [h, m] = startTime.split(":").map(Number);
                        const date = new Date();
                        date.setHours(h + 1, m);
                        endTime = date.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false,
                        });
                    }}
                >
                    +1h
                </button>
            </div>

            <!-- Recurrence (Days of Week) -->
            <div>
                <span
                    id="recurrence-label"
                    class="text-xs text-neutral/50 font-medium mb-2 block"
                    >Repeats</span
                >
                <div
                    class="flex justify-between items-center bg-base-200/50 rounded-2xl p-2"
                    role="group"
                    aria-labelledby="recurrence-label"
                >
                    {#each DAYS as day}
                        <button
                            onclick={() => toggleDay(day.value)}
                            class="
                                    w-8 h-8 rounded-full text-xs font-bold transition-all flex items-center justify-center
                                    {recurrenceDays.includes(day.value)
                                ? 'bg-primary text-white shadow-md shadow-primary/30 scale-105'
                                : 'text-neutral/40 hover:bg-base-200 hover:text-neutral'}
                                "
                        >
                            {day.label}
                        </button>
                    {/each}
                </div>
                {#if recurrenceDays.length === 0}
                    <p
                        class="text-[10px] text-neutral/40 mt-1.5 text-center font-medium"
                    >
                        Does not repeat
                    </p>
                {:else if recurrenceDays.length === 7}
                    <p
                        class="text-[10px] text-primary/70 mt-1.5 text-center font-bold"
                    >
                        Repeats Daily
                    </p>
                {:else}
                    <p
                        class="text-[10px] text-primary/70 mt-1.5 text-center font-bold"
                    >
                        Repeats on selected days
                    </p>
                {/if}
            </div>

            <!-- Smart Organization -->
            <div class="space-y-4">
                <h3
                    class="text-xs font-bold text-neutral/40 uppercase tracking-wider"
                >
                    Organization
                </h3>

                <!-- Tags -->
                <div class="space-y-3">
                    <div
                        class="flex items-center gap-2 text-sm text-neutral/60"
                    >
                        <Tag class="w-4 h-4" />
                        <span>Tags</span>
                    </div>

                    <div class="flex flex-wrap gap-2">
                        {#each activeTags as tag}
                            <div
                                class="flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider group animate-scale-in border border-primary/20"
                            >
                                <span>{tag}</span>
                                <button
                                    onclick={() => removeTag(tag)}
                                    class="p-0.5 hover:bg-primary/20 rounded-md transition-colors"
                                    aria-label="Remove tag"
                                >
                                    <X class="w-3 h-3" />
                                </button>
                            </div>
                        {/each}
                    </div>

                    <div class="relative group/input">
                        <input
                            bind:value={tagsInput}
                            onkeydown={handleTagKeydown}
                            class="w-full bg-base-200/50 rounded-xl pl-3 pr-10 py-2.5 text-sm border-2 border-transparent focus:border-primary/20 focus:bg-base-100 outline-none transition-all placeholder:text-neutral/40"
                            placeholder={activeTags.length === 0
                                ? "Type tag and press Enter..."
                                : "Add another..."}
                        />
                        <button
                            onclick={addTag}
                            class="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-primary/10 text-primary opacity-0 group-focus-within/input:opacity-100 group-hover/input:opacity-100 transition-all hover:bg-primary hover:text-white"
                            aria-label="Add tag"
                        >
                            <svg
                                class="w-3.5 h-3.5"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="3"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                ><line x1="12" y1="5" x2="12" y2="19"
                                ></line><line x1="5" y1="12" x2="19" y2="12"
                                ></line></svg
                            >
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Footer Action -->
        <div
            class="p-6 border-t border-base-200 bg-base-100/95 backdrop-blur-md flex flex-col gap-3"
        >
            <button
                onclick={save}
                class="w-full py-4 rounded-2xl font-bold bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary-dark hover:shadow-primary/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group/btn"
            >
                <span>Save Changes</span>
                <ChevronRight
                    class="w-4 h-4 group-hover:translate-x-0.5 transition-transform"
                />
            </button>

            {#if todo}
                <div class="flex items-center justify-between px-1">
                    <span class="text-[10px] text-neutral/30 font-medium"
                        >Created {new Date(
                            todo.createdAt,
                        ).toLocaleDateString()}</span
                    >
                    <span class="text-[10px] text-neutral/30 font-medium"
                        >ID: {todo.id.slice(0, 8)}</span
                    >
                </div>
            {/if}
        </div>
    </div>
{/if}
