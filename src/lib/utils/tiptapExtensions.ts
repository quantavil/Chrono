import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { Node } from '@tiptap/pm/model';

function findDecorations(doc: Node): DecorationSet {
    const decorations: Decoration[] = [];

    doc.descendants((node, pos) => {
        if (!node.isText) return;

        const text = node.text || '';

        // 1. Tags (e.g. #work)
        const tagRegex = /#([\w\-]+)/g;
        let match;
        while ((match = tagRegex.exec(text)) !== null) {
            const from = pos + match.index;
            const to = from + match[0].length;
            decorations.push(
                Decoration.inline(from, to, {
                    class: 'text-primary font-bold bg-primary-muted rounded-sm px-1',
                    nodeName: 'span'
                })
            );
        }

        // 2. Duration (e.g. est 15m)
        const durationRegex = /\best\s+(\d+(?:\.\d+)?\s*[smh])/gi;
        while ((match = durationRegex.exec(text)) !== null) {
            const from = pos + match.index;
            const to = from + match[0].length;
            decorations.push(
                Decoration.inline(from, to, {
                    class: 'text-secondary font-bold bg-secondary/10 rounded-sm px-1',
                    nodeName: 'span'
                })
            );
        }
    });

    return DecorationSet.create(doc, decorations);
}

export const SmartHighlight = Extension.create({
    name: 'smartHighlight',

    addProseMirrorPlugins() {
        const key = new PluginKey('smartHighlight');
        return [
            new Plugin({
                key,
                state: {
                    init(_, { doc }) {
                        return findDecorations(doc);
                    },
                    apply(tr, old) {
                        return tr.docChanged ? findDecorations(tr.doc) : old;
                    },
                },
                props: {
                    decorations(state) {
                        return key.getState(state);
                    },
                },
            }),
        ];
    },
});
