---
name: ui-spacing-density
description: Enforce the professional spacing + Cursor-like density for UI components
---

# UI Spacing & Density Guidelines

Vibecut aims for a highly professional, dense, "pro-tool" aesthetic similar to Cursor, Premiere Pro, or DaVinci Resolve.

## 1. Spacing System
We strictly use a 4-point grid system in Tailwind CSS for all margins, padding, and gaps:
- `1` = 4px
- `2` = 8px
- `3` = 12px
- `4` = 16px

**Rules:**
- Do not use odd pixel values or arbitrary values (e.g., `p-[5px]`, `mt-[13px]`) unless absolutely necessary for perfect icon alignment.
- Prefer `gap-1.5` (6px) or `gap-2` (8px) for tightly packed utility bars.
- Padding for buttons should be compact: e.g., `px-2 py-1` or `px-3 py-1.5`. Avoid bulky buttons like `px-6 py-3`.

## 2. Density
- **Pro-tool density**: The UI should fit as much information on screen as comfortably possible without feeling cluttered.
- **Text Size**: Use smaller text for UI labels. Standard sizes are `text-[10px]`, `text-[11px]`, or `text-[12px]` for secondary/meta information. Regular UI text should rarely exceed `text-sm` (14px).
- **Line Heights**: Keep line heights tight (`leading-tight` or `leading-none`) for dense lists.

## 3. Borders and Radii
- Use subtle borders (`border-[#1e1e28]`, `border-[#2a2a35]`) to delineate sections rather than heavy drop shadows.
- Border radii should be small and crisp. Prefer `rounded`, `rounded-md`, or `rounded-lg`. Avoid `rounded-2xl` or `rounded-full` except for specific pills, avatars, or toggle switches.

## 4. Agent Instructions
- When asked to add a new panel, sidebar, or tool window, do NOT make it airy or spacious like a consumer marketing website. Keep it tight, dark, and border-delimited.
- Always review your added Tailwind classes against this spacing system before finalizing the code.
