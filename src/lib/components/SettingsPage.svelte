<script lang="ts">
    import {
        ChevronLeft,
        Clock,
        Monitor,
        User,
        Database,
        Moon,
        Sun,
        LogOut,
        Check,
        Laptop,
        Trash2,
        Download,
        Upload,
    } from "lucide-svelte";
    import { uiStore } from "$lib/stores/ui.svelte";
    import { themeManager } from "$lib/stores/theme.svelte";
    import { getTodoStore, getAuthStore } from "$lib/context";
    import { fade, slide } from "svelte/transition";
    import { formatTimeCompact } from "$lib/utils/formatTime";

    const todoList = getTodoStore();
    const authStore = getAuthStore();

    let activeSection = $state<"general" | "appearance" | "account" | "data">(
        "general",
    );

    // General Settings State
    let selectedDuration = $state(todoList.preferences.defaultTaskDurationMs);
    let customPresets = $state([...todoList.preferences.customTimePresets]);
    let newPresetInput = $state("");

    // Account State
    const user = $derived(authStore.user);

    function goBack() {
        uiStore.view = "dashboard";
    }

    // --- General Actions ---
    function updateDefaultDuration(ms: number) {
        selectedDuration = ms;
        todoList.updatePreference("defaultTaskDurationMs", ms);
    }

    function addPreset() {
        const val = parseInt(newPresetInput);
        if (!isNaN(val) && val > 0 && !customPresets.includes(val)) {
            const newPresets = [...customPresets, val].sort((a, b) => a - b);
            customPresets = newPresets;
            todoList.updatePreference("customTimePresets", newPresets);
            newPresetInput = "";
        }
    }

    function removePreset(val: number) {
        const newPresets = customPresets.filter((p) => p !== val);
        customPresets = newPresets;
        todoList.updatePreference("customTimePresets", newPresets);
    }

    // --- Data Actions ---
    function exportData() {
        const data = todoList.all.map((t) => t.toLocal());
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `chronos_backup_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    let fileInput = $state<HTMLInputElement>();

    function triggerImport() {
        fileInput?.click();
    }

    async function importData(e: Event) {
        const target = e.target as HTMLInputElement;
        const file = target.files?.[0];
        if (!file) return;

        try {
            const text = await file.text();
            const data = JSON.parse(text);

            if (!Array.isArray(data)) {
                alert("Invalid format: Expected an array of todos.");
                return;
            }

            // Basic validation and import
            let count = 0;
            for (const item of data) {
                if (item && typeof item === "object" && item.title) {
                    // We rely on TodoList to handle creation/merging if needed,
                    // but TodoList.add takes a CreateInput.
                    // TodoModel constructor takes TodoLocal.
                    // The store doesn't expose a 'restore' method easily, but we can do:
                    // todoList.add(item) if it matches CreateInput, OR direct push if we were inside the store.
                    // Since we are outside, and TodoList.add generates a new ID usually,
                    // we might want to check if we can reconstruct models.
                    // However, the best way for now without changing valid store logic too much:
                    // is to map them to CreateInputs OR expose a restore method.
                    // Looking at TodoList, it loads from storageService on init.
                    // So we can:
                    // 1. Load existing
                    // 2. Merge new
                    // 3. Save to storage
                    // 4. Reload page? Or better:
                    // Since we can't easily injection into private _items from here without a setter,
                    // we'll define a simple 'add' loop.
                    // If we want to preserve IDs, we need a store method.
                    // For now, let's just 'add' them as new copies to prevent ID collisions/overwrite issues
                    // effectively acting as a 'merge'.
                    // Actually, 'import' implies restore. Ideally we replace.
                    // Let's iterate and use todoList.add(). logic will treat them as new tasks unless we add a restore method.
                    // Given constraints, I will treat them as NEW tasks for safety, or check if ID exists?
                    // Let's duplicate import for now to avoid ID conflicts, simplest "Merge" strategy.

                    // Optimization: Use TodoList.add which expects TodoCreateInput.
                    // We cast item to any to be flexible.
                    todoList.add({
                        title: item.title,
                        description: item.description,
                        priority: item.priority || "low",
                        due_at: item.due_at || item.dueAt,
                        estimated_time:
                            item.estimated_time || item.estimatedTime,
                        tags: item.tags || [],
                    });
                    count++;
                }
            }
            alert(`Successfully imported ${count} tasks.`);
            target.value = ""; // Reset
        } catch (err) {
            console.error(err);
            alert("Failed to import data: Invalid JSON.");
        }
    }

    function clearCompleted() {
        if (confirm("Are you sure you want to clear all completed tasks?")) {
            todoList.clearCompleted();
        }
    }

    // --- Appearance ---
    const themes = [
        { id: "light", label: "Light", icon: Sun },
        { id: "dark", label: "Dark", icon: Moon },
        { id: "system", label: "System", icon: Laptop },
    ] as const;

    const sections = [
        { id: "general", label: "General", icon: Clock },
        { id: "appearance", label: "Appearance", icon: Monitor },
        { id: "account", label: "Account", icon: User },
        { id: "data", label: "Data & Storage", icon: Database },
    ] as const;
</script>

<div
    class="min-h-screen bg-base-100 text-neutral flex flex-col md:flex-row"
    in:fade={{ duration: 200 }}
>
    <!-- Sidebar Navigation -->
    <aside
        class="w-full md:w-64 lg:w-72 border-b md:border-b-0 md:border-r border-base-200 bg-base-100/50 backdrop-blur-xl sticky top-0 z-20"
    >
        <div class="p-6 flex items-center gap-4">
            <button
                onclick={goBack}
                class="p-2 -ml-2 rounded-xl hover:bg-base-200 transition-colors"
            >
                <ChevronLeft class="w-5 h-5" />
            </button>
            <h1 class="text-xl font-bold font-display tracking-tight">
                Settings
            </h1>
        </div>

        <nav
            class="px-4 pb-4 md:space-y-1 flex md:flex-col overflow-x-auto md:overflow-visible scrollbar-hide gap-1"
        >
            {#each sections as section}
                <button
                    class="
            flex items-center gap-3 px-4 py-3 rounded-xl transition-all whitespace-nowrap
            {activeSection === section.id
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-neutral/60 hover:bg-base-200 hover:text-neutral'}
          "
                    onclick={() => (activeSection = section.id as any)}
                >
                    <section.icon class="w-5 h-5" strokeWidth={2} />
                    {section.label}
                </button>
            {/each}
        </nav>
    </aside>

    <!-- Main Content -->
    <main
        class="flex-1 max-w-3xl mx-auto w-full p-6 md:p-10 lg:p-12 space-y-10 pb-32"
    >
        {#if activeSection === "general"}
            <section class="space-y-8" in:fade={{ duration: 200 }}>
                <div class="space-y-1">
                    <h2 class="text-2xl font-bold">General</h2>
                    <p class="text-neutral/50">Configure core task behavior.</p>
                </div>

                <!-- Default Duration -->
                <div
                    class="bg-base-200/50 rounded-3xl p-6 border border-base-300/50"
                >
                    <div class="flex items-center gap-3 mb-6">
                        <div
                            class="p-2.5 bg-primary/10 rounded-xl text-primary"
                        >
                            <Clock class="w-5 h-5" />
                        </div>
                        <div>
                            <h3 class="font-semibold text-lg">
                                Default Task Duration
                            </h3>
                            <p class="text-sm text-neutral/50">
                                New tasks start with this estimate.
                            </p>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {#each [15, 30, 45, 60, 90, 120] as mins}
                            {@const ms = mins * 60 * 1000}
                            <button
                                class="
                  py-3 px-4 rounded-xl text-sm font-medium transition-all border border-transparent
                  {selectedDuration === ms
                                    ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]'
                                    : 'bg-base-100 hover:border-base-300 text-neutral/70 hover:text-neutral'}
                "
                                onclick={() => updateDefaultDuration(ms)}
                            >
                                {mins}m
                            </button>
                        {/each}
                    </div>
                </div>

                <!-- Custom Presets -->
                <div
                    class="bg-base-200/50 rounded-3xl p-6 border border-base-300/50"
                >
                    <div class="flex items-center gap-3 mb-6">
                        <div
                            class="p-2.5 bg-secondary/10 rounded-xl text-secondary"
                        >
                            <Check class="w-5 h-5" />
                        </div>
                        <div>
                            <h3 class="font-semibold text-lg">
                                Quick Access Presets
                            </h3>
                            <p class="text-sm text-neutral/50">
                                Customize buttons visible in the Add Task bar.
                            </p>
                        </div>
                    </div>

                    <div class="flex flex-wrap gap-2 mb-4">
                        {#each customPresets as mins}
                            <div
                                class="flex items-center gap-2 pl-3 pr-2 py-1.5 bg-base-100 border border-base-300/50 rounded-lg text-sm font-medium"
                            >
                                {mins}m
                                <button
                                    class="p-1 hover:bg-base-200 rounded text-neutral/40 hover:text-error transition-colors"
                                    onclick={() => removePreset(mins)}
                                >
                                    <LogOut class="w-3 h-3 rotate-180" />
                                    <!-- Using LogOut as close variant if X not imported, adding X -->
                                </button>
                            </div>
                        {/each}
                    </div>

                    <div class="flex gap-2">
                        <input
                            type="number"
                            placeholder="Add minutes..."
                            class="input input-bordered w-full max-w-xs bg-base-100"
                            bind:value={newPresetInput}
                            onkeydown={(e) => e.key === "Enter" && addPreset()}
                        />
                        <button class="btn btn-neutral" onclick={addPreset}
                            >Add</button
                        >
                    </div>
                </div>
            </section>
        {:else if activeSection === "appearance"}
            <section class="space-y-8" in:fade={{ duration: 200 }}>
                <div class="space-y-1">
                    <h2 class="text-2xl font-bold">Appearance</h2>
                    <p class="text-neutral/50">Customize how Chronos looks.</p>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {#each themes as t}
                        <button
                            class="
                group relative flex flex-col items-center gap-4 p-6 rounded-3xl border-2 transition-all
                {themeManager.theme === t.id
                                ? 'border-primary bg-primary/5'
                                : 'border-base-200 bg-base-100 hover:border-base-300'}
              "
                            onclick={() => themeManager.setTheme(t.id)}
                        >
                            <div
                                class="
                  w-12 h-12 rounded-2xl flex items-center justify-center transition-all
                  {themeManager.theme === t.id
                                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                    : 'bg-base-200 text-neutral/50 group-hover:text-neutral group-hover:bg-base-300'}
                "
                            >
                                <t.icon class="w-6 h-6" />
                            </div>
                            <span class="font-semibold text-sm">{t.label}</span>

                            {#if themeManager.theme === t.id}
                                <div
                                    class="absolute top-4 right-4 text-primary"
                                >
                                    <Check class="w-5 h-5" />
                                </div>
                            {/if}
                        </button>
                    {/each}
                </div>
            </section>
        {:else if activeSection === "account"}
            <section class="space-y-8" in:fade={{ duration: 200 }}>
                <div class="space-y-1">
                    <h2 class="text-2xl font-bold">Account</h2>
                    <p class="text-neutral/50">Manage your profile and sync.</p>
                </div>

                {#if user}
                    <div
                        class="bg-base-200/50 rounded-3xl p-6 border border-base-300/50 flex items-center gap-6"
                    >
                        <div
                            class="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold"
                        >
                            {user.email?.[0].toUpperCase() ?? "U"}
                        </div>
                        <div class="flex-1 min-w-0">
                            <h3 class="font-bold text-lg truncate">
                                {user.email}
                            </h3>
                            <p class="text-sm text-neutral/50">
                                Authenticated via Supabase
                            </p>
                        </div>
                        <button
                            class="btn btn-outline btn-error btn-sm"
                            onclick={() => authStore.signOut()}
                        >
                            <LogOut class="w-4 h-4 mr-2" />
                            Sign Out
                        </button>
                    </div>
                {:else}
                    <div
                        class="bg-base-200/50 rounded-3xl p-8 border border-base-300/50 text-center space-y-4"
                    >
                        <div
                            class="w-16 h-16 rounded-2xl bg-base-100 mx-auto flex items-center justify-center text-neutral/30"
                        >
                            <User class="w-8 h-8" />
                        </div>
                        <div>
                            <h3 class="font-bold text-lg">Not Signed In</h3>
                            <p class="text-neutral/50 max-w-xs mx-auto">
                                Sign in to sync your tasks across devices and
                                keep your data safe.
                            </p>
                        </div>
                        <!-- Login is handled via modal in header mostly, but could add trigger here -->
                        <button
                            class="btn btn-primary"
                            onclick={() => {
                                goBack();
                                // We need a way to open login modal from here, or redirect
                                // Ideally AuthStore exposes a way or we just tell user to use header
                            }}
                        >
                            Go to Dashboard
                        </button>
                    </div>
                {/if}
            </section>
        {:else if activeSection === "data"}
            <section class="space-y-8" in:fade={{ duration: 200 }}>
                <div class="space-y-1">
                    <h2 class="text-2xl font-bold">Data & Storage</h2>
                    <p class="text-neutral/50">Manage your local data.</p>
                </div>

                <div
                    class="bg-base-200/50 rounded-3xl p-6 border border-base-300/50 space-y-6"
                >
                    <div class="flex items-center justify-between">
                        <div>
                            <h3 class="font-semibold text-lg">Export Data</h3>
                            <p class="text-sm text-neutral/50">
                                Download a JSON backup of your tasks.
                            </p>
                        </div>
                        <button
                            class="btn btn-neutral btn-sm"
                            onclick={exportData}
                        >
                            <Download class="w-4 h-4 mr-2" />
                            Export
                        </button>
                    </div>

                    <div class="divider"></div>

                    <div class="flex items-center justify-between">
                        <div>
                            <h3 class="font-semibold text-lg">Import Data</h3>
                            <p class="text-sm text-neutral/50">
                                Restore tasks from a JSON backup.
                            </p>
                        </div>
                        <input
                            type="file"
                            accept=".json"
                            class="hidden"
                            bind:this={fileInput}
                            onchange={importData}
                        />
                        <button
                            class="btn btn-outline btn-neutral btn-sm"
                            onclick={triggerImport}
                        >
                            <Upload class="w-4 h-4 mr-2" />
                            Import
                        </button>
                    </div>

                    <div class="divider"></div>

                    <div class="flex items-center justify-between">
                        <div>
                            <h3 class="font-semibold text-error">
                                Clear Completed Tasks
                            </h3>
                            <p class="text-sm text-neutral/50">
                                Permanently remove all completed tasks.
                            </p>
                        </div>
                        <button
                            class="btn btn-error btn-sm btn-outline"
                            onclick={clearCompleted}
                        >
                            <Trash2 class="w-4 h-4 mr-2" />
                            Clear All
                        </button>
                    </div>
                </div>
            </section>
        {/if}
    </main>
</div>

<style>
    /* Custom scrollbar for horizontal nav on mobile */
    .scrollbar-hide::-webkit-scrollbar {
        display: none;
    }
    .scrollbar-hide {
        -ms-overflow-style: none;
        scrollbar-width: none;
    }
</style>
