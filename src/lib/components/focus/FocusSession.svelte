<script lang="ts">
    import { fade, scale } from "svelte/transition";
    import { onDestroy } from "svelte";
    import { Minimize2, Pause, Play, Waves, CheckCircle2 } from "lucide-svelte";
    import { getTodoStore } from "$lib/context";
    import { uiStore } from "$lib/stores/ui.svelte";

    const todoList = getTodoStore();

    let activeTask = $derived(
        uiStore.focusedTaskId
            ? todoList.getById(uiStore.focusedTaskId)
            : todoList.runningTodo,
    );

    // -------------------------------------------------------------------------
    // White Noise Logic
    // -------------------------------------------------------------------------
    let isWhiteNoisePlaying = $state(false);
    let audioContext: AudioContext | null = null;
    let gainNode: GainNode | null = null;
    let whiteNoiseSource: AudioBufferSourceNode | null = null;

    function initAudio() {
        if (!audioContext) {
            audioContext = new (window.AudioContext ||
                (window as any).webkitAudioContext)();
        }
    }

    function createWhiteNoiseBuffer(): AudioBuffer | null {
        if (!audioContext) return null;
        const bufferSize = audioContext.sampleRate * 2; // 2 seconds buffer
        const buffer = audioContext.createBuffer(
            1,
            bufferSize,
            audioContext.sampleRate,
        );
        const output = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }
        return buffer;
    }

    function toggleWhiteNoise() {
        initAudio();
        if (!audioContext) return;

        if (isWhiteNoisePlaying) {
            // Stop
            const currentTime = audioContext.currentTime;
            gainNode?.gain.exponentialRampToValueAtTime(
                0.001,
                currentTime + 0.5,
            );
            whiteNoiseSource?.stop(currentTime + 0.5);
            isWhiteNoisePlaying = false;
        } else {
            // Start
            if (audioContext.state === "suspended") {
                audioContext.resume();
            }

            whiteNoiseSource = audioContext.createBufferSource();
            const buffer = createWhiteNoiseBuffer();
            if (buffer) {
                whiteNoiseSource.buffer = buffer;
                whiteNoiseSource.loop = true;

                gainNode = audioContext.createGain();
                gainNode.gain.setValueAtTime(0.001, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(
                    0.05,
                    audioContext.currentTime + 1,
                ); // 5% volume - soft BG

                whiteNoiseSource.connect(gainNode);
                gainNode.connect(audioContext.destination);
                whiteNoiseSource.start();
                isWhiteNoisePlaying = true;
            }
        }
    }

    onDestroy(() => {
        if (audioContext && isWhiteNoisePlaying) {
            // Quick fade out on destroy if possible, but usually synchronous
            whiteNoiseSource?.stop();
            audioContext.close();
        } else if (audioContext) {
            audioContext.close();
        }
    });

    // -------------------------------------------------------------------------
    // Actions
    // -------------------------------------------------------------------------
    function toggleTimer() {
        if (activeTask) {
            todoList.toggleTimer(activeTask.id);
        }
    }

    function minimize() {
        // Just hide the UI, keep timer running
        uiStore.isFocusModeActive = false;
    }

    function completeTask() {
        if (activeTask) {
            todoList.toggleComplete(activeTask.id);
            // If we complete, we should probably close focus mode or ask for next task
            // For now, close it.
            uiStore.isFocusModeActive = false;
        }
    }
</script>

{#if activeTask}
    <div
        class="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-base-100/95 backdrop-blur-3xl transition-all duration-500"
        in:fade={{ duration: 300 }}
        out:fade={{ duration: 300 }}
    >
        <!-- Background Ambient Blobs -->
        <div class="absolute inset-0 overflow-hidden pointer-events-none -z-10">
            <div
                class="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] animate-pulse-slow"
            ></div>
            <div
                class="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-secondary/20 rounded-full blur-[120px] animate-pulse-slow"
                style="animation-delay: 1s;"
            ></div>
        </div>

        <!-- Top Bar -->
        <div
            class="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-20"
        >
            <div class="flex items-center gap-2 text-neutral/50">
                <div
                    class="w-2 h-2 rounded-full bg-primary/50 animate-pulse"
                ></div>
                <span class="text-sm font-medium tracking-widest uppercase"
                    >Focus Mode</span
                >
            </div>
            <button
                class="btn btn-circle btn-ghost text-neutral/60 hover:text-neutral hover:bg-neutral/10"
                onclick={minimize}
                title="Minimize (Keep running)"
            >
                <Minimize2 class="w-5 h-5" />
            </button>
        </div>

        <!-- Main Content -->
        <div
            class="flex flex-col items-center max-w-4xl w-full px-6 text-center z-10"
            in:scale={{ start: 0.95, duration: 400 }}
        >
            <!-- Tags (if any) -->
            {#if activeTask.tags.length > 0}
                <div class="flex gap-2 mb-8 flex-wrap justify-center">
                    {#each activeTask.tags as tag}
                        <span
                            class="px-3 py-1 rounded-full bg-base-300/50 text-neutral/60 text-sm font-medium border border-white/5"
                        >
                            #{tag}
                        </span>
                    {/each}
                </div>
            {/if}

            <!-- Task Title -->
            <h1
                class="text-4xl md:text-5xl lg:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-neutral to-neutral/60 mb-12 leading-tight tracking-tight"
            >
                {activeTask.title}
            </h1>

            <!-- Timer Display -->
            <div class="relative group cursor-default mb-16">
                <div
                    class="text-[8rem] md:text-[12rem] leading-none font-mono font-bold tracking-tighter tabular-nums text-primary drop-shadow-2xl transition-all duration-300 group-hover:scale-105"
                >
                    {activeTask.timerDisplay.formatted}
                </div>
                {#if activeTask.isRunning}
                    <div
                        class="absolute -bottom-4 left-1/2 -translate-x-1/2 text-sm font-medium text-primary/50 tracking-widest uppercase animate-pulse"
                    >
                        Running
                    </div>
                {:else}
                    <div
                        class="absolute -bottom-4 left-1/2 -translate-x-1/2 text-sm font-medium text-neutral/30 tracking-widest uppercase"
                    >
                        Paused
                    </div>
                {/if}
            </div>

            <!-- Controls -->
            <div class="flex items-center gap-6 md:gap-8">
                <!-- White Noise Button (Replaces Stop) -->
                <button
                    class="group flex flex-col items-center gap-2"
                    onclick={toggleWhiteNoise}
                    title={isWhiteNoisePlaying
                        ? "Stop White Noise"
                        : "Play White Noise"}
                >
                    <div
                        class="w-14 h-14 rounded-2xl border transition-all duration-300 flex items-center justify-center shadow-lg
                        {isWhiteNoisePlaying
                            ? 'bg-primary/20 border-primary text-primary'
                            : 'bg-base-200 border-base-300 text-neutral/60 group-hover:border-primary/30 group-hover:bg-primary/10 group-hover:text-primary'}"
                    >
                        <Waves class="w-6 h-6 fill-current" />
                    </div>
                    <span
                        class="text-xs font-medium transition-colors
                        {isWhiteNoisePlaying
                            ? 'text-primary'
                            : 'text-neutral/40 group-hover:text-primary'}"
                        >Noise</span
                    >
                </button>

                <!-- Play/Pause (Primary) -->
                <button
                    class="group flex flex-col items-center gap-3"
                    onclick={toggleTimer}
                >
                    <div
                        class="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white shadow-2xl shadow-primary/25 transition-all duration-300 hover:scale-110 hover:shadow-primary/40 active:scale-95"
                    >
                        {#if activeTask.isRunning}
                            <Pause class="w-10 h-10 fill-current" />
                        {:else}
                            <Play class="w-10 h-10 fill-current ml-1" />
                        {/if}
                    </div>
                </button>

                <button
                    class="group flex flex-col items-center gap-2"
                    onclick={completeTask}
                    title="Complete Task"
                >
                    <div
                        class="w-14 h-14 rounded-2xl bg-base-200 border border-base-300 flex items-center justify-center text-neutral/60 transition-all duration-300 group-hover:border-emerald-500/30 group-hover:bg-emerald-500/10 group-hover:text-emerald-500 shadow-lg"
                    >
                        <CheckCircle2 class="w-6 h-6" />
                    </div>
                    <span
                        class="text-xs font-medium text-neutral/40 group-hover:text-emerald-500 transition-colors"
                        >Done</span
                    >
                </button>
            </div>
        </div>

        <!-- Footer / Quote / Subtitles -->
        <div class="absolute bottom-8 text-neutral/30 text-sm font-medium">
            Stay focused. One element at a time.
        </div>
    </div>
{/if}

<style>
    /* Custom slow pulse for background blobs */
    @keyframes pulse-slow {
        0%,
        100% {
            opacity: 0.5;
            transform: scale(1);
        }
        50% {
            opacity: 0.8;
            transform: scale(1.1);
        }
    }
    .animate-pulse-slow {
        animation: pulse-slow 8s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }
</style>
