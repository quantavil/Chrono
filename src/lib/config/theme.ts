export const PRIORITY_CONFIG = {
    high: {
        label: "High",
        color: "red-500",
        sortWeight: 0,
        classes: {
            bg: "bg-red-500/10",
            bgHover: "hover:bg-red-500/20",
            text: "text-red-500",
            border: "border-red-500",
            ring: "ring-red-500/30",
            badge: "bg-red-500/10 text-red-500 border-red-500/20",
            button: "bg-red-500/10 text-red-500 border-red-500 hover:bg-red-500/20",
            buttonInactive: "border-base-300 text-neutral/40 hover:border-red-500/30 hover:text-red-500/60",
        },
    },
    medium: {
        label: "Medium",
        color: "amber-500",
        sortWeight: 1,
        classes: {
            bg: "bg-amber-500/10",
            bgHover: "hover:bg-amber-500/20",
            text: "text-amber-500",
            border: "border-amber-500",
            ring: "ring-amber-500/30",
            badge: "bg-amber-500/10 text-amber-500 border-amber-500/20",
            button: "bg-amber-500/10 text-amber-500 border-amber-500 hover:bg-amber-500/20",
            buttonInactive: "border-base-300 text-neutral/40 hover:border-amber-500/30 hover:text-amber-500/60",
        },
    },
    low: {
        label: "Low",
        color: "emerald-500",
        sortWeight: 2,
        classes: {
            bg: "bg-emerald-500/10",
            bgHover: "hover:bg-emerald-500/20",
            text: "text-emerald-500",
            border: "border-emerald-500",
            ring: "ring-emerald-500/30",
            badge: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
            button: "bg-emerald-500/10 text-emerald-500 border-emerald-500 hover:bg-emerald-500/20",
            buttonInactive: "border-base-300 text-neutral/40 hover:border-emerald-500/30 hover:text-emerald-500/60",
        },
    },
    none: {
        label: "None",
        color: "blue-500",
        sortWeight: 3,
        classes: {
            bg: "bg-blue-500/10",
            bgHover: "hover:bg-blue-500/20",
            text: "text-blue-500",
            border: "border-blue-500",
            ring: "ring-blue-500/30",
            badge: "bg-blue-500/10 text-blue-500 border-blue-500/20",
            button: "bg-blue-500/10 text-blue-500 border-blue-500 hover:bg-blue-500/20",
            buttonInactive: "border-base-300 text-neutral/40 hover:border-blue-500/30 hover:text-blue-500/60",
        },
    },
} as const;

export const TOAST_CONFIG = {
    success: {
        icon: "CheckCircle",
        classes: {
            bg: "bg-emerald-500/10",
            text: "text-emerald-500",
            border: "border-emerald-500/20",
            progress: "bg-emerald-500",
        },
    },
    error: {
        icon: "XCircle",
        classes: {
            bg: "bg-red-500/10",
            text: "text-red-500",
            border: "border-red-500/20",
            progress: "bg-red-500",
        },
    },
    warning: {
        icon: "AlertTriangle",
        classes: {
            bg: "bg-amber-500/10",
            text: "text-amber-500",
            border: "border-amber-500/20",
            progress: "bg-amber-500",
        },
    },
    info: {
        icon: "Info",
        classes: {
            bg: "bg-blue-500/10",
            text: "text-blue-500",
            border: "border-blue-500/20",
            progress: "bg-blue-500",
        },
    },
} as const;
