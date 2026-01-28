<!--
  Date selection component for setting task deadlines with preset options.
-->
<script lang="ts">
    import {
        ChevronLeft,
        ChevronRight,
        Calendar as CalendarIcon,
    } from "lucide-svelte";
    import { fade, slide } from "svelte/transition";
    import { onMount } from "svelte";

    import { type Snippet } from "svelte";

    interface Props {
        value?: string | null;
        class?: string;
        trigger?: Snippet;
        align?: "left" | "right";
    }

    let {
        value = $bindable(null),
        class: className = "",
        trigger,
        align = "left",
    }: Props = $props();

    let isOpen = $state(false);
    let pickerRef = $state<HTMLDivElement | null>(null);

    let viewDate = $state(new Date());

    $effect(() => {
        if (value && !isOpen) {
            viewDate = new Date(value);
        }
    });

    const monthNames = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
    ];

    const weekDays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

    function getDaysInMonth(year: number, month: number) {
        return new Date(year, month + 1, 0).getDate();
    }

    function getFirstDayOfMonth(year: number, month: number) {
        return new Date(year, month, 1).getDay();
    }

    function generateCalendarDays(year: number, month: number) {
        const daysInMonth = getDaysInMonth(year, month);
        const firstDay = getFirstDayOfMonth(year, month);
        const days = [];

        // Previous month padding
        const prevMonthDays = getDaysInMonth(year, month - 1);
        for (let i = firstDay - 1; i >= 0; i--) {
            days.push({
                day: prevMonthDays - i,
                isCurrentMonth: false,
                date: new Date(year, month - 1, prevMonthDays - i),
            });
        }

        // Current month
        for (let i = 1; i <= daysInMonth; i++) {
            days.push({
                day: i,
                isCurrentMonth: true,
                date: new Date(year, month, i),
            });
        }

        // Next month padding (to fill 6 rows = 42 cells)
        const remainingCells = 42 - days.length;
        for (let i = 1; i <= remainingCells; i++) {
            days.push({
                day: i,
                isCurrentMonth: false,
                date: new Date(year, month + 1, i),
            });
        }

        return days;
    }

    let calendarDays = $derived(
        generateCalendarDays(viewDate.getFullYear(), viewDate.getMonth()),
    );

    function prevMonth() {
        viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1);
    }

    function nextMonth() {
        viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);
    }

    function selectDate(date: Date) {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        value = d.toISOString();
        isOpen = false;
    }

    function isSameDay(d1: Date, d2String: string | null | undefined) {
        if (!d2String) return false;
        const d2 = new Date(d2String);
        return (
            d1.getDate() === d2.getDate() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getFullYear() === d2.getFullYear()
        );
    }

    function isToday(d: Date) {
        const today = new Date();
        return (
            d.getDate() === today.getDate() &&
            d.getMonth() === today.getMonth() &&
            d.getFullYear() === today.getFullYear()
        );
    }

    function handleClickOutside(event: MouseEvent) {
        if (pickerRef && !pickerRef.contains(event.target as Node)) {
            isOpen = false;
        }
    }

    $effect(() => {
        if (isOpen) {
            document.addEventListener("click", handleClickOutside);
        } else {
            document.removeEventListener("click", handleClickOutside);
        }
        return () => document.removeEventListener("click", handleClickOutside);
    });
</script>

<div class="relative {className}" bind:this={pickerRef}>
    <div
        onclick={() => (isOpen = !isOpen)}
        role="button"
        tabindex="0"
        onkeydown={(e) => e.key === "Enter" && (isOpen = !isOpen)}
        class="w-full"
    >
        {#if trigger}
            {@render trigger()}
        {:else}
            <button
                class="
                    w-full py-3 px-4 rounded-xl text-sm font-medium transition-all border-2
                    flex items-center justify-center gap-2
                    {value
                    ? 'border-primary/20 bg-primary/5 text-primary'
                    : 'border-base-200 bg-base-100 text-neutral/40 hover:border-base-300 hover:bg-base-200/30'}
                "
            >
                {#if value}
                    <span class="text-lg font-bold">
                        {new Date(value).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                        })}
                    </span>
                {:else}
                    <CalendarIcon class="w-4 h-4 opacity-50" />
                    <span>Pick a date...</span>
                {/if}
            </button>
        {/if}
    </div>

    {#if isOpen}
        <div
            class="absolute top-full mt-2 z-50 bg-base-100 border border-base-200 shadow-xl rounded-xl p-4 w-[300px] {align ===
            'left'
                ? 'left-0'
                : 'right-0'}"
            transition:fade={{ duration: 100 }}
        >
            <div class="flex items-center justify-between mb-4">
                <button
                    class="p-1 hover:bg-base-200 rounded-lg text-neutral/50 hover:text-neutral transition-colors"
                    onclick={prevMonth}
                >
                    <ChevronLeft class="w-4 h-4" />
                </button>
                <span class="font-bold text-neutral text-sm">
                    {monthNames[viewDate.getMonth()]}
                    {viewDate.getFullYear()}
                </span>
                <button
                    class="p-1 hover:bg-base-200 rounded-lg text-neutral/50 hover:text-neutral transition-colors"
                    onclick={nextMonth}
                >
                    <ChevronRight class="w-4 h-4" />
                </button>
            </div>

            <div class="grid grid-cols-7 gap-1 text-center mb-2">
                {#each weekDays as day}
                    <div
                        class="text-[10px] font-bold text-neutral/30 uppercase"
                    >
                        {day}
                    </div>
                {/each}
            </div>

            <div class="grid grid-cols-7 gap-1">
                {#each calendarDays as { day, isCurrentMonth, date }}
                    <button
                        class="
                            h-8 rounded-lg text-xs font-medium transition-all
                            flex items-center justify-center
                            {!isCurrentMonth
                            ? 'text-neutral/20'
                            : 'text-neutral/70'}
                            {isSameDay(date, value)
                            ? 'bg-primary text-white shadow-sm hover:bg-primary'
                            : 'hover:bg-base-200'}
                             {isToday(date) && !isSameDay(date, value)
                            ? 'border border-primary/30 text-primary'
                            : ''}
                        "
                        onclick={() => selectDate(date)}
                    >
                        {day}
                    </button>
                {/each}
            </div>
        </div>
    {/if}
</div>
