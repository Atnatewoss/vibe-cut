# Vibecut - Agent Rules

These rules dictate the architecture, aesthetic, and non-negotiables for the Vibecut project.
All agents must adhere to these guidelines implicitly during every session.

## Stack & Architecture
- **Tech Stack**: Tauri v2, Vite, React, TypeScript, Tailwind CSS, shadcn/ui, Remotion.
- **Role**: This is a professional desktop video IDE. 

## Aesthetic & Design
- **Vibe**: Dark, dense, professional aesthetic.
- **Colors**: Avoid generic HTML colors (e.g., `red`, `blue`). Use the curated, subtle dark-theme palette (e.g., `#0b0b10`, `#16161e`, `#6c9eeb`).
- **UI Density**: Keep the UI compact and dense (similar to professional IDEs like Cursor or Premiere). Do NOT invent massive padding or large rounded corners unless matching existing standards.
- **Consistency**: Never invent new UI patterns. If you need a dropdown or button, replicate the existing structural patterns in the codebase.

## State Management
- **Timeline State**: The Timeline state is the SINGLE source of truth for the video composition.
- **Component Size**: Prefer small, focused components. Break down large files when they become unwieldy.

## Workflow
- **Consistency Passes**: After building major features, always review the resulting code against the UI spacing rules and the timeline state shape to prevent drift.
- **Code Quality**: Ensure strict TypeScript adherence. Run `npx tsc --noEmit` to verify type safety after making structural changes.
