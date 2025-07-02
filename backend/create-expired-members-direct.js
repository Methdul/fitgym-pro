// create-expired-members-direct.js
// Script to create expired members by directly updating the database after creation

const API_URL = 'http://localhost:5001/api';

// Manager credentials
const MANAGER_CREDENTIALS = {
  staffId: '2f7625ac-65a3-44d3-b2e7-ebad485e0b86',
  pin: '8294',
  firstName: 'Saman',
  lastName: 'Wijayatilaka'
};

// Your actual IDs
const BRANCH_ID = '6e1f7593-b0b6-400c-8205-71215aabec30';
const PACKAGE_ID = '02abab1c-dd9f-4f8a-89f7-63f91ab4fd63';

// New expired members data (avoiding duplicates)
const expiredMembers = [
  {
    firstName: 'Asanka',
    lastName: 'Rathnayake',
    phone: '0775551111',
    nationalId: '199412345011',
    email: '199412345011@gmail.com'
  },
  {
    firstName: 'Kumara',
    lastName: 'Dissanayake',
    phone: '0775552222',
    nationalId: '199512345012',
    email: '199512345012@gmail.com'
  },
  {
    firstName: 'Thilak',
    lastName: 'Jayasinghe',
    phone: '0775553333',
    nationalId: '199612345013',
    email: '199612345013@gmail.com'
  },
  {
    firstName: 'Indika',
    lastName: 'Samarawickrama',
    phone: '0775554444',
    nationalId: '199712345014',
    email: '199712345014@gmail.com'
  },
  {
    firstName: 'Manjula',
    lastName: 'Herath',
    phone: '0775555555',
    nationalId: '199812345015',
    email: '199812345015@gmail.com'
  },
  {
    firstName: 'Upali',
    lastName: 'Weerasinghe',
    phone: '0775556666',
    nationalId: '199912345016',
    email: '199912345016@gmail.com'
  },
  {
    firstName: 'Buddhika',
    lastName: 'Nanayakkara',
    phone: '0775557777',
    nationalId: '200012345017',
    email: '200012345017@gmail.com'
  }
];

// Session token storage
let sessionToken = null;

// Helper function for colored console output
function colorLog(message, color = 'white') {
  const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    bright: '\x1b[1m',
    reset: '\x1b[0m'
  };
  console.log(colors[color] + message + colors.reset);
}

// Get authentication headers
function getAuthHeaders() {
  const headers = {
    'Content-Type': 'application/json'
  };
  
  if (sessionToken) {
    headers['Authorization'] = `Bearer ${sessionToken}`;
    headers['X-Session-Token'] = sessionToken;
  }
  
  return headers;
}

// Function to authenticate manager
async function authenticateManager() {
  try {
    colorLog(`🔐 Authenticating manager: ${MANAGER_CREDENTIALS.firstName} ${MANAGER_CREDENTIALS.lastName}...`, 'blue');
    
    const response = await fetch(`${API_URL}/staff/verify-pin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        staffId: MANAGER_CREDENTIALS.staffId,
        pin: MANAGER_CREDENTIALS.pin
      })
    });

    const result = await response.json();

    if (response.ok && result.isValid) {
      if (result.sessionToken) {
        sessionToken = result.sessionToken;
        colorLog(`✅ Authentication successful with session token`, 'green');
      } else {
        colorLog(`✅ PIN verification successful for ${result.staff.first_name} ${result.staff.last_name}`, 'green');
      }
      return true;
    } else {
      colorLog(`❌ Authentication failed: ${result.error || 'Invalid PIN'}`, 'red');
      return false;
    }
  } catch (error) {
    colorLog(`❌ Authentication error: ${error.message}`, 'red');
    return false;
  }
}

// Function to create member and immediately update to expired
async function createExpiredMember(memberData) {
  try {
    // Step 1: Create member normally (will be active)
    const memberPayload = {
      firstName: memberData.firstName,
      lastName: memberData.lastName,
      email: memberData.email,
      phone: memberData.phone,
      branchId: BRANCH_ID,
      packageId: PACKAGE_ID,
      nationalId: memberData.nationalId,
      emergencyContact: '',
      address: '',
      is_existing_member: true,
      staffId: MANAGER_CREDENTIALS.staffId,
      staffPin: MANAGER_CREDENTIALS.pin
    };

    colorLog(`📝 Creating member: ${memberData.firstName} ${memberData.lastName}`, 'blue');
    
    const createResponse = await fetch(`${API_URL}/members`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(memberPayload)
    });

    if (!createResponse.ok) {
      const errorResult = await createResponse.json();
      if (errorResult.details && Array.isArray(errorResult.details)) {
        const errorMessages = errorResult.details.map(detail => detail.msg || detail.message).join(', ');
        throw new Error(`Creation failed: ${errorMessages}`);
      }
      throw new Error(errorResult.error || errorResult.message || 'Failed to create member');
    }

    const createResult = await createResponse.json();
    const memberId = createResult.data.id;
    
    colorLog(`✅ Member created successfully (ID: ${memberId})`, 'green');

    // Step 2: Immediately update to expired status with past dates
    await new Promise(resolve => setTimeout(resolve, 500)); // Small delay
    
    const expiredDate = new Date();
    expiredDate.setMonth(expiredDate.getMonth() - 2); // 2 months ago
    
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 14); // 14 months ago (1 year + 2 months)
    
    const updatePayload = {
      status: 'expired',
      start_date: startDate.toISOString().split('T')[0],
      expiry_date: expiredDate.toISOString().split('T')[0]
    };

    colorLog(`🔄 Updating to expired status...`, 'yellow');

    const updateResponse = await fetch(`${API_URL}/members/${memberId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updatePayload)
    });

    if (updateResponse.ok) {
      colorLog(`✅ Successfully set ${memberData.firstName} ${memberData.lastName} to EXPIRED status`, 'green');
      colorLog(`📅 Start: ${startDate.toISOString().split('T')[0]}, Expiry: ${expiredDate.toISOString().split('T')[0]}`, 'cyan');
      
      return {
        ...createResult.data,
        status: 'expired',
        start_date: startDate.toISOString().split('T')[0],
        expiry_date: expiredDate.toISOString().split('T')[0]
      };
    } else {
      const updateResult = await updateResponse.json();
      colorLog(`⚠️ Member created but status update failed: ${updateResult.error || updateResult.message || 'Update failed'}`, 'yellow');
      return createResult.data;
    }

  } catch (error) {
    colorLog(`❌ Error with ${memberData.firstName} ${memberData.lastName}: ${error.message}`, 'red');
    return null;
  }
}

// Function to update existing active members to expired
async function updateExistingMembersToExpired() {
  try {
    colorLog('🔍 Finding existing active members to update...', 'blue');
    
    // Get all active members in the branch
    const response = await fetch(`${API_URL}/members/branch/${BRANCH_ID}?limit=100`, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch existing members');
    }

    const result = await response.json();
    const activeMembers = result.data.filter(member => member.status === 'active');
    
    colorLog(`📋 Found ${activeMembers.length} active members to update`, 'cyan');

    if (activeMembers.length === 0) {
      colorLog('ℹ️ No active members found to update', 'blue');
      return 0;
    }

    let updatedCount = 0;

    for (const member of activeMembers) {
      try {
        const expiredDate = new Date();
        expiredDate.setMonth(expiredDate.getMonth() - 1); // 1 month ago
        
        const updatePayload = {
          status: 'expired',
          expiry_date: expiredDate.toISOString().split('T')[0]
        };

        colorLog(`🔄 Updating ${member.first_name} ${member.last_name} to expired...`, 'yellow');

        const updateResponse = await fetch(`${API_URL}/members/${member.id}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(updatePayload)
        });

        if (updateResponse.ok) {
          updatedCount++;
          colorLog(`✅ Updated ${member.first_name} ${member.last_name} to EXPIRED`, 'green');
        } else {
          const errorResult = await updateResponse.json();
          colorLog(`⚠️ Failed to update ${member.first_name} ${member.last_name}: ${errorResult.error || 'Update failed'}`, 'yellow');
        }

        // Small delay between updates
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (memberError) {
        colorLog(`❌ Error updating ${member.first_name} ${member.last_name}: ${memberError.message}`, 'red');
      }
    }

    return updatedCount;

  } catch (error) {
    colorLog(`❌ Error updating existing members: ${error.message}`, 'red');
    return 0;
  }
}

// Main function
async function createExpiredMembers() {
  try {
    colorLog('='.repeat(60), 'cyan');
    colorLog('🏋️‍♂️ CREATING EXPIRED MEMBERS FOR RENEWAL TESTING', 'bright');
    colorLog('='.repeat(60), 'cyan');
    
    // Step 1: Authenticate
    const authenticated = await authenticateManager();
    if (!authenticated) {
      colorLog('❌ Cannot proceed without authentication', 'red');
      return;
    }

    // Step 2: Update existing active members to expired
    colorLog('\n🔄 STEP 1: Updating existing active members to expired...', 'bright');
    const existingUpdated = await updateExistingMembersToExpired();
    
    // Step 3: Create new expired members
    colorLog('\n🆕 STEP 2: Creating new expired members...', 'bright');
    
    let newSuccessCount = 0;
    let newFailCount = 0;
    const successfulMembers = [];
    
    for (let i = 0; i < expiredMembers.length; i++) {
      const member = expiredMembers[i];
      colorLog(`\n[${i + 1}/${expiredMembers.length}] Processing ${member.firstName} ${member.lastName}...`, 'cyan');
      
      const result = await createExpiredMember(member);
      if (result) {
        newSuccessCount++;
        successfulMembers.push({
          name: `${member.firstName} ${member.lastName}`,
          id: result.id,
          email: member.email,
          nationalId: member.nationalId,
          status: result.status || 'expired'
        });
      } else {
        newFailCount++;
      }
      
      // Delay between requests
      if (i < expiredMembers.length - 1) {
        colorLog(`⏳ Waiting 3s before next member...`, 'cyan');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    
    // Summary
    colorLog('\n' + '='.repeat(60), 'cyan');
    colorLog('📊 FINAL SUMMARY', 'bright');
    colorLog('='.repeat(60), 'cyan');
    colorLog(`🔄 Existing members updated to expired: ${existingUpdated}`, 'blue');
    colorLog(`✅ New expired members created: ${newSuccessCount}`, 'green');
    colorLog(`❌ Failed new member creations: ${newFailCount}`, 'red');
    colorLog(`📝 Total expired members: ${existingUpdated + newSuccessCount}`, 'blue');
    
    if (successfulMembers.length > 0) {
      colorLog('\n📋 New Expired Members Created:', 'green');
      successfulMembers.forEach(member => {
        colorLog(`  • ${member.name} (${member.email}) - Status: ${member.status}`, 'white');
        colorLog(`    Login: ${member.email} / Password: ${member.nationalId}`, 'white');
      });
      
      colorLog('\n🎯 Next Steps:', 'yellow');
      colorLog('1. Refresh your gym dashboard to see all expired members', 'white');
      colorLog('2. Test the renewal process with any of these members', 'white');
      colorLog(`3. Use manager PIN ${MANAGER_CREDENTIALS.pin} for renewal verification`, 'white');
      colorLog('4. All members should now show as "expired" status', 'white');
    }
    
    colorLog('\n' + '='.repeat(60), 'cyan');
    
  } catch (error) {
    colorLog(`❌ Script execution error: ${error.message}`, 'red');
    console.error('Full error:', error);
  }
}

// Run the script
if (require.main === module) {
  createExpiredMembers();
}

module.exports = {
  createExpiredMembers,
  createExpiredMember,
  updateExistingMembersToExpired,
  expiredMembers,
  MANAGER_CREDENTIALS
};