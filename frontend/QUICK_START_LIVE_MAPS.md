# 🚀 Quick Start: Live Google Maps + Manual Panel Placement

## ⚡ 3-Minute Setup

### Step 1: Add Google Maps API Key
```bash
# Create or edit .env file in project root
echo 'REACT_APP_GOOGLE_MAPS_API_KEY=your_actual_key_here' >> .env
```

### Step 2: Restart Dev Server
```bash
npm start
```

### Step 3: Open Solar Design Studio
1. Navigate to **Design Page** or **Survey Page**
2. Click **"Open 3D Design Studio"** button
3. Switch to **2D View** (toggle in top toolbar)

---

## 🎯 Basic Usage (30 seconds)

### **Quick Start with Grid:**
```
1. Click "🎯 Draw Roof Boundary"
2. Click 4-5 points on map (draw roof shape)
3. Set Rows: 3, Cols: 5
4. Click "Auto-Place 3×5 Grid"
✅ DONE! 15 panels placed automatically
```

### **Manual Placement:**
```
1. Draw boundary (same as above)
2. Click "➕ Enable Manual Mode"
3. Click inside blue boundary to place panels
4. Drag blue dots to reposition
✅ DONE! Custom panel layout
```

---

## 📍 Live Location Tracking

### **Enable GPS:**
```
1. Click "▶ Start Live Tracking"
2. Allow location permission in browser
3. Map auto-centers on your position
4. Green marker shows live location
```

### **Use Cases:**
- **Field Surveys** - Track position while on roof
- **Site Visits** - Mark exact installation location
- **Team Coordination** - Share live GPS coordinates
- **Area Mapping** - Walk perimeter with phone

---

## 🎨 Visual Guide

### **Control Panel Icons:**
```
📍 = GPS Location
🎯 = Draw Boundary
➕ = Manual Mode
📐 = Grid Layout
🗑️ = Clear Panels
▶ = Start Tracking
⏸️ = Stop Tracking
```

### **Map Markers:**
```
🟢 = Your Location (green circle)
🔵 = Solar Panel (blue dot)
🟦 = Selected Boundary (blue polygon)
```

---

## 💡 Pro Tips

### **Faster Workflow:**
1. **Use Grid First** - Quick layout, then manual adjust
2. **Zoom In Close** - 20+ zoom for precision
3. **Edit Vertices** - Drag polygon points after drawing
4. **Clear Often** - Start fresh if layout not working

### **Better Accuracy:**
1. **HTTPS Required** - For GPS tracking
2. **High Accuracy** - Enable in browser settings
3. **Satellite Layer** - Best for roof boundaries
4. **Mobile Device** - Better GPS than desktop

---

## 🐛 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| No GPS | Check HTTPS + browser permission |
| Can't draw | Click "Draw Boundary" button first |
| Panels won't place | Enable "Manual Mode" |
| Map not loading | Check API key in `.env` |
| Markers disappearing | Zoom in closer |

---

## 📱 Mobile Quick Guide

### **On Phone/Tablet:**
1. Open browser (Chrome recommended)
2. Go to your app URL (HTTPS)
3. Allow location when prompted
4. Use touch to draw and place panels
5. Pinch to zoom, drag to pan

### **Best Practices:**
- Use in landscape mode
- Enable high accuracy GPS
- Stay connected to internet
- Take screenshots for records

---

## 🎯 Example Workflow

### **Complete Site Survey (5 minutes):**

```
1️⃣ START TRACKING
   Click "Start Live Tracking"
   Walk to installation site
   
2️⃣ DRAW BOUNDARY
   Click "Draw Roof Boundary"
   Walk around roof perimeter
   Click at each corner
   
3️⃣ AUTO-FILL PANELS
   Set grid: 5 rows × 8 cols
   Click "Auto-Place Grid"
   
4️⃣ FINE-TUNE
   Enable "Manual Mode"
   Add/remove panels as needed
   Drag to perfect positions
   
5️⃣ REVIEW IN 3D
   Toggle to 3D View
   Check panel placement
   
6️⃣ EXPORT
   Click toolbar "Export"
   Save design JSON
   
✅ DONE!
```

---

## 🔑 Keyboard Shortcuts (Future)

```
G = Toggle GPS tracking
B = Draw boundary
M = Manual mode
Ctrl+Z = Undo
Ctrl+Y = Redo
Delete = Remove selected panel
Escape = Deselect all
```

---

## 📊 Quick Stats

After placement, you'll see:
- **Panels Placed:** Count of installed panels
- **Selected Roof:** Currently active roof
- **DC Capacity:** Total kW (in right panel)
- **Module Count:** Total panel count
- **Area Coverage:** Percentage used

---

## 🎉 That's It!

You're now ready to:
✅ Track live GPS location  
✅ Draw roof boundaries  
✅ Place panels manually  
✅ Auto-fill with grids  
✅ Export for production  

**Need help?** Check `LIVE_MAPS_FEATURE.md` for full documentation.

---

**Happy Designing!** ☀️🏗️
