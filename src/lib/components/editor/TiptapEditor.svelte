<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { Editor } from "@tiptap/core";
    import StarterKit from "@tiptap/starter-kit";
    import Placeholder from "@tiptap/extension-placeholder";
    import Link from "@tiptap/extension-link";
    import Typography from "@tiptap/extension-typography";
    import TaskList from "@tiptap/extension-task-list";
    import TaskItem from "@tiptap/extension-task-item";
    import {
        Bold,
        Italic,
        Strikethrough,
        Code,
        List,
        ListOrdered,
        CheckSquare,
        Quote,
        Minus,
        Link as LinkIcon,
        Heading1,
        Heading2,
        Heading3,
        Undo,
        Redo,
    } from "lucide-svelte";

    // -------------------------------------------------------------------------
    // Props
    // -------------------------------------------------------------------------

    interface Props {
        content?: string;
        placeholder?: string;
        onChange?: (content: string) => void;
        onBlur?: () => void;
        editable?: boolean;
        showToolbar?: boolean;
        minHeight?: string;
        class?: string;
    }

    let {
        content = "",
        placeholder = "Write something...",
        onChange,
        onBlur,
        editable = true,
        showToolbar = true,
        minHeight = "150px",
        class: className = "",
    }: Props = $props();

    // -------------------------------------------------------------------------
    // State
    // -------------------------------------------------------------------------

    let element = $state<HTMLDivElement | null>(null);
    let editor = $state<Editor | null>(null);
    let isFocused = $state(false);

    // -------------------------------------------------------------------------
    // Lifecycle
    // -------------------------------------------------------------------------

    onMount(() => {
        editor = new Editor({
            element: element!,
            extensions: [
                StarterKit.configure({
                    heading: {
                        levels: [1, 2, 3],
                    },
                    bulletList: {
                        keepMarks: true,
                        keepAttributes: false,
                    },
                    orderedList: {
                        keepMarks: true,
                        keepAttributes: false,
                    },
                }),
                Placeholder.configure({
                    placeholder,
                    emptyEditorClass: "is-editor-empty",
                }),
                Link.configure({
                    openOnClick: false,
                    HTMLAttributes: {
                        class: "text-primary underline hover:text-primary-dark cursor-pointer",
                    },
                }),
                Typography,
                TaskList,
                TaskItem.configure({
                    nested: true,
                }),
            ],
            content: content || "",
            editable,
            editorProps: {
                attributes: {
                    class: "prose prose-sm max-w-none focus:outline-none min-h-full",
                },
            },
            onUpdate: ({ editor }) => {
                const html = editor.getHTML();
                onChange?.(html);
            },
            onFocus: () => {
                isFocused = true;
            },
            onBlur: () => {
                isFocused = false;
                onBlur?.();
            },
        });
    });

    onDestroy(() => {
        editor?.destroy();
    });

    // -------------------------------------------------------------------------
    // Sync content from parent
    // -------------------------------------------------------------------------

    $effect(() => {
        if (editor && content !== editor.getHTML()) {
            editor.commands.setContent(content || "");
        }
    });

    // -------------------------------------------------------------------------
    // Toolbar Actions
    // -------------------------------------------------------------------------

    function toggleBold() {
        editor?.chain().focus().toggleBold().run();
    }

    function toggleItalic() {
        editor?.chain().focus().toggleItalic().run();
    }

    function toggleStrike() {
        editor?.chain().focus().toggleStrike().run();
    }

    function toggleCode() {
        editor?.chain().focus().toggleCode().run();
    }

    function toggleHeading(level: 1 | 2 | 3) {
        editor?.chain().focus().toggleHeading({ level }).run();
    }

    function toggleBulletList() {
        editor?.chain().focus().toggleBulletList().run();
    }

    function toggleOrderedList() {
        editor?.chain().focus().toggleOrderedList().run();
    }

    function toggleTaskList() {
        editor?.chain().focus().toggleTaskList().run();
    }

    function toggleBlockquote() {
        editor?.chain().focus().toggleBlockquote().run();
    }

    function setHorizontalRule() {
        editor?.chain().focus().setHorizontalRule().run();
    }

    function setLink() {
        const previousUrl = editor?.getAttributes("link").href;
        const url = window.prompt("URL", previousUrl);

        if (url === null) return;

        if (url === "") {
            editor?.chain().focus().extendMarkRange("link").unsetLink().run();
            return;
        }

        editor
            ?.chain()
            .focus()
            .extendMarkRange("link")
            .setLink({ href: url })
            .run();
    }

    function undo() {
        editor?.chain().focus().undo().run();
    }

    function redo() {
        editor?.chain().focus().redo().run();
    }

    // -------------------------------------------------------------------------
    // Active state checks
    // -------------------------------------------------------------------------

    const isActive = (name: string, attributes?: Record<string, any>) => {
        return editor?.isActive(name, attributes) ?? false;
    };
</script>

<div class="tiptap-wrapper {className}">
    <!-- Toolbar -->
    {#if showToolbar && editor}
        <div
            class="
        flex items-center gap-0.5 flex-wrap
        p-2 mb-2 rounded-xl
        bg-base-200/50
        border border-base-300/50
        {isFocused ? 'border-primary/30' : ''}
        transition-colors
      "
        >
            <!-- Text Formatting -->
            <div class="flex items-center gap-0.5">
                <button
                    type="button"
                    onclick={toggleBold}
                    class="toolbar-btn {isActive('bold') ? 'active' : ''}"
                    title="Bold (⌘B)"
                >
                    <Bold class="w-4 h-4" />
                </button>
                <button
                    type="button"
                    onclick={toggleItalic}
                    class="toolbar-btn {isActive('italic') ? 'active' : ''}"
                    title="Italic (⌘I)"
                >
                    <Italic class="w-4 h-4" />
                </button>
                <button
                    type="button"
                    onclick={toggleStrike}
                    class="toolbar-btn {isActive('strike') ? 'active' : ''}"
                    title="Strikethrough"
                >
                    <Strikethrough class="w-4 h-4" />
                </button>
                <button
                    type="button"
                    onclick={toggleCode}
                    class="toolbar-btn {isActive('code') ? 'active' : ''}"
                    title="Inline Code"
                >
                    <Code class="w-4 h-4" />
                </button>
            </div>

            <div class="w-px h-5 bg-base-300 mx-1"></div>

            <!-- Headings -->
            <div class="flex items-center gap-0.5">
                <button
                    type="button"
                    onclick={() => toggleHeading(1)}
                    class="toolbar-btn {isActive('heading', { level: 1 })
                        ? 'active'
                        : ''}"
                    title="Heading 1"
                >
                    <Heading1 class="w-4 h-4" />
                </button>
                <button
                    type="button"
                    onclick={() => toggleHeading(2)}
                    class="toolbar-btn {isActive('heading', { level: 2 })
                        ? 'active'
                        : ''}"
                    title="Heading 2"
                >
                    <Heading2 class="w-4 h-4" />
                </button>
                <button
                    type="button"
                    onclick={() => toggleHeading(3)}
                    class="toolbar-btn {isActive('heading', { level: 3 })
                        ? 'active'
                        : ''}"
                    title="Heading 3"
                >
                    <Heading3 class="w-4 h-4" />
                </button>
            </div>

            <div class="w-px h-5 bg-base-300 mx-1"></div>

            <!-- Lists -->
            <div class="flex items-center gap-0.5">
                <button
                    type="button"
                    onclick={toggleBulletList}
                    class="toolbar-btn {isActive('bulletList') ? 'active' : ''}"
                    title="Bullet List"
                >
                    <List class="w-4 h-4" />
                </button>
                <button
                    type="button"
                    onclick={toggleOrderedList}
                    class="toolbar-btn {isActive('orderedList')
                        ? 'active'
                        : ''}"
                    title="Numbered List"
                >
                    <ListOrdered class="w-4 h-4" />
                </button>
                <button
                    type="button"
                    onclick={toggleTaskList}
                    class="toolbar-btn {isActive('taskList') ? 'active' : ''}"
                    title="Task List"
                >
                    <CheckSquare class="w-4 h-4" />
                </button>
            </div>

            <div class="w-px h-5 bg-base-300 mx-1"></div>

            <!-- Block Elements -->
            <div class="flex items-center gap-0.5">
                <button
                    type="button"
                    onclick={toggleBlockquote}
                    class="toolbar-btn {isActive('blockquote') ? 'active' : ''}"
                    title="Quote"
                >
                    <Quote class="w-4 h-4" />
                </button>
                <button
                    type="button"
                    onclick={setHorizontalRule}
                    class="toolbar-btn"
                    title="Divider"
                >
                    <Minus class="w-4 h-4" />
                </button>
                <button
                    type="button"
                    onclick={setLink}
                    class="toolbar-btn {isActive('link') ? 'active' : ''}"
                    title="Link (⌘K)"
                >
                    <LinkIcon class="w-4 h-4" />
                </button>
            </div>

            <!-- Spacer -->
            <div class="flex-1"></div>

            <!-- Undo/Redo -->
            <div class="flex items-center gap-0.5">
                <button
                    type="button"
                    onclick={undo}
                    class="toolbar-btn"
                    disabled={!editor?.can().undo()}
                    title="Undo (⌘Z)"
                >
                    <Undo class="w-4 h-4" />
                </button>
                <button
                    type="button"
                    onclick={redo}
                    class="toolbar-btn"
                    disabled={!editor?.can().redo()}
                    title="Redo (⌘⇧Z)"
                >
                    <Redo class="w-4 h-4" />
                </button>
            </div>
        </div>
    {/if}

    <!-- Editor Content -->
    <div
        bind:this={element}
        class="
      tiptap-editor
      rounded-xl p-4
      bg-base-200/30
      border-none transition-all
      {isFocused ? 'bg-base-100' : ''}
    "
        style="min-height: {minHeight}"
    ></div>
</div>

<style>
    /* Toolbar button styles */
    .toolbar-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        border-radius: 6px;
        color: var(--color-neutral-light);
        transition: all 150ms;
    }

    .toolbar-btn:hover:not(:disabled) {
        background-color: var(--color-base-300);
        color: var(--color-neutral);
    }

    .toolbar-btn:disabled {
        opacity: 0.3;
        cursor: not-allowed;
    }

    .toolbar-btn.active {
        background-color: var(--color-primary-muted);
        color: var(--color-primary);
    }

    /* Editor content styles */
    :global(.tiptap-editor .ProseMirror) {
        outline: none;
        min-height: inherit;
    }

    :global(.tiptap-editor .ProseMirror p) {
        margin: 0.5em 0;
        line-height: 1.6;
    }

    :global(.tiptap-editor .ProseMirror h1) {
        font-size: 1.5rem;
        font-weight: 700;
        margin: 1rem 0 0.5rem;
        color: var(--color-neutral);
    }

    :global(.tiptap-editor .ProseMirror h2) {
        font-size: 1.25rem;
        font-weight: 700;
        margin: 0.875rem 0 0.5rem;
        color: var(--color-neutral);
    }

    :global(.tiptap-editor .ProseMirror h3) {
        font-size: 1.1rem;
        font-weight: 600;
        margin: 0.75rem 0 0.5rem;
        color: var(--color-neutral);
    }

    :global(.tiptap-editor .ProseMirror strong) {
        font-weight: 700;
    }

    :global(.tiptap-editor .ProseMirror em) {
        font-style: italic;
    }

    :global(.tiptap-editor .ProseMirror s) {
        text-decoration: line-through;
        opacity: 0.7;
    }

    :global(.tiptap-editor .ProseMirror code) {
        background-color: var(--color-base-200);
        color: var(--color-primary);
        padding: 0.15em 0.4em;
        border-radius: 4px;
        font-family: var(--font-mono);
        font-size: 0.9em;
    }

    :global(.tiptap-editor .ProseMirror pre) {
        background-color: var(--color-base-200);
        border-radius: 8px;
        padding: 0.75rem 1rem;
        margin: 0.5rem 0;
        overflow-x: auto;
    }

    :global(.tiptap-editor .ProseMirror pre code) {
        background: none;
        padding: 0;
        color: var(--color-neutral);
        font-size: 0.85rem;
    }

    :global(.tiptap-editor .ProseMirror blockquote) {
        border-left: 3px solid var(--color-primary);
        padding-left: 1rem;
        margin: 0.5rem 0;
        color: var(--color-neutral-light);
        font-style: italic;
    }

    :global(.tiptap-editor .ProseMirror ul) {
        list-style-type: disc;
        padding-left: 1.5rem;
        margin: 0.5rem 0;
    }

    :global(.tiptap-editor .ProseMirror ol) {
        list-style-type: decimal;
        padding-left: 1.5rem;
        margin: 0.5rem 0;
    }

    :global(.tiptap-editor .ProseMirror li) {
        margin: 0.25rem 0;
    }

    :global(.tiptap-editor .ProseMirror li p) {
        margin: 0;
    }

    /* Task list styles */
    :global(.tiptap-editor .ProseMirror ul[data-type="taskList"]) {
        list-style: none;
        padding-left: 0;
    }

    :global(.tiptap-editor .ProseMirror ul[data-type="taskList"] li) {
        display: flex;
        align-items: flex-start;
        gap: 0.5rem;
    }

    :global(.tiptap-editor .ProseMirror ul[data-type="taskList"] li label) {
        display: flex;
        align-items: center;
        margin-top: 0.25rem;
    }

    :global(
            .tiptap-editor
                .ProseMirror
                ul[data-type="taskList"]
                li
                input[type="checkbox"]
        ) {
        width: 16px;
        height: 16px;
        border-radius: 4px;
        border: 2px solid var(--color-neutral-muted);
        cursor: pointer;
        accent-color: var(--color-accent);
    }

    :global(
            .tiptap-editor
                .ProseMirror
                ul[data-type="taskList"]
                li[data-checked="true"]
        ) {
        text-decoration: line-through;
        opacity: 0.6;
    }

    :global(.tiptap-editor .ProseMirror hr) {
        border: none;
        border-top: 2px solid var(--color-base-300);
        margin: 1rem 0;
    }

    :global(.tiptap-editor .ProseMirror a) {
        color: var(--color-primary);
        text-decoration: underline;
        cursor: pointer;
    }

    :global(.tiptap-editor .ProseMirror a:hover) {
        color: var(--color-primary-dark);
    }

    /* Placeholder */
    :global(.tiptap-editor .ProseMirror p.is-editor-empty:first-child::before) {
        content: attr(data-placeholder);
        float: left;
        color: var(--color-neutral-muted);
        opacity: 0.5;
        pointer-events: none;
        height: 0;
    }

    :global(.tiptap-editor .ProseMirror.is-editor-empty::before) {
        content: attr(data-placeholder);
        color: var(--color-neutral-muted);
        opacity: 0.5;
        pointer-events: none;
    }

    /* Focus ring for accessibility */
    :global(.tiptap-editor .ProseMirror-focused) {
        outline: none;
    }

    /* Selection */
    :global(.tiptap-editor .ProseMirror ::selection) {
        background-color: var(--color-primary-muted);
    }
</style>
