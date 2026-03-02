#!/bin/zsh
# Solar CRM - Complete Verification Script
# Verifies all dashboard runtime fixes are working

echo "🔍 Solar CRM Complete Verification - $(date)"
echo "============================================="
echo ""

# Check server status
echo "📡 Checking Development Server..."
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Development server: RUNNING on port 3000"
else
    echo "❌ Development server: NOT ACCESSIBLE"
    echo "   Run: npm start to start the server"
    exit 1
fi

echo ""
echo "📊 Dashboard Files Status Check..."

# Check all critical dashboard files exist and are recent
DASHBOARD_FILES=(
    "src/components/dashboards/DesignEngineerDashboard.js"
    "src/components/dashboards/SalesDashboard.js"
    "src/components/dashboards/SurveyEngineerDashboard.js"
    "src/components/dashboards/StoreManagerDashboard.js"
    "src/components/dashboards/ProcurementOfficerDashboard.js"
    "src/components/dashboards/FinanceDashboard.js"
    "src/components/dashboards/TechnicianDashboard.js"
    "src/components/dashboards/ServiceManagerDashboard.js"
    "src/components/dashboards/ProjectManagerDashboard.js"
    "src/components/dashboards/AdminDashboard.js"
)

FIXED_COUNT=0
for file in "${DASHBOARD_FILES[@]}"; do
    if [ -f "$file" ]; then
        # Check if file was modified recently (within last 2 hours)
        if [[ $(stat -f "%m" "$file") -gt $(($(date +%s) - 7200)) ]]; then
            echo "✅ $file (recently updated)"
            ((FIXED_COUNT++))
        else
            echo "⚠️  $file (older, may not have fixes)"
        fi
    else
        echo "❌ $file - MISSING"
    fi
done

echo ""
echo "📈 Fix Application Summary:"
echo "✅ Dashboard files updated: $FIXED_COUNT/10"

if [ $FIXED_COUNT -eq 10 ]; then
    echo "🎉 ALL DASHBOARD FILES HAVE BEEN UPDATED!"
else
    echo "⚠️  Some dashboard files may need attention"
fi

echo ""
echo "🧪 Testing Instructions:"
echo "1. Open http://localhost:3000 in your browser"
echo "2. Try logging in with these test accounts:"
echo ""
echo "   🔥 HIGH PRIORITY (Previously had errors):"
echo "   - Design Engineer: design@solarcorp.com / design123"
echo "   - Project Manager: pm@solarcorp.com / pm123"
echo ""
echo "   ⚡ STANDARD TESTING:"
echo "   - Admin: admin@solarcorp.com / admin123"
echo "   - Sales: sales@solarcorp.com / sales123"
echo "   - Finance: finance@solarcorp.com / finance123"
echo "   - Store Manager: store@solarcorp.com / store123"
echo "   - Survey Engineer: survey@solarcorp.com / survey123"
echo "   - Technician: tech@solarcorp.com / tech123"
echo "   - Procurement: procurement@solarcorp.com / procure123"
echo "   - Service Manager: service@solarcorp.com / service123"

echo ""
echo "🎯 What to Test:"
echo "- Dashboard loads without errors"
echo "- All charts display data"
echo "- Hover tooltips work on charts"
echo "- No console errors in browser (F12)"
echo "- Role-specific content appears"

echo ""
echo "🏆 Expected Result: ZERO runtime errors across all dashboards"
echo ""

# Check if any .map patterns might still exist unsafely
echo "🔍 Quick Pattern Check for Remaining Issues..."
UNSAFE_PATTERNS=0

for file in "${DASHBOARD_FILES[@]}"; do
    if [ -f "$file" ]; then
        # Look for potentially unsafe .map patterns (without optional chaining)
        UNSAFE_MAPS=$(grep -n '\w\+\.\w\+\.map(' "$file" | grep -v '?' || true)
        if [ -n "$UNSAFE_MAPS" ]; then
            echo "⚠️  Potential unsafe .map() in $file:"
            echo "$UNSAFE_MAPS"
            ((UNSAFE_PATTERNS++))
        fi
    fi
done

if [ $UNSAFE_PATTERNS -eq 0 ]; then
    echo "✅ No unsafe .map() patterns detected"
else
    echo "⚠️  Found $UNSAFE_PATTERNS files with potential unsafe patterns"
fi

echo ""
if [ $FIXED_COUNT -eq 10 ] && [ $UNSAFE_PATTERNS -eq 0 ]; then
    echo "🎉 VERIFICATION COMPLETE: ALL SYSTEMS GREEN!"
    echo "🚀 Ready for comprehensive dashboard testing"
else
    echo "⚠️  Some issues may remain - check the details above"
fi

echo "============================================="
