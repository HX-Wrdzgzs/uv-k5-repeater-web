---
version: 1
name: Nationwide Repeater Data
description: A calm, data-first public directory with a dense dark review console.

colors:
  canvas: "#f7faf8"
  surface: "#ffffff"
  surface-soft: "#eef5f0"
  ink: "#17231d"
  ink-muted: "#617067"
  hairline: "#dce7df"
  primary: "#24a36a"
  primary-deep: "#14784b"
  primary-soft: "#dff6e9"
  warning: "#b56a16"
  danger: "#c44e4e"
  admin-canvas: "#0e1211"
  admin-surface: "#171d1a"
  admin-hairline: "#29332e"
  admin-accent: "#8ad6ab"

typography:
  display: "Inter, 'PingFang SC', 'Microsoft YaHei', sans-serif"
  body: "Inter, 'PingFang SC', 'Microsoft YaHei', sans-serif"
  mono: "ui-monospace, SFMono-Regular, Consolas, monospace"

spacing:
  unit: 4px
  card: 24px
  section: 72px

components:
  button-primary: "green fill, 8px radius, 10px 16px padding"
  button-secondary: "white surface, green border, 8px radius"
  status-badge: "compact pill with semantic tint"
  data-card: "white surface, 1px hairline, 16px radius"
  admin-panel: "dark surface, 1px dark hairline, 12px radius"
---

## Direction

The public directory follows a light, Supabase-inspired data-product language:
white panels, near-black copy, one emerald action color, compact tables, and
source metadata that remains visible instead of being hidden behind decoration.

The review console uses a Linear-inspired dark surface ladder so review work is
visually separate from public browsing. The implementation borrows color roles,
spacing, density, and component behavior only; it does not copy brand marks or
proprietary assets.

## Interaction rules

- Every frequency record shows its status and source date.
- `pending` is visible but always carries the “待核验” badge.
- Primary actions are keyboard reachable and never rely on color alone.
- Tables collapse into readable cards below 760px.
- The map is an orientation layer; the searchable table remains the source of truth.
