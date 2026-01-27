# Chronos ✨

A high-performance, responsive Todo & Timer Web App with a soft, cozy pastel design. Built for focus, speed, and cross-platform productivity.

![Chronos Header](https://raw.githubusercontent.com/quantavil/Chronos/main/public/header.png)

## 🌟 Key Features

### ⏱️ Focused Task Tracking
- **Built-in Pomodoro/Timers**: Each task can have its own timer to track exactly how much time you spend.
- **Subtasks**: Break down complex objectives into manageable steps.
- **Rich Notes**: Add context and detail to every task with a built-in editor.

### 🎨 Premium Design System
- **Soft Aesthetics**: Carefully curated pastel color palette that reduce eye strain.
- **Advanced Dark Mode**: A sleek, high-contrast dark theme for night owls.
- **Fluid Interactions**: Smooth transitions (250ms quintOut) and micro-animations throughout.
- **Responsive Layout**: Persistent sidebar on desktop, optimized modal views on mobile.

### 🛠️ Technical Excellence
- **Local First**: Full offline support using indexedDB/localStorage. Changes sync automatically when reconnected.
- **Svelte 5 Runes**: Leveraging the latest reactivity system for maximum performance and code clarity.
- **Tailwind CSS 4**: Modern utility-first styling with high customization.
- **Supabase Integration**: Secure authentication (Magic Link, GitHub) and real-time database synchronization.

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/quantavil/Chronos.git
cd Chronos

# Install dependencies
npm install

# Start development server
npm run dev
```

## 🏗️ Architecture

- **Context & Stores**: Using Svelte 5 Runes for global state management (`todoList`, `authManager`, `themeManager`, `uiStore`).
- **Persistence Layer**: Custom `storageService` with support for both local storage and Supabase backend.
- **Layout System**: Dual-pane layout on desktop with a contextual right panel for task details.
- **Sidebar Organization**: Dedicated section for **Completed Tasks** now located in the sidebar for a cleaner workspace.

## 📱 Mobile Experience

Chronos is fully optimized for mobile devices:
- Bottom-fixed Add Task bar for easy thumb access.
- Floating Task Detail modals.
- Offline status indicators.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---
Created with ❤️ by the Chronos Team.