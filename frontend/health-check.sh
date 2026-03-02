#!/bin/bash
# Solar CRM - Quick Health Check Script

echo "🔍 Solar CRM Health Check - $(date)"
echo "=================================="

# Check if server is running
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ Development server: RUNNING"
else
    echo "❌ Development server: NOT ACCESSIBLE"
    exit 1
fi

# Check key files exist
FILES=(
    "src/components/dashboards/ProjectManagerDashboard.js"
    "src/components/dashboards/SalesDashboard.js"  
    "src/components/dashboards/FinanceDashboard.js"
    "src/components/dashboards/RoleDashboardProvider.js"
    "src/pages/Dashboard.js"
)

echo ""
echo "📁 Critical Files Check:"
for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file - MISSING"
    fi
done

echo ""
echo "🧪 Quick Test Instructions:"
echo "1. Open http://localhost:3000 in browser"
echo "2. Login as Project Manager: pm@solarcorp.com / pm123"
echo "3. Verify dashboard loads without errors"
echo "4. Test tooltip hover on charts"
echo "5. Try other roles: sales@solarcorp.com / sales123"

echo ""
echo "🎯 Focus Testing Areas:"
echo "- Project Manager Dashboard (had runtime errors)"
echo "- Sales Dashboard (formatter fixes applied)"
echo "- Finance Dashboard (multiple tooltip fixes)"
echo "- All chart hover interactions"

echo ""
echo "✅ READY FOR COMPREHENSIVE TESTING"
