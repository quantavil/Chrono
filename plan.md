# Chronos Improvement Plan

This document outlines the roadmap for upgrading Chronos from a local-only prototype to a fully-featured, production-ready application.

## 📅 Roadmap Overview

| Phase | Focus | Status |
|-------|-------|--------|
| **Phase 5** | Advanced Task Management | 🔴 Pending |
| **Phase 6** | Authentication & Cloud Sync | 🔴 Pending |
| **Phase 7** | Enhanced UX & Audio | 🔴 Pending |
| **Phase 8** | PWA & Offline Capability | 🔴 Pending |
| **Phase 9** | Testing & Quality Assurance | 🔴 Pending |

---

## 🚀 Detailed Phase Breakdown

### Phase 5: Advanced Task Management
**Goal:** Implement professional scheduling features for power users.

- [ ] **Recurring Tasks:** 
    - Support for "Every Day", "Every Week", "Custom Days" (e.g., Mon, Wed, Fri).
    - Logic to automatically recreate the task upon completion.
- [ ] **Time Blocking:**
    - Allow users to assign a Start Time and End Time to tasks.
    - **Conflict Detection:** Visual warning  prevention if two tasks overlap in time.
- [ ] **Smart Organization (Ideas):**
    - **Tags/Labels:** Categorize tasks (e.g., "Work", "Personal", "Health").
    - **Subtasks:** Nest smaller to-dos under a main task.
    - **Deadlines:** distinct from time blocks, just a "Due By" timestamp.

### Phase 6: Authentication & Cloud Sync
**Goal:** Enable users to sync their tasks across devices using Supabase.

- [ ] **Database Schema:** Update schema to support new fields (recurrence, time blocks).
- [ ] **Auth Store:** Implement `auth.svelte.ts` to handle Supabase auth.
- [ ] **Data Sync:** Ensure conflict resolution handles complex recurring task logic.

### Phase 7: Enhanced UX & Audio
**Goal:** Make the app feel more "alive" and responsive.

- [ ] **Sound Effects:** Add subtle sounds for Timer interactions and Completions.
- [ ] **Keyboard Navigation:** Full A11y support.
- [ ] **Interactive Elements:** Micro-animations for a premium feel.

### Phase 8: PWA & Offline Capability
**Goal:** Allow the app to be installed and work flawlessly offline.

- [ ] **Web Manifest & Service Worker:** Installable on iOS/Android.
- [ ] **Offline UX:** Smooth handling of determining when to sync.

### Phase 9: Testing & Quality Assurance
**Goal:** Ensure long-term stability.

- [ ] **Unit Tests:** Focus on complex recurrence/time-blocking logic.
- [ ] **E2E Tests:** Verify critical user flows.

---

## 📝 Implementation Strategy

We will tackle these phases sequentially. Each phase will include:
1.  **Design/Spec:** Brief check of requirements.
2.  **Implementation:** Coding the changes.
3.  **Verification:** Manual or automated testing.
