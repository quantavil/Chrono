<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { Editor } from "@tiptap/core";
    import StarterKit from "@tiptap/starter-kit";
    import Placeholder from "@tiptap/extension-placeholder";
    import { SmartHighlight } from "$lib/utils/tiptapExtensions";

    interface Props {
        value?: string;
        placeholder?: string;
        class?: string;
        inputClass?: string;
        autofocus?: boolean;
        onsubmit?: () => void;
        oncancel?: () => void;
        onfocus?: () => void;
        onblur?: () => void;
    }

    let {
        value = $bindable(""),
        placeholder = "Add a task...",
        class: className = "",
        inputClass = "",
        autofocus = false,
        onsubmit,
        oncancel,
        onfocus,
        onblur,
    }: Props = $props();

    let element = $state<HTMLElement>();
    let editor = $state<Editor>();

    onMount(() => {
        editor = new Editor({
            element: element,
            extensions: [
                StarterKit.configure({
                    heading: false,
                    blockquote: false,
                    codeBlock: false,
                    bulletList: false,
                    orderedList: false,
                    listItem: false,
                    horizontalRule: false,
                }),
                SmartHighlight,
                Placeholder.configure({
                    placeholder: placeholder,
                    emptyEditorClass:
                        "is-empty before:content-[attr(data-placeholder)] before:text-neutral/40 before:float-left before:pointer-events-none before:h-0",
                }),
            ],
            content: value,
            editorProps: {
                attributes: {
                    class: `outline-none h-full w-full ${inputClass}`,
                },
                handleKeyDown: (view, event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        onsubmit?.();
                        return true;
                    }
                    if (event.key === "Escape") {
                        event.preventDefault();
                        oncancel?.();
                        return true;
                    }
                    return false;
                },
            },
            onUpdate: ({ editor }) => {
                // We only want plain text for the value binding
                value = editor.getText();
            },
            onFocus: () => onfocus?.(),
            onBlur: () => onblur?.(),
        });

        if (autofocus) {
            editor.commands.focus();
        }
    });

    onDestroy(() => {
        if (editor) {
            editor.destroy();
        }
    });

    // Sync value changes from outside (e.g. resetForm)
    $effect(() => {
        if (editor && value !== editor.getText()) {
            editor.commands.setContent(value);
        }
    });

    // Focus effect
    export function focus() {
        editor?.commands.focus();
    }

    export function blur() {
        editor?.commands.blur();
    }
</script>

<div bind:this={element} class={className}></div>

<style>
    /* Scoped styles (though Tiptap classes are global essentially) */
    :global(.ProseMirror p.is-empty::before) {
        color: var(--color-neutral-muted);
        content: attr(data-placeholder);
        float: left;
        height: 0;
        pointer-events: none;
    }
</style>
