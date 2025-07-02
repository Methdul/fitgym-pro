// add-expired-members.js
// Script to add expired members for renewal testing

const API_URL = 'http://localhost:5001/api'; // Change if your backend runs on different port

// Manager credentials for PIN verification
const MANAGER_CREDENTIALS = {
  staffId: '2f7625ac-65a3-44d3-b2e7-ebad485e0b86', // Saman's actual staff ID
  pin: '8294',
  firstName: 'Saman',
  lastName: 'Wijayatilaka'
};

// Your actual IDs
const BRANCH_ID = '6e1f7593-b0b6-400c-8205-71215aabec30';
const PACKAGE_ID = '02abab1c-dd9f-4f8a-89f7-63f91ab4fd63';

// Expired members data
const expiredMembers = [
  {
    firstName: 'Kamal',
    lastName: 'Perera',
    phone: '0771111111',
    nationalId: '199512345001',
    email: '199512345001@gmail.com'
  },
  {
    firstName: 'Nimal',
    lastName: 'Silva',
    phone: '0772222222',
    nationalId: '199612345002',
    email: '199612345002@gmail.com'
  },
  {
    firstName: 'Sunil',
    lastName: 'Fernando',
    phone: '0773333333',
    nationalId: '199712345003',
    email: '199712345003@gmail.com'
  },
  {
    firstName: 'Chaminda',
    lastName: 'Rajapaksa',
    phone: '0774444444',
    nationalId: '199812345004',
    email: '199812345004@gmail.com'
  },
  {
    firstName: 'Pradeep',
    lastName: 'Wickramasinghe',
    phone: '0775555555',
    nationalId: '199912345005',
    email: '199912345005@gmail.com'
  },
  {
    firstName: 'Lalith',
    lastName: 'Gunasekara',
    phone: '0776666666',
    nationalId: '199012345006',
    email: '199012345006@gmail.com'
  },
  {
    firstName: 'Janaka',
    lastName: 'Bandara',
    phone: '0777777777',
    nationalId: '199112345007',
    email: '199112345007@gmail.com'
  },
  {
    firstName: 'Mahesh',
    lastName: 'Amarasinghe',
    phone: '0778888888',
    nationalId: '199212345008',
    email: '199212345008@gmail.com'
  },
  {
    firstName: 'Gayan',
    lastName: 'Samaraweera',
    phone: '0779999999',
    nationalId: '199312345009',
    email: '199312345009@gmail.com'
  },
  {
    firstName: 'Roshan',
    lastName: 'Mendis',
    phone: '0771010101',
    nationalId: '199412345010',
    email: '199412345010@gmail.com'
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

// Function to verify manager PIN and get session token
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
      // Store session token if provided
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

// Function to create expired member directly in database format
async function addExpiredMember(memberData) {
  try {
    const expiredDate = new Date();
    expiredDate.setMonth(expiredDate.getMonth() - 2); // 2 months ago
    
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 3); // 3 months ago
    
    // Use exact format that backend expects based on your validation
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
      is_existing_member: true, // For auth account creation
      // ADD THESE REQUIRED FIELDS FOR VALIDATION:
      staffId: MANAGER_CREDENTIALS.staffId,
      staffPin: MANAGER_CREDENTIALS.pin
    };

    colorLog(`📝 Adding expired member: ${memberData.firstName} ${memberData.lastName}`, 'blue');
    
    const response = await fetch(`${API_URL}/members`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(memberPayload)
    });

    const result = await response.json();

    if (!response.ok) {
      // Show detailed error for debugging
      if (result.details && Array.isArray(result.details)) {
        const errorMessages = result.details.map(detail => detail.msg || detail.message).join(', ');
        throw new Error(`Validation failed: ${errorMessages}`);
      }
      throw new Error(result.error || result.message || 'Failed to create member');
    }

    colorLog(`✅ Successfully added: ${memberData.firstName} ${memberData.lastName} (ID: ${result.data.id})`, 'green');
    
    // Update member to expired status
    await updateMemberToExpired(result.data.id, expiredDate);
    
    return result.data;
    
  } catch (error) {
    colorLog(`❌ Error adding ${memberData.firstName} ${memberData.lastName}: ${error.message}`, 'red');
    console.error('Full error details:', error);
    return null;
  }
}

// Function to update member to expired status
async function updateMemberToExpired(memberId, expiredDate) {
  try {
    const updatePayload = {
      status: 'expired',
      expiry_date: expiredDate.toISOString().split('T')[0] // YYYY-MM-DD format
    };

    const response = await fetch(`${API_URL}/members/${memberId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updatePayload)
    });

    const result = await response.json();

    if (response.ok) {
      colorLog(`🔄 Updated member status to expired`, 'yellow');
    } else {
      colorLog(`⚠️ Could not update status: ${result.error}`, 'yellow');
    }
    
  } catch (error) {
    colorLog(`⚠️ Status update error: ${error.message}`, 'yellow');
  }
}

// Function to test API health
async function checkAPIHealth() {
  try {
    colorLog('🏥 Checking API health...', 'blue');
    
    const response = await fetch(`${API_URL}/health`);
    const result = await response.json();
    
    if (response.ok) {
      colorLog(`✅ API is healthy: ${result.message}`, 'green');
      return true;
    } else {
      colorLog(`❌ API health check failed`, 'red');
      return false;
    }
    
  } catch (error) {
    colorLog(`❌ Cannot reach API: ${error.message}`, 'red');
    return false;
  }
}

// Function to validate branch and package exist
async function validateBranchAndPackage() {
  try {
    colorLog('🔍 Validating branch and package...', 'blue');
    
    // Check branch
    const branchResponse = await fetch(`${API_URL}/branches/${BRANCH_ID}`, {
      headers: getAuthHeaders()
    });
    
    if (!branchResponse.ok) {
      colorLog(`❌ Branch validation failed: ${branchResponse.status}`, 'red');
      return false;
    }
    
    const branchData = await branchResponse.json();
    colorLog(`✅ Branch found: ${branchData.data?.name || 'Unknown'}`, 'green');
    
    // For package validation, we may need to use branch-specific endpoint
    try {
      const packageResponse = await fetch(`${API_URL}/packages/branch/${BRANCH_ID}`, {
        headers: getAuthHeaders()
      });
      
      if (packageResponse.ok) {
        const packageData = await packageResponse.json();
        const targetPackage = packageData.data?.find(pkg => pkg.id === PACKAGE_ID);
        
        if (targetPackage) {
          colorLog(`✅ Package found: ${targetPackage.name}`, 'green');
          return true;
        } else {
          colorLog(`❌ Package ${PACKAGE_ID} not found in branch packages`, 'red');
          return false;
        }
      } else {
        colorLog(`⚠️ Could not validate package (${packageResponse.status}), continuing anyway...`, 'yellow');
        return true; // Continue even if package validation fails
      }
    } catch (packageError) {
      colorLog(`⚠️ Package validation error: ${packageError.message}, continuing anyway...`, 'yellow');
      return true; // Continue even if package validation fails
    }
    
  } catch (error) {
    colorLog(`❌ Validation error: ${error.message}`, 'red');
    return false;
  }
}

// Main function to run the script
async function addAllExpiredMembers() {
  try {
    colorLog('='.repeat(60), 'cyan');
    colorLog('🏋️‍♂️ ADDING EXPIRED MEMBERS FOR RENEWAL TESTING', 'bright');
    colorLog('='.repeat(60), 'cyan');
    
    // Step 1: Check API health
    const apiHealthy = await checkAPIHealth();
    if (!apiHealthy) {
      colorLog('❌ Cannot proceed - API is not responding', 'red');
      return;
    }
    
    // Step 2: Authenticate manager
    const authenticated = await authenticateManager();
    if (!authenticated) {
      colorLog('❌ Cannot proceed without valid manager authentication', 'red');
      return;
    }
    
    // Step 3: Validate branch and package
    const validData = await validateBranchAndPackage();
    if (!validData) {
      colorLog('❌ Cannot proceed with invalid branch/package data', 'red');
      return;
    }
    
    // Step 4: Add all expired members
    colorLog(`\n📋 Adding ${expiredMembers.length} expired members...`, 'yellow');
    
    let successCount = 0;
    let failCount = 0;
    const successfulMembers = [];
    
    for (let i = 0; i < expiredMembers.length; i++) {
      const member = expiredMembers[i];
      colorLog(`\n[${i + 1}/${expiredMembers.length}] Processing ${member.firstName} ${member.lastName}...`, 'cyan');
      
      const result = await addExpiredMember(member);
      if (result) {
        successCount++;
        successfulMembers.push({
          name: `${member.firstName} ${member.lastName}`,
          id: result.id,
          email: member.email,
          nationalId: member.nationalId
        });
      } else {
        failCount++;
      }
      
      // Small delay between requests to avoid rate limiting
      if (i < expiredMembers.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Step 5: Summary
    colorLog('\n' + '='.repeat(60), 'cyan');
    colorLog('📊 SUMMARY', 'bright');
    colorLog('='.repeat(60), 'cyan');
    colorLog(`✅ Successfully added: ${successCount} members`, 'green');
    colorLog(`❌ Failed to add: ${failCount} members`, 'red');
    colorLog(`📝 Total attempted: ${expiredMembers.length} members`, 'blue');
    
    if (successCount > 0) {
      colorLog('\n📋 Successfully Added Members:', 'green');
      successfulMembers.forEach(member => {
        colorLog(`  • ${member.name} (${member.email})`, 'white');
        colorLog(`    Login: ${member.email} / Password: ${member.nationalId}`, 'white');
      });
      
      colorLog('\n🎯 Next Steps:', 'yellow');
      colorLog('1. Check your gym dashboard to see the expired members', 'white');
      colorLog('2. Test the renewal process with these members', 'white');
      colorLog(`3. Use manager PIN ${MANAGER_CREDENTIALS.pin} for renewal verification`, 'white');
      colorLog('4. All members should show as "expired" status', 'white');
    }
    
    colorLog('\n' + '='.repeat(60), 'cyan');
    
  } catch (error) {
    colorLog(`❌ Script execution error: ${error.message}`, 'red');
    console.error('Full error:', error);
  }
}

// Check if we're running this file directly
if (require.main === module) {
  addAllExpiredMembers();
}

// Export for use as module
module.exports = {
  addAllExpiredMembers,
  addExpiredMember,
  authenticateManager,
  expiredMembers,
  MANAGER_CREDENTIALS,
  BRANCH_ID,
  PACKAGE_ID
};