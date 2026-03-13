/**
 * Quick Fix: Remove Invalid Custom Role from Current User
 * 
 * Run this in browser console (F12) to fix the current logged-in user's invalid role
 */

(async function fixMyRole() {
  try {
    // Get token and user info
    const token = localStorage.getItem('solar_token');
    const userId = localStorage.getItem('solar_user_id');
    
    if (!token || !userId) {
      console.error('❌ Not logged in! Please login first.');
      return;
    }
    
    console.log('🔍 Checking your role...');
    console.log('User ID:', userId);
    
    // Fetch current user data
    const response = await fetch('/api/auth/me', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch user data');
    }
    
    const userData = await response.json();
    console.log('Current user data:', userData);
    
    const currentRoleId = userData.roleId;
    console.log('\n📋 Current Role ID:', currentRoleId);
    
    if (!currentRoleId || !currentRoleId.startsWith('custom_')) {
      console.log('✅ You don\'t have a custom role. No fix needed!');
      return;
    }
    
    // Fetch all custom roles
    const rolesResponse = await fetch('/api/settings/custom-roles', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const rolesData = await rolesResponse.json();
    const customRoles = rolesData.data || rolesData;
    const availableRoleIds = Object.keys(customRoles);
    
    console.log('\n📋 Available Custom Roles:', availableRoleIds);
    console.log('Your Role ID:', currentRoleId);
    
    if (!availableRoleIds.includes(currentRoleId)) {
      console.log('\n❌ Your role does NOT exist in the database!');
      console.log('⚡ Removing invalid role reference...\n');
      
      // Update user to remove invalid roleId
      const updateResponse = await fetch(`/api/hrm/employees/${userId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          roleId: null  // Remove invalid role
        })
      });
      
      if (updateResponse.ok) {
        console.log('✅ Successfully removed invalid role!');
        console.log('ℹ️  You will now use default permissions');
        console.log('🔄 Please refresh the page (Ctrl+Shift+R)\n');
      } else {
        console.error('❌ Failed to update user:', await updateResponse.text());
      }
    } else {
      console.log('✅ Your role exists in database. No fix needed!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
})();
