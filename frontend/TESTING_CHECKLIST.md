# 🧪 Solar Design Studio - Testing Checklist

## Overview
This document provides a comprehensive testing guide for the **Live Google Maps Integration** with real-time GPS tracking, boundary selection, and manual panel placement features.

**Last Updated:** February 28, 2026  
**Version:** 1.0.0  
**Status:** ✅ Ready for Testing

---

## ✅ Pre-Testing Setup

### 1. Environment Configuration
- [ ] Google Maps API Key configured in `.env`
- [ ] API Key has required libraries enabled:
  - `drawing` (for polygon tools)
  - `geometry` (for point-in-polygon checks)
  - `places` (for location search)
- [ ] Development server running on `http://localhost:3000`
- [ ] Browser location permissions enabled

### 2. Browser Requirements
- [ ] Chrome/Edge (recommended for full WebRTC support)
- [ ] Firefox (good compatibility)
- [ ] Safari (may have location permission quirks)
- [ ] Mobile browsers (iOS Safari, Chrome Mobile)

### 3. Device Requirements
- [ ] Desktop with WiFi location services
- [ ] Mobile device with GPS enabled
- [ ] Good internet connection (for satellite imagery)

---

## 🗺️ Feature Testing Matrix

### A. Live GPS Tracking

#### Desktop Testing
1. **Initial State**
   - [ ] Open Solar Design Studio
   - [ ] Switch to 2D view mode
   - [ ] Verify floating control panel appears on left side
   - [ ] Check "Start Live Tracking" button is visible

2. **Start Tracking**
   - [ ] Click "Start Live Tracking"
   - [ ] Browser prompts for location permission
   - [ ] Grant permission
   - [ ] Green user marker appears on map
   - [ ] Green accuracy circle appears around marker
   - [ ] Button changes to "Stop Live Tracking" with green border
   - [ ] Location coordinates display below button (Lat/Lng/Accuracy)

3. **Tracking Behavior**
   - [ ] Map auto-centers to user location
   - [ ] Coordinates update in real-time (check decimal changes)
   - [ ] Accuracy value shows (typically 5-50m on desktop)
   - [ ] Marker stays centered as location updates

4. **Stop Tracking**
   - [ ] Click "Stop Live Tracking"
   - [ ] Button returns to blue "Start Live Tracking"
   - [ ] Location coordinates remain visible (frozen)
   - [ ] Marker stays at last position

#### Mobile Testing (Critical!)
1. **GPS Accuracy**
   - [ ] Test outdoors for best GPS signal
   - [ ] Accuracy should be <10m outdoors
   - [ ] May be 20-100m indoors
   - [ ] Check if marker updates smoothly while walking

2. **Battery Impact**
   - [ ] Monitor battery drain during 5-minute tracking session
   - [ ] Stop tracking when not actively using

3. **Permission Handling**
   - [ ] Test "Block" permission → shows error message
   - [ ] Test "Allow Once" → works for current session
   - [ ] Test "Allow Always" → persistent permission

---

### B. Boundary Selection

1. **Drawing Polygon**
   - [ ] Click "🗺️ Draw Roof Boundary" button
   - [ ] Button turns blue (active state)
   - [ ] Cursor changes to crosshair on map
   - [ ] Click 4-10 points to create polygon
   - [ ] Click first point again to complete (or double-click)
   - [ ] Polygon appears with blue fill and stroke

2. **Polygon Properties**
   - [ ] Check right panel shows new roof added
   - [ ] Roof has auto-generated label (e.g., "Roof 2")
   - [ ] Dimensions calculated (width × depth)
   - [ ] Area calculated (in square meters)
   - [ ] Coordinates stored

3. **Edit Polygon**
   - [ ] Hover over polygon edges → vertices appear
   - [ ] Drag vertex to adjust shape
   - [ ] Dimensions update in real-time
   - [ ] Area recalculates automatically

4. **Multiple Polygons**
   - [ ] Draw 2-3 different roof boundaries
   - [ ] Each gets unique color/label
   - [ ] Can select different roofs from right panel
   - [ ] Active roof highlighted on map

5. **Edge Cases**
   - [ ] Try self-intersecting polygon → still completes
   - [ ] Very small polygon (2m × 2m) → minimum size enforced
   - [ ] Very large polygon (100m × 100m) → works fine
   - [ ] Complex shape (10+ vertices) → handles correctly

---

### C. Manual Panel Placement

1. **Enable Manual Mode**
   - [ ] Draw a roof boundary first
   - [ ] Check "⚡ Panel Placement" section appears
   - [ ] Click "Enable Manual Mode"
   - [ ] Button turns orange with "Manual Mode ON"
   - [ ] Orange instruction banner appears at bottom:
     > 🖱️ Click inside boundary to place solar panels

2. **Place Single Panel**
   - [ ] Click anywhere inside the polygon
   - [ ] Blue circular marker appears instantly
   - [ ] Marker has white border (visible on satellite)
   - [ ] Right panel panel count increments
   - [ ] Can place multiple panels by clicking

3. **Placement Validation**
   - [ ] Click outside polygon → nothing happens ✅
   - [ ] Click on polygon edge → should work (edge case)
   - [ ] Click near but outside → correctly rejected
   - [ ] Overlapping panels allowed (for now)

4. **Drag-to-Move**
   - [ ] Hover over placed panel marker
   - [ ] Cursor changes to pointer/hand
   - [ ] Click and drag marker
   - [ ] Marker follows mouse smoothly
   - [ ] Can drag to new position inside boundary
   - [ ] Cannot drag outside boundary (stays at edge)
   - [ ] Release mouse to set new position

5. **Panel Visibility**
   - [ ] Zoom in → panels stay visible (scale appropriately)
   - [ ] Zoom out → panels still visible but smaller
   - [ ] Pan map → panels move with map correctly
   - [ ] Switch between map types (Satellite/Roadmap) → panels persist

---

### D. Grid Auto-Fill

1. **Configure Grid**
   - [ ] Locate "Grid Layout" inputs (Rows and Cols)
   - [ ] Default values: Rows=3, Cols=5
   - [ ] Change Rows to 4 → input updates
   - [ ] Change Cols to 6 → input updates
   - [ ] Try invalid values (0, negative, 100+) → constrained to 1-20

2. **Auto-Place Grid (Simple Case)**
   - [ ] Draw rectangular boundary (~20m × 12m)
   - [ ] Set Rows=3, Cols=5
   - [ ] Click "Auto-Place 3×5 Grid"
   - [ ] 15 panels appear instantly
   - [ ] Panels arranged in neat grid
   - [ ] Even spacing between panels
   - [ ] All panels inside boundary

3. **Auto-Place Grid (Complex Shape)**
   - [ ] Draw L-shaped or irregular polygon
   - [ ] Set Rows=5, Cols=8
   - [ ] Click "Auto-Place 5×8 Grid"
   - [ ] Only panels inside boundary are placed
   - [ ] Edge panels may be missing (correct behavior)
   - [ ] Grid respects polygon constraints

4. **Multiple Grid Fills**
   - [ ] Place initial 3×5 grid
   - [ ] Change to 2×3 grid
   - [ ] Click "Auto-Place 2×3 Grid" again
   - [ ] New 6 panels added (doesn't clear old ones)
   - [ ] Total panels = 15 + 6 = 21 ✅

5. **Large Grid Test**
   - [ ] Draw large boundary (50m × 30m)
   - [ ] Set Rows=10, Cols=15
   - [ ] Click "Auto-Place 10×15 Grid"
   - [ ] Wait 1-3 seconds (150 panels)
   - [ ] All panels placed correctly
   - [ ] No browser lag/freeze
   - [ ] Map remains interactive

---

### E. Clear Panels

1. **Clear All Markers**
   - [ ] Place 10-20 panels manually or via grid
   - [ ] Click "🗑️ Clear All Panels" (red button)
   - [ ] All blue markers disappear instantly
   - [ ] Map remains at same position
   - [ ] Stats show "Panels Placed: 0"
   - [ ] Can place new panels immediately

2. **Clear vs Delete Roof**
   - [ ] Clear panels → boundary polygon stays
   - [ ] Delete roof from right panel → both polygon and panels removed

---

### F. 2D ↔ 3D Synchronization

1. **Place Panels in 2D, View in 3D**
   - [ ] Draw roof boundary in 2D view
   - [ ] Place 20 panels manually/grid
   - [ ] Switch to 3D view (toolbar toggle)
   - [ ] See roof plane rendered in 3D
   - [ ] Panels visible as blue rectangles on roof
   - [ ] Panel positions match 2D placement
   - [ ] Can rotate/zoom 3D scene

2. **Edit in 3D, View in 2D**
   - [ ] In 3D view, select a panel
   - [ ] Move panel using transform controls
   - [ ] Switch back to 2D view
   - [ ] Panel marker moved to new position on map
   - [ ] Coordinates updated correctly

3. **Delete in 2D, Check 3D**
   - [ ] In 2D view, clear all panels
   - [ ] Switch to 3D view
   - [ ] Panels removed from 3D scene
   - [ ] Roof geometry remains

---

### G. Stats & Right Panel Integration

1. **Real-Time Stats**
   - [ ] Control panel shows "Panels Placed: 0" initially
   - [ ] Place 1 panel → updates to "Panels Placed: 1"
   - [ ] Place 5 more → updates to "Panels Placed: 6"
   - [ ] Clear panels → resets to "Panels Placed: 0"

2. **Selected Roof Display**
   - [ ] No roof selected → shows "Selected Roof: None"
   - [ ] Draw boundary → auto-selects, shows "Selected Roof: Roof 1"
   - [ ] Draw 2nd boundary → shows "Selected Roof: Roof 2"
   - [ ] Click different roof in right panel list → updates selection

3. **Solar Analysis Updates**
   - [ ] Place 10 panels → right panel DC capacity updates
   - [ ] Add 10 more → capacity increases (e.g., 5.4 kW → 10.8 kW)
   - [ ] Generation estimate updates (kWh/year)
   - [ ] Panel count matches manual placement count

---

### H. Performance Testing

1. **Low-End Device**
   - [ ] Test on older laptop (4GB RAM, integrated GPU)
   - [ ] Place 50 panels via grid
   - [ ] Map remains smooth (>30fps panning/zooming)
   - [ ] No memory leaks after 10 minutes

2. **High-Volume Scenario**
   - [ ] Place 200+ panels (10×20 grid on large roof)
   - [ ] Zoom in/out rapidly
   - [ ] Switch 2D↔3D multiple times
   - [ ] No crashes or freezes

3. **Network Conditions**
   - [ ] Test on slow 3G connection
   - [ ] Satellite tiles load progressively (acceptable)
   - [ ] Panel placement still instant (not network-dependent)
   - [ ] GPS updates may be delayed (expected)

---

### I. Error Handling

1. **Location Permission Denied**
   - [ ] Block location permission
   - [ ] Click "Start Live Tracking"
   - [ ] Shows error message/alert
   - [ ] Button remains in "Start" state
   - [ ] Can still use other features (boundary, panels)

2. **No GPS Signal**
   - [ ] Go to basement/underground
   - [ ] Start tracking
   - [ ] High accuracy value (>100m) or timeout
   - [ ] Shows best-effort location (WiFi triangulation)

3. **Invalid Google Maps API Key**
   - [ ] Remove API key from `.env`
   - [ ] Restart dev server
   - [ ] Shows fallback UI:
     > ⚠️ Google Maps API Key Missing
   - [ ] Instructions to add key displayed

4. **Browser Compatibility**
   - [ ] Test on IE11 → shows "Browser not supported" (expected)
   - [ ] Test on old Android (<2020) → may have slower GPS

---

### J. UI/UX Testing

1. **Control Panel Visibility**
   - [ ] Panel overlays map but doesn't block important areas
   - [ ] Can drag panel (if draggable) or move to corner
   - [ ] Semi-transparent background → see map behind
   - [ ] Readable text contrast (white text on dark background)

2. **Button States**
   - [ ] Hover effects work (brightness change)
   - [ ] Active states clear (color/border changes)
   - [ ] Disabled states if applicable (grayed out)
   - [ ] Loading states for async operations (if implemented)

3. **Responsive Design**
   - [ ] Test on 1920×1080 desktop → comfortable spacing
   - [ ] Test on 1366×768 laptop → no clipping
   - [ ] Test on 768px tablet → control panel stacks vertically
   - [ ] Test on 375px mobile → touch targets at least 44px

4. **Accessibility**
   - [ ] Keyboard navigation (Tab through buttons)
   - [ ] Enter/Space to activate buttons
   - [ ] Screen reader announces button states
   - [ ] Color contrast passes WCAG AA (3:1 minimum)

---

### K. Integration Testing

1. **Save/Load Design**
   - [ ] Place 50 panels in 2D
   - [ ] Click "Save Design" in toolbar
   - [ ] Enter design name → saves JSON
   - [ ] Reload page
   - [ ] Click "Load Design" → select saved file
   - [ ] All panels restored at correct positions
   - [ ] Map centers on loaded design

2. **Export Features**
   - [ ] Export as JSON → includes panel coordinates (lat/lng + x/z)
   - [ ] Export as PDF → shows 2D map snapshot
   - [ ] Export as CSV → lists all panel positions
   - [ ] Data includes boundary polygon vertices

3. **Multi-Roof Scenario**
   - [ ] Draw 3 separate roofs (e.g., house + garage + shed)
   - [ ] Place panels on Roof 1 (5×4 grid)
   - [ ] Switch to Roof 2, place 3×3 grid
   - [ ] Switch to Roof 3, place manually
   - [ ] All panels persist when switching roofs
   - [ ] Each roof tracks its own panels

---

## 🐛 Known Issues & Workarounds

### Issue 1: GPS Drift Indoors
**Symptom:** Location jumps around when tracking indoors  
**Workaround:** Stop tracking when indoors, use manual map positioning  
**Fix:** Not fixable (hardware limitation)

### Issue 2: Polygon Self-Intersection
**Symptom:** Drawing overlapping edges creates weird shapes  
**Workaround:** Undo and redraw carefully  
**Fix:** Could add validation to prevent self-intersection

### Issue 3: Panel Overlap Not Prevented
**Symptom:** Can place panels on top of each other  
**Workaround:** Be careful with manual placement, use grid mode  
**Fix:** Add collision detection in `placePanelAtLocation()`

### Issue 4: No Undo for Panel Placement
**Symptom:** Can't undo individual panel placements  
**Workaround:** Use "Clear All Panels" and start over  
**Fix:** Integrate with global undo/redo system in store

---

## 📊 Testing Results Template

```markdown
## Test Session Report

**Date:** [YYYY-MM-DD]  
**Tester:** [Name]  
**Device:** [e.g., MacBook Pro M1, iPhone 13]  
**Browser:** [e.g., Chrome 120]  
**Duration:** [e.g., 45 minutes]

### Features Tested
- [ ] Live GPS Tracking
- [ ] Boundary Selection
- [ ] Manual Panel Placement
- [ ] Grid Auto-Fill
- [ ] Clear Panels
- [ ] 2D↔3D Sync

### Bugs Found
1. [Bug description]
   - **Severity:** Critical/High/Medium/Low
   - **Steps to reproduce:**
   - **Expected:**
   - **Actual:**

### Performance Notes
- Average FPS: [e.g., 55-60 fps]
- Memory usage: [e.g., 250 MB baseline, 450 MB with 100 panels]
- Load time: [e.g., 2.3s initial map load]

### Recommendations
- [Improvement suggestions]
```

---

## 🚀 Automated Testing (Future)

### Unit Tests
```javascript
// Example test cases
describe('Map2DEnhanced', () => {
  it('should place panel inside boundary', () => {...});
  it('should reject panel outside boundary', () => {...});
  it('should convert lat/lng to X/Z correctly', () => {...});
  it('should create grid with correct spacing', () => {...});
});
```

### E2E Tests (Cypress)
```javascript
describe('Live Maps Flow', () => {
  it('should track location and place panels', () => {
    cy.visit('/design-studio');
    cy.get('[data-testid="start-tracking"]').click();
    cy.get('[data-testid="draw-boundary"]').click();
    // ... simulate drawing polygon
    cy.get('[data-testid="auto-place-grid"]').click();
    cy.get('[data-testid="panel-count"]').should('contain', '15');
  });
});
```

---

## ✅ Sign-Off Checklist

Before marking this feature as **Production Ready**, ensure:

- [ ] All A-K test sections completed
- [ ] No critical bugs blocking basic functionality
- [ ] Tested on at least 3 different devices
- [ ] Tested on at least 2 different browsers
- [ ] Mobile GPS tracking works outdoors
- [ ] Performance acceptable with 100+ panels
- [ ] Documentation complete (user guide + API docs)
- [ ] Code review approved by team lead
- [ ] Security review passed (API key not exposed in client)
- [ ] Accessibility audit passed (WCAG AA)

**Status:** ⏳ Pending Testing  
**Approved By:** _______________  
**Date:** _______________

---

## 📞 Support

**Questions?** Contact the development team:
- GitHub Issues: [Link to repo]
- Slack: #solar-design-studio
- Email: support@solar-crm.com

**Documentation:**
- [LIVE_MAPS_FEATURE.md](./LIVE_MAPS_FEATURE.md) - Detailed technical docs
- [QUICK_START_LIVE_MAPS.md](./QUICK_START_LIVE_MAPS.md) - 3-minute quick start
- [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - Developer reference

---

*Happy Testing! 🎯*
