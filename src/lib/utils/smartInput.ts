/**
 * Utilities for parsing raw natural language task input into structured task data.
 */
import { parseDuration } from "./formatTime";

interface ParsedTask {
    title: string;
    tags: string[];
    estimatedTime: number | null;
}

/**
 * Parses a raw task input string to extract metadata like tags and duration.
 * 
 * Rules:
 * - Tags: Start with # (e.g., #work, #urgent). Must be at least 2 chars.
 * - Duration: defined by 'est' keyword followed by duration (e.g., "est 15m", "est 1.5h").
 */
export function parseTaskInput(input: string): ParsedTask {
    let title = input;
    const tags: string[] = [];
    let estimatedTime: number | null = null;

    // 1. Extract Tags (e.g. #tag)
    // Match # followed by word chars, allowing hyphens/underscores
    const tagRegex = /#([\w\-]+)/g;
    const tagMatches = [...title.matchAll(tagRegex)];

    for (const match of tagMatches) {
        tags.push(match[1]);
        // Remove tag from title, replace with empty string
        title = title.replace(match[0], "").trim();
    }

    // 2. Extract Duration (e.g. est 15m, est 1.5h, est 30 min)
    // Look for "est" (case insensitive) followed by a duration pattern
    // \d+(?:\.\d+)? matches numbers like 15 or 1.5
    // \s* matches optional space
    // [smh] matches s, m, h units
    const durationRegex = /\best\s+(\d+(?:\.\d+)?)\s*([smh](?:in|ec|r)?s?)/i;
    const durationMatch = title.match(durationRegex);

    if (durationMatch) {
        const val = durationMatch[1];
        const unit = durationMatch[2];
        // Reconstruct for the parser (e.g. "15m")
        const timeValue = parseDuration(`${val}${unit}`);
        if (timeValue) {
            estimatedTime = timeValue;
            // Remove "est 15m" from title
            title = title.replace(durationMatch[0], "").trim();
        }
    }

    // 3. Clean up title
    // Collapse multiple spaces into one
    title = title.replace(/\s+/g, " ").trim();

    return {
        title,
        tags,
        estimatedTime
    };
}
