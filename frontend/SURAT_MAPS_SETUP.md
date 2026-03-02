# 🗺️ Surat, India - Google Maps iframe Setup

## ✅ **DONE! Surat is Now the Default Location**

**Default Coordinates:** Surat, Gujarat, India  
**Latitude:** 21.1702°N  
**Longitude:** 72.8311°E  

---

## 🎉 What Changed

### 1. **Default Location Updated**
- **Before:** Delhi NCR (28.54°N, 77.33°E)
- **After:** Surat, India (21.17°N, 72.83°E) ✅

### 2. **Surat Added to Quick Presets**
Now the first city in the preset list:
```
[📍 Surat]         ← NEW! First button
[📍 Delhi NCR]
[📍 Mumbai]
[📍 Bangalore]
[📍 Hyderabad]
[📍 Chennai]
[📍 Ahmedabad]
[📍 Pune]
```

---

## 🚀 How to Use (10 Seconds)

### Step 1: Open Solar Design Studio
1. Navigate to any project
2. Click "Design Studio" button

### Step 2: Click [2D] Button
- **Map loads showing Surat, India** 🎉
- Satellite view centered on Surat

### Step 3: Start Designing
1. **Zoom in** to see buildings
2. **Center crosshair** on a roof
3. **Click "Add Roof at This Location"**
4. **Switch to [3D]** to customize

---

## 📍 Surat Location Details

### City Information
- **City:** Surat
- **State:** Gujarat
- **Country:** India
- **Known For:** Diamond & textile hub, solar installations

### Coordinates
```
Latitude:  21.1702°N  (21.170200)
Longitude: 72.8311°E  (72.831100)
```

### Google Maps iframe URL
```html
<iframe
  width="600"
  height="450"
  style="border:0"
  loading="lazy"
  allowfullscreen
  referrerpolicy="no-referrer-when-downgrade"
  src="https://maps.google.com/maps?q=21.1702,72.8311&t=k&z=20&output=embed">
</iframe>
```

---

## 🎯 What You'll See

### Control Panel (Left)
```
┌──────────────────────────┐
│ 📍 Google Maps View      │
│                          │
│ Location:                │
│ Lat: 21.170200           │ ← Surat coordinates
│ Lng: 72.831100           │
│                          │
│ Quick Locations:         │
│ [📍 Surat] ← ACTIVE     │
│ [📍 Delhi NCR]           │
│ [📍 Mumbai]              │
│ [📍 Bangalore]           │
│ ... more cities          │
│                          │
│ Map View:                │
│ [🛰️ Satellite] ← Active │
│ [🗺️ Roadmap]             │
│                          │
│ Zoom: 20 ▬▬▬●▬▬          │
│                          │
│ [🏠 Add Roof Here]       │
└──────────────────────────┘
```

### Map View (Center)
```
┌───────────────────────────────────┐
│                                   │
│   GOOGLE MAPS - SURAT, INDIA     │
│                                   │
│      [Buildings & Roads]          │
│                                   │
│            ⊕  ← Crosshair        │
│       (21.17°N, 72.83°E)         │
│                                   │
│    [Satellite view of Surat]      │
│     showing city buildings        │
│                                   │
└───────────────────────────────────┘
```

---

## 🏙️ Popular Areas in Surat (For Solar Installations)

You can quickly navigate to these areas:

### Commercial Areas
```javascript
{ name: 'Udhna', lat: 21.1670, lng: 72.8595 }
{ name: 'Adajan', lat: 21.1959, lng: 72.7933 }
{ name: 'Vesu', lat: 21.1513, lng: 72.7690 }
{ name: 'Althan', lat: 21.2281, lng: 72.8453 }
```

### Industrial Areas
```javascript
{ name: 'GIDC Pandesara', lat: 21.1382, lng: 72.8236 }
{ name: 'Sachin GIDC', lat: 21.0850, lng: 72.8875 }
{ name: 'Kadodara', lat: 21.2650, lng: 72.9530 }
```

### Residential Areas
```javascript
{ name: 'Parle Point', lat: 21.1833, lng: 72.8284 }
{ name: 'Piplod', lat: 21.1697, lng: 72.7832 }
{ name: 'City Light', lat: 21.1878, lng: 72.7944 }
```

---

## 🎬 Quick Workflow: Design Solar for Surat Building

### Complete Example (2 minutes):

1. **Open Design Studio** → Click [2D] button
   - Map loads showing Surat

2. **Navigate to specific area:**
   - Enter coordinates (e.g., Adajan: `21.1959`, `72.7933`)
   - Or click "Surat" preset to recenter

3. **Zoom to building level:**
   - Set zoom to 20-21
   - Identify target building on satellite

4. **Add solar roof:**
   - Center crosshair on building roof
   - Click "Add Roof at This Location"
   - Alert confirms roof created

5. **Switch to 3D view:**
   - Click [3D] button
   - See roof in 3D scene
   - Customize size, height, tilt

6. **Add solar panels:**
   - Click "Auto-Fill Panels"
   - Or manually place panels
   - See capacity calculations

7. **Save design:**
   - Click "Save Design" in toolbar
   - Export as JSON/PDF

---

## 🔧 Technical Details

### iframe Implementation
```javascript
// Map2DIframe.js
const Map2DIframe = ({ lat = 21.1702, lng = 72.8311 }) => {
  // Default to Surat, India
  const [mapCenter, setMapCenter] = useState({ lat, lng });
  
  const getDirectMapUrl = useCallback(() => {
    return `https://maps.google.com/maps?q=${lat},${lng}&t=k&z=20&output=embed`;
  }, [lat, lng]);
  
  return (
    <iframe
      src={getDirectMapUrl()}
      style={{ width: '100%', height: '100%', border: 'none' }}
      loading="lazy"
      allowFullScreen
      referrerPolicy="no-referrer-when-downgrade"
    />
  );
};
```

### URL Parameters
- `q=21.1702,72.8311` → Location (Surat)
- `t=k` → Satellite view
- `z=20` → Zoom level (building detail)
- `output=embed` → iframe mode

---

## 📊 Surat Solar Market Info

### Why Surat is Great for Solar:

**☀️ Solar Irradiation:** 5.5-6.0 kWh/m²/day  
**🌡️ Average Temp:** 28-32°C (good for panels)  
**🏭 Industry:** High commercial/industrial demand  
**💰 Electricity Cost:** ₹6-8/kWh (good ROI)  
**🎯 Rooftop Potential:** 2000+ MW (estimate)  

### Typical Installation Sizes:
- **Residential:** 3-5 kW
- **Commercial:** 10-50 kW
- **Industrial:** 100-500 kW

---

## 🎯 Next Steps

### Immediate Actions:
1. ✅ **Test the map** → Click [2D] button
2. ✅ **Verify Surat location** → Check coordinates
3. ✅ **Add test roof** → Click "Add Roof at This Location"
4. ✅ **Switch to 3D** → See it in 3D view

### Optional Enhancements:
1. ⏳ **Add more Surat areas** to presets
2. ⏳ **Create Surat-specific templates** (residential/commercial)
3. ⏳ **Add local solar policies** information
4. ⏳ **Integrate with Surat Municipal data** (if available)

---

## 📚 Related Documentation

- **[INSTANT_START_MAPS.md](./INSTANT_START_MAPS.md)** - Quick start guide
- **[IFRAME_MAPS_GUIDE.md](./IFRAME_MAPS_GUIDE.md)** - Full iframe documentation
- **[HOW_TO_PLACE_PANELS.md](./HOW_TO_PLACE_PANELS.md)** - Panel placement guide

---

## ✅ Verification Checklist

Test these to confirm Surat setup:

- [ ] Click [2D] button → Map loads
- [ ] Verify coordinates show `21.17, 72.83`
- [ ] Click "Surat" preset → Map stays centered
- [ ] Zoom to 20 → See building details
- [ ] Click "Add Roof" → Roof created at Surat location
- [ ] Switch to [3D] → Roof visible
- [ ] Panel placement works → Add panels in 3D

---

## 🎉 Summary

**✅ Default Location:** Surat, India  
**✅ Coordinates:** 21.1702°N, 72.8311°E  
**✅ Quick Preset:** First button in city list  
**✅ iframe URL:** Updated with Surat coordinates  
**✅ Ready to Use:** Just click [2D]!  

---

**Surat is now the default location for your Solar Design Studio! 🌞🗺️**

**Start designing solar systems for Surat buildings right away!** ⚡🏙️
