<script lang="ts">
    import { fade, scale } from "svelte/transition";
    import {
        Minimize2,
        Pause,
        Play,
        CheckCircle2,
        Music2,
        Volume2,
    } from "lucide-svelte";
    import { getTodoStore } from "$lib/context";
    import { uiStore } from "$lib/stores/ui.svelte";

    const todoList = getTodoStore();

    let activeTask = $derived(
        uiStore.focusedTaskId
            ? todoList.getById(uiStore.focusedTaskId)
            : todoList.runningTodo,
    );

    // -------------------------------------------------------------------------
    // Advanced Audio Engine
    // -------------------------------------------------------------------------
    type NoiseType =
        | "white"
        | "pink"
        | "brown"
        | "binaural"
        | "rain"
        | "ocean"
        | "bowl";

    // State
    let selectedNoise = $state<NoiseType>("pink"); // Default to Pink (Nature-like)
    let isPlaying = $state(false);

    // Audio Context
    let audioContext: AudioContext | null = null;
    let masterGain: GainNode | null = null;
    let activeNodes: AudioNode[] = []; // Keep track to stop/disconnect

    // Performance & State
    let audioBuffers = new Map<string, AudioBuffer>();
    let stopTimeout: ReturnType<typeof setTimeout> | null = null;
    let startTimeout: ReturnType<typeof setTimeout> | null = null;

    function initAudio() {
        if (!audioContext) {
            audioContext = new (window.AudioContext ||
                (window as any).webkitAudioContext)();
            masterGain = audioContext.createGain();
            masterGain.connect(audioContext.destination);
        }
    }

    function cleanupNodes() {
        activeNodes.forEach((node) => {
            try {
                if (
                    node instanceof AudioBufferSourceNode ||
                    node instanceof OscillatorNode
                ) {
                    node.stop();
                }
                node.disconnect();
            } catch (e) {
                /* ignore already stopped */
            }
        });
        activeNodes = [];
    }

    // --- Generators ---

    function createWhiteBuffer(ctx: AudioContext): AudioBuffer {
        const size = ctx.sampleRate * 2;
        const buffer = ctx.createBuffer(1, size, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1;
        return buffer;
    }

    function createPinkBuffer(ctx: AudioContext): AudioBuffer {
        const size = ctx.sampleRate * 2;
        const buffer = ctx.createBuffer(1, size, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        let b0 = 0,
            b1 = 0,
            b2 = 0,
            b3 = 0,
            b4 = 0,
            b5 = 0,
            b6 = 0;
        for (let i = 0; i < size; i++) {
            const white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.969 * b2 + white * 0.153852;
            b3 = 0.8665 * b3 + white * 0.3104856;
            b4 = 0.55 * b4 + white * 0.5329522;
            b5 = -0.7616 * b5 - white * 0.016898;
            data[i] =
                (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
            b6 = white * 0.115926;
        }
        return buffer;
    }

    function createBrownBuffer(ctx: AudioContext): AudioBuffer {
        const size = ctx.sampleRate * 2;
        const buffer = ctx.createBuffer(1, size, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        let lastOut = 0;
        for (let i = 0; i < size; i++) {
            const white = Math.random() * 2 - 1;
            data[i] = (lastOut + 0.02 * white) / 1.02;
            lastOut = data[i];
            data[i] *= 3.5;
        }
        return buffer;
    }

    function createNoiseSource(
        ctx: AudioContext,
        type: "white" | "pink" | "brown",
    ): AudioBufferSourceNode {
        const source = ctx.createBufferSource();
        if (type === "white") source.buffer = createWhiteBuffer(ctx);
        else if (type === "pink") source.buffer = createPinkBuffer(ctx);
        else if (type === "brown") source.buffer = createBrownBuffer(ctx);
        source.loop = true;
        return source;
    }

    // --- Complex Soundscapes ---

    function playBinauralBeats(ctx: AudioContext, out: AudioNode) {
        // 400Hz (Left) + 410Hz (Right) = 10Hz Alpha Beat
        const merger = ctx.createChannelMerger(2);

        const leftOsc = ctx.createOscillator();
        leftOsc.type = "sine";
        leftOsc.frequency.value = 400;

        const rightOsc = ctx.createOscillator();
        rightOsc.type = "sine";
        rightOsc.frequency.value = 410; // 10hz difference

        // Gain to control volume of tones
        const gain = ctx.createGain();
        gain.gain.value = 0.15; // Moderate volume

        leftOsc.connect(merger, 0, 0);
        rightOsc.connect(merger, 0, 1);

        merger.connect(gain);
        gain.connect(out);

        leftOsc.start();
        rightOsc.start();

        activeNodes.push(leftOsc, rightOsc, merger, gain);
    }

    function playRain(ctx: AudioContext, out: AudioNode) {
        // Pink noise + filters
        const source = createNoiseSource(ctx, "pink");
        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 800; // Muffle it

        const gain = ctx.createGain();
        gain.gain.value = 0.6;

        source.connect(filter);
        filter.connect(gain);
        gain.connect(out);
        source.start();

        activeNodes.push(source, filter, gain);
    }

    function playOcean(ctx: AudioContext, out: AudioNode) {
        // Brown noise modulated by LFO
        const source = createNoiseSource(ctx, "brown");

        const gain = ctx.createGain();
        gain.gain.value = 0; // Base value controlled by LFO

        // LFO (Low Frequency Oscillator) for waves
        const lfo = ctx.createOscillator();
        lfo.type = "sine";
        lfo.frequency.value = 0.1; // 10 second cycle (~0.1Hz)

        // Scale LFO Output (Oscillator is -1 to 1) to Gain (0.1 to 0.4)
        // We use a GainNode to scale the LFO amplitude
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 0.15; // Amplitude variation

        lfo.connect(lfoGain);
        lfoGain.connect(gain.gain); // Connect to gain param

        // Add constant offset to gain so it doesn't go silent?
        // Web Audio param connection adds to the base value.
        // Let's set base value of gain to 0.2
        gain.gain.value = 0.2;

        source.connect(gain);
        gain.connect(out);

        source.start();
        lfo.start();

        activeNodes.push(source, gain, lfo, lfoGain);
    }

    function playSingingBowl(ctx: AudioContext, out: AudioNode) {
        // Harmonic additive synthesis
        const freqs = [180.5, 372.2, 584.3];
        const gains = [0.2, 0.15, 0.05];

        freqs.forEach((f, i) => {
            const osc = ctx.createOscillator();
            osc.type = "sine";
            osc.frequency.value = f;

            const g = ctx.createGain();
            g.gain.value = gains[i];

            // Slow wobble
            const lfo = ctx.createOscillator();
            lfo.frequency.value = 0.5 + Math.random() * 0.5;
            const lfoAmp = ctx.createGain();
            lfoAmp.gain.value = 0.02; // Slight vibrato
            lfo.connect(lfoAmp);
            lfoAmp.connect(osc.frequency);

            osc.connect(g);
            g.connect(out);
            osc.start();
            lfo.start();
            activeNodes.push(osc, g, lfo, lfoAmp);
        });
    }

    // --- Control Logic ---

    const NOISE_CONFIG: Record<
        string,
        { gain?: number; create?: (ctx: AudioContext) => AudioBuffer }
    > = {
        white: { gain: 0.04, create: createWhiteBuffer },
        pink: { gain: 0.06, create: createPinkBuffer },
        brown: { gain: 0.1, create: createBrownBuffer },
    };

    function startSound() {
        if (!audioContext) initAudio();
        if (!audioContext) return; // Guard against failed init

        if (audioContext.state === "suspended") audioContext.resume();

        if (!masterGain) return;

        // Clear any pending stop cleanup if we are restarting
        if (stopTimeout) {
            clearTimeout(stopTimeout);
            stopTimeout = null;
        }

        cleanupNodes(); // Ensure clear

        // Master Fade In
        masterGain.gain.cancelScheduledValues(audioContext.currentTime);
        masterGain.gain.setValueAtTime(0, audioContext.currentTime);
        masterGain.gain.linearRampToValueAtTime(
            1,
            audioContext.currentTime + 1.5,
        ); // 1.5s fade in

        // Route based on types
        if (NOISE_CONFIG[selectedNoise]) {
            const config = NOISE_CONFIG[selectedNoise];
            const src = audioContext.createBufferSource();

            // Cached Buffer Logic
            if (!audioBuffers.has(selectedNoise) && config.create) {
                audioBuffers.set(selectedNoise, config.create(audioContext));
            }
            if (audioBuffers.has(selectedNoise)) {
                src.buffer = audioBuffers.get(selectedNoise)!;
            }

            src.loop = true;

            const g = audioContext.createGain();
            g.gain.value = config.gain || 0.1;

            src.connect(g);
            g.connect(masterGain);
            src.start();
            activeNodes.push(src, g);
        } else {
            // Complex types
            switch (selectedNoise) {
                case "binaural":
                    playBinauralBeats(audioContext, masterGain);
                    break;
                case "rain":
                    playRain(audioContext, masterGain);
                    break;
                case "ocean":
                    playOcean(audioContext, masterGain);
                    break;
                case "bowl":
                    playSingingBowl(audioContext, masterGain);
                    break;
            }
        }

        isPlaying = true;
    }

    function stopSound() {
        if (audioContext && masterGain) {
            // Fade out
            masterGain.gain.cancelScheduledValues(audioContext.currentTime);
            masterGain.gain.setValueAtTime(
                masterGain.gain.value,
                audioContext.currentTime,
            );
            masterGain.gain.exponentialRampToValueAtTime(
                0.001,
                audioContext.currentTime + 1,
            );

            // Clear any previous timeout to avoid multiple cleanups
            if (stopTimeout) clearTimeout(stopTimeout);

            stopTimeout = setTimeout(() => {
                if (!isPlaying) cleanupNodes();
            }, 1100);
        }
        isPlaying = false;
    }

    function toggleSound() {
        if (isPlaying) stopSound();
        else startSound();
    }

    function changeType(type: NoiseType) {
        selectedNoise = type;
        if (isPlaying) {
            // Cancel any pending start
            if (startTimeout) clearTimeout(startTimeout);

            stopSound(); // Starts fade out

            // Queue restart
            startTimeout = setTimeout(() => {
                if (isPlaying) return; // If user stopped it manually in between, don't start
                startSound();
                // Override isPlaying to true since startSound sets it,
                // but we need to ensure the logic flows if stopSound set it to false
            }, 200);
        }
    }

    const NOISE_TYPES: NoiseType[] = [
        "white",
        "pink",
        "brown",
        "binaural",
        "rain",
        "ocean",
        "bowl",
    ];

    function nextNoise() {
        const currentIndex = NOISE_TYPES.indexOf(selectedNoise);
        const nextIndex = (currentIndex + 1) % NOISE_TYPES.length;
        changeType(NOISE_TYPES[nextIndex]);
    }

    $effect(() => {
        return () => {
            if (audioContext) {
                cleanupNodes();
                audioContext.close();
            }
        };
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
        role="dialog"
        aria-modal="true"
        aria-label="Focus Session"
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

            <div class="flex items-center gap-2">
                <!-- Sound Selector (Top Right - Cycle Button) -->
                <button
                    class="btn btn-sm btn-ghost gap-2 text-neutral/70 hover:text-neutral hover:bg-neutral/10 transition-all duration-300 min-w-[120px]"
                    onclick={nextNoise}
                    title="Next Sound Effect"
                    aria-label="Next Sound Effect"
                >
                    <Music2 class="w-4 h-4" />
                    <span
                        class="uppercase text-xs font-medium tracking-wide w-24 text-left"
                        >{selectedNoise}</span
                    >
                </button>

                <button
                    class="btn btn-circle btn-ghost text-neutral/60 hover:text-neutral hover:bg-neutral/10"
                    onclick={minimize}
                    title="Minimize (Keep running)"
                    aria-label="Minimize"
                >
                    <Minimize2 class="w-5 h-5" />
                </button>
            </div>
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
                <!-- Advanced Sound Toggle (On/Off) -->
                <button
                    class="group flex flex-col items-center gap-2"
                    onclick={toggleSound}
                    title={isPlaying ? "Mute Sound" : "Play Sound"}
                    aria-label={isPlaying ? "Mute Sound" : "Play Sound"}
                >
                    <div
                        class="w-14 h-14 rounded-2xl border transition-all duration-300 flex items-center justify-center shadow-lg
                        {isPlaying
                            ? 'bg-primary/20 border-primary text-primary'
                            : 'bg-base-200 border-base-300 text-neutral/60 group-hover:border-primary/30 group-hover:bg-primary/10 group-hover:text-primary'}"
                    >
                        {#if isPlaying}
                            <Volume2 class="w-6 h-6" />
                        {:else}
                            <Music2 class="w-6 h-6" />
                        {/if}
                    </div>
                    <span
                        class="text-xs font-medium transition-colors uppercase
                        {isPlaying
                            ? 'text-primary'
                            : 'text-neutral/40 group-hover:text-primary'}"
                        >{isPlaying ? "On" : "Sound"}</span
                    >
                </button>

                <!-- Play/Pause (Primary) -->
                <button
                    class="group flex flex-col items-center gap-3"
                    onclick={toggleTimer}
                    aria-label={activeTask.isRunning
                        ? "Pause Timer"
                        : "Start Timer"}
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
                    aria-label="Complete Task"
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

<style lang="postcss">
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
