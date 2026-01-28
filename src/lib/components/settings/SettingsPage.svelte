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
		X,
	} from "lucide-svelte";
	import { uiStore } from "$lib/stores/ui.svelte";
	import { themeManager } from "$lib/stores/theme.svelte";
	import { getTodoStore, getAuthStore } from "$lib/context";
	import { fade } from "svelte/transition";
	import type { Snippet } from "svelte";
	import type { Component } from "svelte";

	const todoList = getTodoStore();
	const authStore = getAuthStore();

	// State
	let activeSection = $state<"general" | "appearance" | "account" | "data">(
		"general",
	);

	let fileInput = $state<HTMLInputElement>();

	// Derived
	const user = $derived(authStore.user);

	// Constants

	const THEMES = [
		{ id: "light", label: "Light", icon: Sun },
		{ id: "dark", label: "Dark", icon: Moon },
		{ id: "system", label: "System", icon: Laptop },
	] as const;

	const SECTIONS = [
		{ id: "general", label: "General", icon: Clock },
		{ id: "appearance", label: "Appearance", icon: Monitor },
		{ id: "account", label: "Account", icon: User },
		{ id: "data", label: "Data & Storage", icon: Database },
	] as const;

	// Handlers
	function goBack() {
		uiStore.view = "dashboard";
	}

	function exportData() {
		const data = todoList.all.map((t) => t.toLocal());
		const blob = new Blob([JSON.stringify(data, null, 2)], {
			type: "application/json",
		});
		const url = URL.createObjectURL(blob);

		const a = document.createElement("a");
		a.href = url;
		a.download = `chronos_backup_${new Date().toISOString().slice(0, 10)}.json`;
		a.click();

		URL.revokeObjectURL(url);
	}

	async function importData(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;

		try {
			const data = JSON.parse(await file.text());
			if (!Array.isArray(data)) throw new Error("Expected array");

			let count = 0;
			for (const item of data) {
				if (item?.title) {
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
		} catch {
			alert("Failed to import: Invalid JSON format.");
		}
		(e.target as HTMLInputElement).value = "";
	}

	function clearCompleted() {
		if (confirm("Are you sure you want to clear all completed tasks?")) {
			todoList.clearCompleted();
		}
	}

	// Helper for icon background classes
	function getIconClasses(color: "primary" | "secondary") {
		return color === "primary"
			? "bg-primary/10 text-primary"
			: "bg-secondary/10 text-secondary";
	}
</script>

{#snippet sectionHeader(title: string, subtitle: string)}
	<header class="space-y-1">
		<h2 class="text-2xl font-bold">{title}</h2>
		<p class="text-neutral/50">{subtitle}</p>
	</header>
{/snippet}

{#snippet settingsCard(children: Snippet, borderClass?: string)}
	<div
		class="rounded-2xl border border-base-300/50 bg-base-200/40 p-5 {borderClass ??
			''}"
	>
		{@render children()}
	</div>
{/snippet}

{#snippet cardHeader(
	Icon: any,
	color: "primary" | "secondary",
	title: string,
	subtitle: string,
)}
	<div class="mb-5 flex items-center gap-3">
		<div class="rounded-xl p-2.5 {getIconClasses(color)}">
			<Icon class="size-5" />
		</div>
		<div>
			<h3 class="font-semibold">{title}</h3>
			<p class="text-sm text-neutral/50">{subtitle}</p>
		</div>
	</div>
{/snippet}

{#snippet dataAction(
	title: string,
	subtitle: string,
	children: Snippet,
	danger?: boolean,
)}
	<div class="flex items-center justify-between gap-4">
		<div>
			<h3 class="font-semibold {danger ? 'text-error' : ''}">{title}</h3>
			<p class="text-sm text-neutral/50">{subtitle}</p>
		</div>
		{@render children()}
	</div>
{/snippet}

<div
	class="flex min-h-screen flex-col bg-base-100 text-neutral md:flex-row"
	in:fade={{ duration: 200 }}
>
	<!-- Sidebar -->
	<aside
		class="sticky top-0 z-20 w-full border-b border-base-200 bg-base-100/80 backdrop-blur-xl md:w-64 md:border-b-0 md:border-r lg:w-72"
	>
		<header class="flex items-center gap-3 p-5">
			<button
				onclick={goBack}
				class="btn btn-ghost btn-circle btn-sm"
				aria-label="Go back"
			>
				<ChevronLeft class="size-5" />
			</button>
			<h1 class="text-xl font-bold tracking-tight">Settings</h1>
		</header>

		<nav
			class="scrollbar-hide flex gap-1 overflow-x-auto px-3 pb-4 md:flex-col md:overflow-visible"
		>
			{#each SECTIONS as { id, label, icon: Icon } (id)}
				{@const isActive = activeSection === id}
				<button
					class="flex items-center gap-3 whitespace-nowrap rounded-xl px-4 py-2.5 transition-all
						{isActive
						? 'bg-primary/10 font-medium text-primary'
						: 'text-neutral/60 hover:bg-base-200 hover:text-neutral'}"
					onclick={() => (activeSection = id)}
				>
					<Icon class="size-5" strokeWidth={1.75} />
					<span>{label}</span>
				</button>
			{/each}
		</nav>
	</aside>

	<!-- Content -->
	<main class="mx-auto w-full max-w-2xl flex-1 space-y-8 p-6 pb-24 md:p-10">
		{#if activeSection === "general"}
			<section class="space-y-6" in:fade={{ duration: 150 }}>
				{@render sectionHeader(
					"General",
					"Configure core task behavior",
				)}
			</section>
		{:else if activeSection === "appearance"}
			<section class="space-y-6" in:fade={{ duration: 150 }}>
				{@render sectionHeader(
					"Appearance",
					"Customize how Chronos looks",
				)}

				<div class="grid gap-3 sm:grid-cols-3">
					{#each THEMES as { id, label, icon: Icon } (id)}
						{@const isActive = themeManager.theme === id}
						<button
							class="group relative flex flex-col items-center gap-3 rounded-2xl border-2 p-5 transition-all
								{isActive
								? 'border-primary bg-primary/5'
								: 'border-base-200 hover:border-base-300'}"
							onclick={() => themeManager.setTheme(id)}
						>
							<div
								class="flex size-12 items-center justify-center rounded-xl transition-all
									{isActive
									? 'bg-primary text-white shadow-lg shadow-primary/25'
									: 'bg-base-200 text-neutral/50 group-hover:bg-base-300 group-hover:text-neutral'}"
							>
								<Icon class="size-6" />
							</div>
							<span class="text-sm font-medium">{label}</span>
							{#if isActive}
								<Check
									class="absolute right-3 top-3 size-4 text-primary"
								/>
							{/if}
						</button>
					{/each}
				</div>
			</section>
		{:else if activeSection === "account"}
			<section class="space-y-6" in:fade={{ duration: 150 }}>
				{@render sectionHeader(
					"Account",
					"Manage your profile and sync",
				)}

				{#snippet accountContent()}
					{#if user}
						<div class="flex items-center gap-5">
							<div class="avatar placeholder">
								<div
									class="size-14 rounded-full bg-primary/10 text-primary"
								>
									<span class="text-xl font-bold"
										>{user.email?.[0].toUpperCase() ??
											"U"}</span
									>
								</div>
							</div>
							<div class="min-w-0 flex-1">
								<p class="truncate font-semibold">
									{user.email}
								</p>
								<p class="text-sm text-neutral/50">
									Synced with Supabase
								</p>
							</div>
							<button
								class="btn btn-error btn-outline btn-sm"
								onclick={() => authStore.signOut()}
							>
								<LogOut class="size-4" />
								<span class="hidden sm:inline">Sign Out</span>
							</button>
						</div>
					{:else}
						<div class="py-6 text-center">
							<div
								class="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-base-200"
							>
								<User class="size-8 text-neutral/40" />
							</div>
							<h3 class="mb-1 font-semibold">Not Signed In</h3>
							<p
								class="mx-auto mb-4 max-w-xs text-sm text-neutral/50"
							>
								Sign in to sync tasks across devices and keep
								your data safe.
							</p>
							<button
								class="btn btn-primary btn-sm"
								onclick={goBack}>Go to Dashboard</button
							>
						</div>
					{/if}
				{/snippet}
				{@render settingsCard(accountContent)}
			</section>
		{:else if activeSection === "data"}
			<section class="space-y-6" in:fade={{ duration: 150 }}>
				{@render sectionHeader(
					"Data & Storage",
					"Manage your local data",
				)}

				{#snippet exportBtn()}
					<button class="btn btn-neutral btn-sm" onclick={exportData}>
						<Download class="size-4" />
						Export
					</button>
				{/snippet}

				{#snippet exportContent()}
					{@render dataAction(
						"Export Data",
						"Download a JSON backup of your tasks",
						exportBtn,
					)}
				{/snippet}
				{@render settingsCard(exportContent)}

				{#snippet importBtn()}
					<input
						type="file"
						accept=".json"
						class="hidden"
						bind:this={fileInput}
						onchange={importData}
					/>
					<button
						class="btn btn-outline btn-sm"
						onclick={() => fileInput?.click()}
					>
						<Upload class="size-4" />
						Import
					</button>
				{/snippet}

				{#snippet importContent()}
					{@render dataAction(
						"Import Data",
						"Restore tasks from a JSON backup",
						importBtn,
					)}
				{/snippet}
				{@render settingsCard(importContent)}

				{#snippet clearBtn()}
					<button
						class="btn btn-error btn-outline btn-sm"
						onclick={clearCompleted}
					>
						<Trash2 class="size-4" />
						Clear
					</button>
				{/snippet}

				{#snippet clearContent()}
					{@render dataAction(
						"Clear Completed",
						"Permanently remove all completed tasks",
						clearBtn,
						true,
					)}
				{/snippet}
				{@render settingsCard(clearContent, "border-error/20")}
			</section>
		{/if}
	</main>
</div>

<style>
	.scrollbar-hide {
		-ms-overflow-style: none;
		scrollbar-width: none;
	}
	.scrollbar-hide::-webkit-scrollbar {
		display: none;
	}
</style>
