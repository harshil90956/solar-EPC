# 🚀 Quick Setup: Google Maps Solar Panel Placement

## Step 1: Get Google Maps API Key (2 minutes)

1. **Go to Google Cloud Console:**
   - Visit: https://console.cloud.google.com/google/maps-apis
   - Sign in with your Google account

2. **Create/Select Project:**
   - Create new project or select existing one
   - Name it: "Solar Design Studio"

3. **Enable Required APIs:**
   Click "Enable APIs and Services" and enable:
   - ✅ **Maps JavaScript API**
   - ✅ **Places API**
   - ✅ **Geocoding API**

4. **Create API Key:**
   - Go to "Credentials" tab
   - Click "Create Credentials" → "API Key"
   - Copy the API key (looks like: `AIzaSyC...`)

5. **Restrict API Key (Recommended):**
   - Click "Edit API key"
   - **Application restrictions:** HTTP referrers
     - Add: `http://localhost:3000/*`
     - Add: `https://yourdomain.com/*` (for production)
   - **API restrictions:** Restrict key
     - Select: Maps JavaScript API, Places API, Geocoding API
   - Save

---

## Step 2: Add API Key to Your Project

**Open this file in your editor:**
```
/Users/karandudhat/Desktop/solar-sass/solar-crm/.env
```

**Replace this line:**
```
REACT_APP_GOOGLE_MAPS_API_KEY=YOUR_API_KEY_HERE
```

**With your actual key:**
```
REACT_APP_GOOGLE_MAPS_API_KEY=AIzaSyC...your-actual-key
```

**Save the file!**

---

## Step 3: Restart Development Server

```bash
# Stop the current server (Ctrl+C in terminal)
# Then restart:
cd /Users/karandudhat/Desktop/solar-sass/solar-crm
npm start
```

---

## Step 4: Test Solar Panel Placement (1 minute)

### Method 1: Switch to 2D View (Existing Roof)

You already have "Roof 1" created in 3D. Now use it in 2D:

1. **Switch to 2D View:**
   - Look at the top toolbar
   - Click the **"2D"** button (next to 3D button)
   - Google Maps satellite view will load

2. **You'll see:**
   - Floating control panel on the left
   - Google satellite map in the center
   - Your "Roof 1" boundary (blue polygon)

3. **Place Panels Manually:**
   - Click **"Enable Manual Mode"** (turns orange)
   - Click anywhere **inside the blue polygon**
   - Blue panel markers appear instantly! ✨
   - Drag markers to reposition

4. **Place Panels in Grid:**
   - Set **Rows: 5**, **Cols: 8**
   - Click **"Auto-Place 5×8 Grid"**
   - 40 panels placed instantly! 🎉

### Method 2: Start Fresh in 2D

1. **Switch to 2D View** (toolbar button)

2. **Start GPS Tracking (Optional):**
   - Click **"Start Live Tracking"**
   - Allow location permission
   - Map centers on your location with green marker

3. **Draw Roof Boundary:**
   - Click **"🗺️ Draw Roof Boundary"**
   - Click 4-8 points around a building on satellite map
   - Double-click to finish
   - Blue polygon appears

4. **Place Solar Panels:**
   - **Manual Mode** is auto-enabled
   - Click inside boundary → panels appear!
   - Or use **Grid Auto-Fill** for fast placement

5. **Switch to 3D View:**
   - Click **"3D"** button in toolbar
   - See your panels in 3D! 🌟

---

## 🎯 Quick Reference: Features Available

### 📍 Live GPS Tracking
- **Button:** "Start Live Tracking"
- **Shows:** Green marker with accuracy circle
- **Auto-centers** map on your location
- **Updates** every 1-2 seconds

### 🗺️ Boundary Selection
- **Button:** "Draw Roof Boundary"
- **Click** 4-10 points on satellite map
- **Double-click** to finish polygon
- **Drag vertices** to adjust shape
- **Auto-calculates** area (m²)

### ⚡ Manual Panel Placement
- **Button:** "Enable Manual Mode" (orange)
- **Click** inside boundary → panel placed
- **Drag** panel markers to reposition
- **Validates** placement (must be inside boundary)

### ⊞ Grid Auto-Fill
- **Inputs:** Rows (1-20), Cols (1-20)
- **Button:** "Auto-Place [rows]×[cols] Grid"
- **Smart placement:** Only inside boundary
- **Even spacing** across area
- **Fast:** 100+ panels in <1 second

### 🗑️ Clear Panels
- **Button:** "Clear All Panels" (red)
- **Removes** all panel markers from map
- **Keeps** roof boundary intact

---

## 🐛 Troubleshooting

### Map shows "🛰️ Live Satellite Map View" placeholder
**Problem:** Google Maps API key not configured  
**Fix:** Complete Step 2 above + restart server

### "Geolocation is not supported"
**Problem:** Browser doesn't support GPS  
**Fix:** Use Chrome/Edge/Firefox. Manual navigation still works!

### "Access denied" or billing error
**Problem:** Google Maps API needs billing enabled  
**Fix:** 
- Go to Google Cloud Console
- Enable billing (free $200/month credit)
- Link credit card (won't charge without your permission)

### Panels not appearing when clicking
**Problem:** Manual mode not enabled OR clicking outside boundary  
**Fix:** 
1. Ensure "Manual Mode ON" (orange button)
2. Click only inside the blue polygon
3. Check console for errors (F12)

### Map tiles not loading
**Problem:** Slow internet or API quota exceeded  
**Fix:** 
- Wait 5-10 seconds for tiles to load
- Check API quota in Google Cloud Console
- Refresh page (F5)

---

## 💡 Pro Tips

1. **Use Satellite View:** Better for identifying roofs
2. **Zoom Level 20:** Perfect detail for panel placement
3. **Grid Mode First:** Place bulk panels, then fine-tune manually
4. **Save Often:** Click "Save Design" in toolbar
5. **Test on Mobile:** GPS is more accurate outdoors

---

## 📊 Expected Results

### After Setup You Can:
- ✅ See live satellite maps in 2D view
- ✅ Track your GPS location in real-time
- ✅ Draw roof boundaries on actual buildings
- ✅ Place solar panels with single clicks
- ✅ Auto-fill 40+ panels in grid layout
- ✅ Switch between 2D map and 3D visualization
- ✅ See panel count and solar capacity update live

### Example Workflow (30 seconds):
```
2D View → Draw Boundary → Set Grid 5×8 → Auto-Place → Switch to 3D → Done! ✨
```

---

## 🎬 Video Tutorial (Coming Soon)

For now, follow these steps. A video walkthrough is planned for v2.1.

---

## 📞 Need Help?

**Check these docs:**
- [LIVE_MAPS_FEATURE.md](./LIVE_MAPS_FEATURE.md) - Full technical documentation
- [TESTING_CHECKLIST.md](./TESTING_CHECKLIST.md) - Comprehensive testing guide
- [VISUAL_GUIDE.md](./VISUAL_GUIDE.md) - UI/UX reference

**Still stuck?**
- Check browser console (F12 → Console tab)
- Look for red error messages
- Screenshot and share in Slack/GitHub issues

---

**Ready to place solar panels on Google Maps! 🌞⚡**
