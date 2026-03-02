# 🚀 Quick Reference: Solar Design Studio

## Store Usage Examples

### 1. Get Solar Analysis Data
```javascript
const { solarAnalysis } = useSolarStore();

console.log(solarAnalysis.totalPanels);        // 0
console.log(solarAnalysis.totalDCCapacity);    // 0 (kW)
console.log(solarAnalysis.estimatedGeneration); // 0 (kWh/year)
```

### 2. Add a Roof
```javascript
const { addRoof } = useSolarStore();

addRoof({
  points: [[0,0], [20,0], [20,12], [0,12]], // Polygon coordinates
  bounds: { minX: 0, maxX: 20, minY: 0, maxY: 12 },
  height: 3,
  label: "Main Roof",
  area: 240
});
```

### 3. Auto-Fill Panels
```javascript
const { autoFillPanels, selectedRoofId } = useSolarStore();

const panelCount = autoFillPanels(selectedRoofId);
console.log(`Added ${panelCount} panels`);
```

### 4. Update Panel Settings
```javascript
const { updatePanelSettings } = useSolarStore();

updatePanelSettings({
  width: 2.0,      // meters
  height: 1.0,     // meters
  power: 400,      // watts
  tilt: 25,        // degrees
  azimuth: 180,    // degrees (south)
  spacing: 0.05,   // meters
  orientation: 'landscape'
});
```

### 5. Undo/Redo
```javascript
const { undo, redo, canUndo, canRedo } = useSolarStore();

if (canUndo()) {
  undo();
}

if (canRedo()) {
  redo();
}
```

### 6. Save/Load Design
```javascript
const { saveDesign, loadDesign, exportDesign } = useSolarStore();

// Get JSON string
const json = saveDesign();

// Load from JSON
loadDesign(json);

// Download as file
exportDesign();
```

### 7. Sun Simulation
```javascript
const { updateSunSimulation, sunSimulation } = useSolarStore();

updateSunSimulation({
  hour: 14,        // 2 PM
  day: 172,        // June 21st
  latitude: 28.6,
  longitude: 77.2
});

console.log(sunSimulation.enabled); // false
```

### 8. Multi-Select Panels
```javascript
const { selectPanels, movePanels, rotatePanels } = useSolarStore();

// Select multiple panels
selectPanels(['panel1', 'panel2', 'panel3']);

// Move selected panels
movePanels(['panel1', 'panel2'], { x: 1, z: 0 });

// Rotate selected panels
rotatePanels(['panel1', 'panel2'], { x: 5, y: 0, z: 0 });
```

---

## Property Quick Reference

| Display | Property Path | Type | Default |
|---------|--------------|------|---------|
| DC Size | `solarAnalysis.totalDCCapacity` | number | 0 |
| Panel Count | `solarAnalysis.totalPanels` | number | 0 |
| Generation | `solarAnalysis.estimatedGeneration` | number | 0 |
| Panel Width | `panelSettings.width` | number | 2.0 |
| Panel Height | `panelSettings.height` | number | 1.0 |
| Panel Power | `panelSettings.power` | number | 400 |
| Tilt | `panelSettings.tilt` | number | 20 |
| Azimuth | `panelSettings.azimuth` | number | 180 |
| Roof Height | `roofSettings.height` | number | 3.0 |
| Sun Hour | `sunSimulation.hour` | number | 12 |
| Sun Day | `sunSimulation.day` | number | 172 |

---

## Safe Access Pattern

Always use optional chaining and defaults:

```javascript
// ✅ GOOD - Safe
const dcSize = (solarAnalysis?.totalDCCapacity || 0).toFixed(2);
const tilt = panelSettings?.tilt || 20;
const power = panelSettings?.power || 400;

// ❌ BAD - Unsafe
const dcSize = dcSize.toFixed(2); // Can crash!
const tilt = tilt; // undefined error!
```

---

## Keyboard Shortcuts (Future)

```
Ctrl+Z      - Undo
Ctrl+Y      - Redo
Delete      - Delete selected panels
Escape      - Deselect all
Ctrl+S      - Save design
Ctrl+A      - Select all panels
```

---

## Common Patterns

### Check if Roof Selected
```javascript
const { selectedRoofId, roofs } = useSolarStore();

if (selectedRoofId) {
  const roof = roofs.find(r => r.id === selectedRoofId);
  console.log(`Selected: ${roof.label}`);
}
```

### Get Panels on Roof
```javascript
const { panels, selectedRoofId } = useSolarStore();

const roofPanels = panels.filter(p => p.roofId === selectedRoofId);
console.log(`Panels on roof: ${roofPanels.length}`);
```

### Calculate Total Capacity
```javascript
const { panels, panelSettings } = useSolarStore();

const totalKW = (panels.length * (panelSettings?.power || 400)) / 1000;
console.log(`Total: ${totalKW.toFixed(2)} kW`);
```

---

## Testing Commands

```bash
# Development
npm start

# Build
npm run build

# Lint
npm run lint

# Test (if configured)
npm test
```

---

## Integration Points

### From DesignPage
```javascript
import SolarDesignStudio from '../components/SolarDesignStudio/SolarDesignStudio';

<SolarDesignStudio 
  design={design}
  onClose={() => setStudioDesign(null)}
/>
```

### From SurveyPage
```javascript
<SolarDesignStudio 
  survey={survey}
  onClose={() => setStudioSurvey(null)}
/>
```

---

## Troubleshooting

### "Cannot read toFixed" Error
**Solution:** Use optional chaining
```javascript
// Before
dcSize.toFixed(2)

// After
(solarAnalysis?.totalDCCapacity || 0).toFixed(2)
```

### Panels Not Appearing
**Solution:** Check if roof is selected and has valid polygon
```javascript
const { selectedRoofId, roofs } = useSolarStore();
const roof = roofs.find(r => r.id === selectedRoofId);

if (!roof || !roof.points || roof.points.length < 3) {
  console.error('Invalid roof for panel placement');
}
```

### Undo Not Working
**Solution:** Ensure `saveStateToHistory()` is called before modifications
```javascript
// This is automatic in all store actions
get().saveStateToHistory();
// ... make changes
```

---

## Performance Tips

1. **Use Multi-Select:** Batch operations are more efficient
2. **Limit Panel Count:** Auto-fill intelligently limits panels
3. **Use Snap-to-Grid:** Reduces calculation overhead
4. **Debounce Sliders:** For smooth performance during dragging

---

## API Endpoints (Future)

```javascript
// Save to backend
POST /api/designs
{
  name: "Design 1",
  data: saveDesign()
}

// Load from backend
GET /api/designs/:id

// Update design
PUT /api/designs/:id
```

---

**Last Updated:** February 28, 2026  
**Version:** 1.0.0  
**Status:** Production Ready ✅
