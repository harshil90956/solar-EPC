# 🎨 Visual Feature Guide - Solar Design Studio Live Maps

## Quick Visual Reference for All Features

---

## 🖼️ UI Component Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  [Solar CRM Logo]    Design Studio - Project Alpha      [X]     │ ← Toolbar
├─────────────────────────────────────────────────────────────────┤
│ ┌────┐ ┌───────────────────────────────────────────┐ ┌────────┐│
│ │    │ │                                           │ │        ││
│ │ L  │ │         GOOGLE MAPS SATELLITE VIEW        │ │ RIGHT  ││
│ │ E  │ │                                           │ │        ││
│ │ F  │ │   ┌──────────────────┐                   │ │ PANEL  ││
│ │ T  │ │   │ FLOATING CONTROL │   🧭  ⚠️         │ │        ││
│ │    │ │   │     PANEL        │                   │ │ Props  ││
│ │ S  │ │   │                  │                   │ │ Solar  ││
│ │ I  │ │   │ GPS Tracking     │                   │ │ Panel  ││
│ │ D  │ │   │ Boundary Draw    │    ╔═══╗          │ │ List   ││
│ │ E  │ │   │ Panel Placement  │    ║ ● ║ Roof     │ │ Tools  ││
│ │ B  │ │   │ Grid Auto-Fill   │    ║● ●║          │ │ Calc   ││
│ │ A  │ │   │                  │    ╚═══╝          │ │        ││
│ │ R  │ │   └──────────────────┘                   │ │        ││
│ │    │ │            👤 Your Location              │ │        ││
│ └────┘ │     🖱️ Click to place panels             │ └────────┘│
│        └───────────────────────────────────────────┘           │
│        [2D] [Satellite] [3D] [+] [-]                ← Bottom   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Feature Screenshots (Text Representation)

### 1. GPS Tracking Active

```
┌─ FLOATING CONTROL PANEL ────────┐
│                                  │
│ 📍 Live Location                 │
│                                  │
│ ┌──────────────────────────────┐│
│ │  🔴  Stop Live Tracking      ││ ← Green border when active
│ └──────────────────────────────┘│
│                                  │
│ Lat: 28.543170                   │
│ Lng: 77.335763                   │
│ Accuracy: ±8m                    │
│                                  │
│ ──────────────────────────────── │
│ 🗺️ Boundary Selection           │
│ ...                              │
└──────────────────────────────────┘

MAP VIEW:
         ╔═════════╗
         ║    ⬤    ║  ← Green user marker
         ╚═════════╝     with accuracy circle
```

### 2. Roof Boundary Drawn

```
SATELLITE VIEW:

      Building Outline
      ┌───────────────────┐
      │  ╔═══════════╗    │
      │  ║ ░░░░░░░░░ ║    │ ← Blue polygon fill
      │  ║ ░ROOF░1░░ ║    │   (50% transparent)
      │  ║ ░20×12m░░ ║    │
      │  ║ ░240m²░░░ ║    │
      │  ║ ░░░░░░░░░ ║    │
      │  ╚═══════════╝    │
      └───────────────────┘

CONTROL PANEL:
│ 🗺️ Boundary Selection           │
│ ┌──────────────────────────────┐│
│ │  🎯 Draw Roof Boundary       ││
│ └──────────────────────────────┘│
│                                  │
│ ✓ Boundary Selected              │ ← Success indicator
```

### 3. Manual Panel Placement

```
INSIDE POLYGON:
      ╔═══════════╗
      ║ ●  ●  ●  ║  ← Blue panel markers
      ║  ●  ●  ● ║     (draggable)
      ║ ●  ●  ●  ║
      ╚═══════════╝

BOTTOM BANNER:
┌──────────────────────────────────┐
│ 🖱️ Click inside boundary to     │
│    place solar panels            │ ← Orange instruction
└──────────────────────────────────┘

CONTROL PANEL:
│ ⚡ Panel Placement                │
│ ┌──────────────────────────────┐│
│ │  ➕ Manual Mode ON           ││ ← Orange border (active)
│ └──────────────────────────────┘│
```

### 4. Grid Auto-Fill Preview

```
BEFORE GRID:
      ╔═══════════╗
      ║           ║
      ║   EMPTY   ║
      ║           ║
      ╚═══════════╝

AFTER 5×8 GRID:
      ╔═══════════╗
      ║ ●●●●●●●● ║
      ║ ●●●●●●●● ║  ← 40 panels
      ║ ●●●●●●●● ║     evenly spaced
      ║ ●●●●●●●● ║
      ║ ●●●●●●●● ║
      ╚═══════════╝

CONTROL PANEL:
│ Grid Layout                      │
│ ┌─────────┐ ┌─────────┐         │
│ │ Rows: 5 │ │ Cols: 8 │         │
│ └─────────┘ └─────────┘         │
│ ┌──────────────────────────────┐│
│ │  Auto-Place 5×8 Grid         ││ ← Green button
│ └──────────────────────────────┘│
```

### 5. Stats Display

```
CONTROL PANEL BOTTOM:
┌──────────────────────────────────┐
│ Panels Placed: 40                │
│ Selected Roof: Roof 1            │
└──────────────────────────────────┘

RIGHT PANEL:
┌─ Solar Analysis ─────────────────┐
│ Total DC Capacity: 21.6 kW       │
│ Total Panels: 40                 │
│ Est. Annual Generation:          │
│   32,400 kWh/year                │
└──────────────────────────────────┘
```

---

## 🎨 Color Scheme Reference

### Primary Colors
```
GPS Tracking:     #22c55e (Green)  🟢
Boundary Drawing: #3b82f6 (Blue)   🔵
Manual Mode:      #f59e0b (Orange) 🟠
Danger/Delete:    #ef4444 (Red)    🔴
Success:          #22c55e (Green)  ✅
Warning:          #f59e0b (Amber)  ⚠️
```

### UI Backgrounds
```
Control Panel:    rgba(2,6,23,0.9)      Dark navy
Button Hover:     rgba(59,130,246,0.2)  Blue glow
Input Field:      rgba(255,255,255,0.05) Subtle gray
Border:           rgba(255,255,255,0.1)  Light separator
```

### Map Elements
```
Polygon Fill:     rgba(59,130,246,0.2)  Blue transparent
Polygon Stroke:   #3b82f6 (2px solid)   Blue border
Panel Marker:     #3b82f6 (fill)        Blue dot
User Marker:      #22c55e (fill)        Green dot
Accuracy Circle:  #22c55e (10% opacity) Green halo
```

---

## 🔤 Typography Guide

### Font Stack
```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 
             'Segoe UI', sans-serif;
```

### Font Sizes
```
Headers (h3):    13px, font-weight: 700
Buttons:         12px, font-weight: 600
Labels:          11px, font-weight: 400
Small text:      10px, font-weight: 400
Coordinates:     10px, font-family: monospace
```

### Text Colors
```
Primary text:    #f1f5f9 (Light slate)
Secondary text:  #94a3b8 (Slate)
Muted text:      #64748b (Dark slate)
Success text:    #22c55e (Green)
Error text:      #ef4444 (Red)
```

---

## 🎭 Interactive States

### Button States

#### Default (Inactive)
```
┌─────────────────────────┐
│   Start Live Tracking   │  Background: rgba(59,130,246,0.2)
└─────────────────────────┘  Border: 1px solid rgba(255,255,255,0.1)
                             Color: #3b82f6
```

#### Active (GPS Running)
```
┌─────────────────────────┐
│  ⏹️  Stop Live Tracking  │  Background: rgba(34,197,94,0.2)
└─────────────────────────┘  Border: 1px solid #22c55e
                             Color: #22c55e (Green)
```

#### Hover
```
┌─────────────────────────┐
│   Start Live Tracking   │  Brightness: 110%
└─────────────────────────┘  Cursor: pointer
```

#### Disabled
```
┌─────────────────────────┐
│   Start Live Tracking   │  Opacity: 0.5
└─────────────────────────┘  Cursor: not-allowed
```

---

## 📐 Spacing & Layout

### Control Panel Dimensions
```
Width:    280px
Padding:  16px
Border:   1px solid rgba(255,255,255,0.1)
Radius:   12px
Shadow:   0 4px 20px rgba(0,0,0,0.3)
```

### Button Dimensions
```
Height:       36px (default)
Padding:      8px 12px
Border:       1px solid
Radius:       8px
Icon size:    16px
Icon gap:     6px
```

### Input Fields
```
Height:       28px
Padding:      4px 8px
Border:       1px solid rgba(255,255,255,0.1)
Radius:       4px
Font size:    11px
```

### Section Spacing
```
Section margin-bottom:  12px
Section padding-bottom: 12px
Section border-bottom:  1px solid rgba(255,255,255,0.1)
Header margin-bottom:   8px
```

---

## 🎬 Animation & Transitions

### GPS Marker Animation
```css
/* Pulsing effect */
@keyframes pulse {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.2); opacity: 0.7; }
  100% { transform: scale(1); opacity: 1; }
}

animation: pulse 2s ease-in-out infinite;
```

### Button Hover Transition
```css
transition: all 0.2s ease;
/* Smooth color and size changes */
```

### Panel Marker Drag
```css
/* No animation - instant feedback for dragging */
cursor: move;
```

### Map Pan/Zoom
```css
/* Google Maps default smooth transitions */
```

---

## 📱 Responsive Breakpoints

### Desktop (1920×1080)
```
Control Panel: Left side, 280px wide
Right Panel: Right side, 320px wide
Map: Center, flex-grow
```

### Laptop (1366×768)
```
Control Panel: Left side, 260px wide
Right Panel: Right side, 300px wide
Map: Center, compressed
```

### Tablet (768×1024)
```
Control Panel: Floating overlay, 90% width
Right Panel: Bottom sheet/drawer
Map: Full screen behind panels
```

### Mobile (375×667)
```
Control Panel: Bottom sheet (collapsed)
Right Panel: Bottom sheet (collapsed)
Map: Full screen
Touch targets: Minimum 44×44px
```

---

## 🎯 Icon Reference

All icons from **Lucide React** library:

```javascript
import { 
  MapPin,       // 📍 GPS location
  Target,       // 🎯 Boundary drawing
  Grid3x3,      // ⊞ Grid layout
  Plus,         // ➕ Add panels
  Trash2,       // 🗑️ Delete
  Play,         // ▶️ Start tracking
  StopCircle,   // ⏹️ Stop tracking
} from 'lucide-react';
```

### Icon Sizes
```
Default:  16px
Small:    14px
Large:    20px
```

---

## 🗺️ Map Settings

### Initial View
```javascript
{
  center: { lat: 28.54317, lng: 77.335763 },
  zoom: 20,
  mapTypeId: 'satellite',
  tilt: 0,
  heading: 0
}
```

### Drawing Options
```javascript
{
  fillColor: '#3b82f6',
  fillOpacity: 0.2,
  strokeColor: '#3b82f6',
  strokeWeight: 2,
  editable: true,
  draggable: false
}
```

### Marker Icons
```javascript
// User Location (Green)
{
  path: google.maps.SymbolPath.CIRCLE,
  fillColor: '#22c55e',
  fillOpacity: 1,
  strokeColor: '#fff',
  strokeWeight: 3,
  scale: 8
}

// Panel (Blue)
{
  path: google.maps.SymbolPath.CIRCLE,
  fillColor: '#3b82f6',
  fillOpacity: 0.8,
  strokeColor: '#fff',
  strokeWeight: 2,
  scale: 6
}
```

---

## 📋 Quick Copy-Paste Snippets

### GPS Coordinates Display
```javascript
<div style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace' }}>
  <div>Lat: {lat.toFixed(6)}</div>
  <div>Lng: {lng.toFixed(6)}</div>
  <div>Accuracy: ±{accuracy.toFixed(0)}m</div>
</div>
```

### Success Indicator
```javascript
<div style={{
  padding: '6px 10px',
  borderRadius: 6,
  background: 'rgba(34,197,94,0.1)',
  border: '1px solid rgba(34,197,94,0.3)',
  fontSize: 10,
  color: '#22c55e',
}}>
  ✓ Boundary Selected
</div>
```

### Action Button
```javascript
<button
  onClick={handleClick}
  style={{
    width: '100%',
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid rgba(59,130,246,0.5)',
    background: 'rgba(59,130,246,0.2)',
    color: '#3b82f6',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  }}
>
  <Icon size={16} /> Button Text
</button>
```

---

## 🎨 Theme Customization

### Dark Theme (Default)
```javascript
const darkTheme = {
  background: '#020617',
  surface: 'rgba(2,6,23,0.9)',
  border: 'rgba(255,255,255,0.1)',
  text: '#f1f5f9',
  textSecondary: '#94a3b8',
  primary: '#3b82f6',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
};
```

### Light Theme (Alternative)
```javascript
const lightTheme = {
  background: '#f8fafc',
  surface: 'rgba(255,255,255,0.95)',
  border: 'rgba(0,0,0,0.1)',
  text: '#0f172a',
  textSecondary: '#64748b',
  primary: '#3b82f6',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
};
```

---

## 🔍 Accessibility Notes

### Keyboard Navigation
```
Tab       → Next focusable element
Shift+Tab → Previous focusable element
Enter     → Activate button
Space     → Activate button
Escape    → Close panel/cancel action
```

### Screen Reader Labels
```javascript
<button aria-label="Start live GPS tracking">
  <Play size={16} aria-hidden="true" />
  Start Live Tracking
</button>
```

### Focus Indicators
```css
button:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}
```

---

## 📊 Performance Tips

### Optimize Rendering
- Use `React.memo()` for control panel
- Debounce GPS updates (1-2 seconds)
- Lazy load map tiles
- Limit panel markers to visible area

### Memory Management
- Clean up markers on unmount
- Remove event listeners
- Clear interval timers
- Unsubscribe from stores

---

**End of Visual Guide** ✨

*For implementation details, see [LIVE_MAPS_FEATURE.md](./LIVE_MAPS_FEATURE.md)*
