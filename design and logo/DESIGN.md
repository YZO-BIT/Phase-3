---
name: Cybernetic Kinetic
colors:
  surface: '#10131a'
  surface-dim: '#10131a'
  surface-bright: '#363940'
  surface-container-lowest: '#0b0e14'
  surface-container-low: '#191c22'
  surface-container: '#1d2026'
  surface-container-high: '#272a31'
  surface-container-highest: '#32353c'
  on-surface: '#e0e2eb'
  on-surface-variant: '#b9cacb'
  inverse-surface: '#e0e2eb'
  inverse-on-surface: '#2d3037'
  outline: '#849495'
  outline-variant: '#3a494b'
  surface-tint: '#00dce6'
  primary: '#e0fdff'
  on-primary: '#00373a'
  primary-container: '#00f2fe'
  on-primary-container: '#006a70'
  inverse-primary: '#00696f'
  secondary: '#d2bbff'
  on-secondary: '#3f008e'
  secondary-container: '#6001d1'
  on-secondary-container: '#c9aeff'
  tertiary: '#defff1'
  on-tertiary: '#00382b'
  tertiary-container: '#37f6c7'
  on-tertiary-container: '#006d56'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#6ff6ff'
  primary-fixed-dim: '#00dce6'
  on-primary-fixed: '#002022'
  on-primary-fixed-variant: '#004f53'
  secondary-fixed: '#eaddff'
  secondary-fixed-dim: '#d2bbff'
  on-secondary-fixed: '#25005a'
  on-secondary-fixed-variant: '#5a00c6'
  tertiary-fixed: '#44fece'
  tertiary-fixed-dim: '#00e0b3'
  on-tertiary-fixed: '#002118'
  on-tertiary-fixed-variant: '#00513f'
  background: '#10131a'
  on-background: '#e0e2eb'
  surface-variant: '#32353c'
typography:
  display-hero:
    fontFamily: Space Grotesk
    fontSize: 64px
    fontWeight: '700'
    lineHeight: 72px
    letterSpacing: -0.03em
  display-hero-mobile:
    fontFamily: Space Grotesk
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Space Grotesk
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Space Grotesk
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: 0em
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
    letterSpacing: -0.01em
  body-md:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-lg:
    fontFamily: Space Grotesk
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.05em
  label-md:
    fontFamily: Space Grotesk
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.08em
  label-sm:
    fontFamily: Space Grotesk
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.1em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 3rem
  margin-mobile: 1.25rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system establishes an atmospheric, high-performance interface tailored for university technical symposia, hackathons, and esports arenas. The identity balances elite engineering prestige with tournament-grade energy.

- **Personality & Tone:** Hyper-precise, electric, forward-looking, and disciplined. It projects institutional credibility infused with the kinetic drive of competitive tech culture.
- **Target Audience:** Engineering undergraduates, competitive coders, gamers, open-source contributors, and industry mentors participating in premier collegiate technical festivals.
- **Aesthetic Direction:** **Neo-Cyber Glassmorphism & High-Contrast Precision**. Deep obsidian and oceanic abyssal surfaces form a low-noise foundation, allowing high-intensity spectral cyan and violet lasers to guide user focus. Clean monoline borders, ambient luminous glows, and crisp data layouts replace chaotic cyberpunk noise with refined tournament-grade UI.

## Colors

The palette operates under a strict cold-spectrum philosophy, deliberately stripping out all warm hues (red, orange, yellow) in favor of deep-space voids and radiant photonic accents.

- **Primary (`#00F2FE` - Electric Cyan):** The primary signal light. Used for focal CTAs, vital interaction states, active tabs, and primary metrics. Radiates a digital pulse across neutral substrates.
- **Secondary (`#7C3AED` - Deep Ion Violet):** Used for tournament tier hierarchy, sub-accents, elevation aura gradients, and ambient underglows. Works in tandem with `#4F46E5` for transitional gradients.
- **Tertiary (`#0EE6B8` - Kinetic Teal):** Reserved for real-time states, success confirmations, live match badges, and verified technical validations.
- **Neutrals & Surfaces:**
  - Base Canvas: `#080B11` (Deep Abyssal Navy)
  - Surface Raised / Card Container: `#0B111D` (Carbon Indigo)
  - Surface Highlight / Layer: `#131C2E`
- **Text & Stroke Contrast:**
  - High Emphasis / Headings: `#F8FAFC`
  - Medium Emphasis / Body: `#94A3B8`
  - Low Emphasis / De-emphasized metadata: `#64748B`
  - Border Accents: `rgba(0, 242, 254, 0.2)` default, stepping to `rgba(0, 242, 254, 0.6)` on hover.

## Typography

The typography engine is constructed as a high-readability dual framework:
1. **Structural Display & Metadata (`Space Grotesk`):** Delivers a technical, engineered cadence for headlines, brackets, statistics, counters, and navigation pills. Uppercase treatments apply letter spacing between `0.05em` and `0.1em` to emulate telemetry consoles.
2. **Systemic Body & Content (`Inter`):** Drives all standard content consumption, problem statements, rulebooks, and form fields. It guarantees flawless legibility across high-density technical layouts.

## Layout & Spacing

The layout is built on a responsive 12-column grid designed for dense information architecture and modular card arrangements:

- **Desktop (1280px+):** 12 columns, `gutter: 1.5rem`, `margin: 3rem`, max-width content container clamped to 1440px.
- **Tablet (768px - 1279px):** 8 columns, `gutter: 1.25rem`, `margin: 2rem`.
- **Mobile (< 768px):** 4 columns, `gutter-mobile: 1rem`, `margin-mobile: 1.25rem`.

The vertical rhythm adheres strictly to an 8px base grid (interleaved with 4px intervals for tight HUD-style metadata clusters). Layout blocks are structured as self-contained glass modules with explicit spacing gaps to prevent visual clutter in dark mode.

## Elevation & Depth

Elevation is established without standard soft black drop shadows, which are ineffective on `#080B11`. Instead, depth relies on **Tonal Stratification, Glassmorphic Refraction, and Luminous Photonic Glows**:

- **Ground Level (Canvas):** Pure `#080B11` with an optional subtle background technical grid pattern (`rgba(255, 255, 255, 0.02)`).
- **Surface Level 1 (Static Cards / HUD Panels):** Background `rgba(11, 17, 29, 0.75)`, backdrop blur `16px`, bordered with `1px solid rgba(0, 242, 254, 0.15)`.
- **Surface Level 2 (Floating Modals / Flyouts / Active Cards):** Background `rgba(19, 28, 46, 0.85)`, backdrop blur `24px`, bordered with `1px solid rgba(0, 242, 254, 0.35)`, cast with an ambient aura: `0 8px 32px -8px rgba(0, 242, 254, 0.15)`.
- **Interactive Focus / Tier 3 (CTAs, Tournament Winners):** Layered with a dual-stage glow: `0 0 20px rgba(0, 242, 254, 0.35)` combined with a subtle interior border glow (`box-shadow: inset 0 0 12px rgba(0, 242, 254, 0.2)`).

## Shapes

The geometric architecture relies on **Soft Precision (`roundedness: 1`)**.
- Base elements (buttons, inputs, chips) feature an edge radius of `0.25rem` (4px).
- Container panels, tournament cards, and modals step up to `rounded-lg: 0.5rem` (8px).
- Badges and high-emphasis telemetry chips may utilize chamfered or tight pill geometries, but the overarching architecture emphasizes structured, low-radius precision rather than circular softness, underscoring high-tech hardware aesthetic cues.

## Components

### Buttons
- **Primary Cyber Action:** Background gradient `linear-gradient(135deg, #00F2FE 0%, #00D2D3 100%)`, text `#080B11` in Space Grotesk Bold, uppercase, letter-spacing `0.05em`. Crisp hover state introduces an expanded photonic aura (`box-shadow: 0 0 24px rgba(0, 242, 254, 0.5)`).
- **Secondary Ghost:** Transparent fill, `1px solid rgba(0, 242, 254, 0.4)`, text `#F8FAFC`. On hover, background shifts to `rgba(0, 242, 254, 0.08)` and border illuminates to `rgba(0, 242, 254, 0.9)`.
- **Esports / Tournament Alt:** Background `linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)`, text `#F8FAFC`, with violet diffuse back-glow.

### Input Fields & Controls
- **Inputs:** Height 44px, background `rgba(8, 11, 17, 0.8)`, border `1px solid rgba(148, 163, 184, 0.2)`, text `#F8FAFC`. Focused state activates a sharp `1px solid #00F2FE` border with an inner cyan bloom.
- **Checkboxes & Radios:** Sharp square/hexagonal profiles. Unchecked: `1px solid rgba(148, 163, 184, 0.4)`. Checked: `#00F2FE` fill with deep dark tick `#080B11`.

### Cards & Event Panels
- **Standard Module:** Background `rgba(11, 17, 29, 0.7)`, backdrop blur `12px`, border `1px solid rgba(0, 242, 254, 0.15)`. Top corner highlights utilize a 1px gradient stroke that fades from `#00F2FE` to transparent.
- **Interactive / Hackathon Tracks:** On hover, translates -2px vertically, card border intensifies to `rgba(0, 242, 254, 0.5)`, casting a soft indigo/cyan underglow.

### Chips & Telemetry Badges
- **Status Chips:** Height 24px, uppercase `label-sm`, padding `0.25rem 0.75rem`. Live/Active uses `background: rgba(14, 230, 184, 0.1)`, `border: 1px solid rgba(14, 230, 184, 0.4)`, `color: #0EE6B8`.

### Specialized Esports & Hackathon Additions
- **Bracket Connectors:** 1px vector lines with `rgba(0, 242, 254, 0.25)` default, illuminated to `#00F2FE` along active advancement paths.
- **Countdown HUD:** Monospaced numerical blocks housed in semi-opaque carbon tiles with electric cyan digital glyphs.
