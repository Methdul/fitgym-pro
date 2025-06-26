// test-pin.js - Enhanced PIN Testing Script
const staffId = '471832ff-9c0d-481a-baed-0eb56963fb57'; // Replace with actual staff ID
const apiUrl = 'http://localhost:5001/api';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function colorLog(message, color = 'reset') {
  console.log(colors[color] + message + colors.reset);
}

async function checkPin() {
  colorLog('🔍 Checking PIN status...', 'blue');
  
  try {
    const response = await fetch(`${apiUrl}/staff/debug/pin-check/${staffId}`);
    const data = await response.json();
    
    colorLog('📋 Current PIN status:', 'cyan');
    console.log(JSON.stringify(data, null, 2));
    
    // Analyze PIN status
    if (data.hasSecurePin && !data.hasLegacyPin) {
      colorLog('✅ Staff is using SECURE PIN system (pin_hash)', 'green');
    } else if (data.hasLegacyPin && !data.hasSecurePin) {
      colorLog('⚠️  Staff is using LEGACY PIN system (pin)', 'yellow');
    } else if (data.hasLegacyPin && data.hasSecurePin) {
      colorLog('🔄 Staff has BOTH pin types (migration needed)', 'yellow');
    } else {
      colorLog('❌ Staff has NO PIN set', 'red');
    }
    
    return data;
  } catch (error) {
    colorLog('❌ Error checking PIN: ' + error.message, 'red');
    return null;
  }
}

async function setPin(newPin) {
  colorLog(`🔧 Setting new PIN to: ${newPin}`, 'blue');
  
  try {
    const response = await fetch(`${apiUrl}/staff/debug/set-pin/${staffId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ newPin })
    });
    const data = await response.json();
    
    if (data.status === 'success') {
      colorLog('✅ PIN update result: ' + data.message, 'green');
    } else {
      colorLog('❌ PIN update failed: ' + data.error, 'red');
    }
    
    return data;
  } catch (error) {
    colorLog('❌ Error setting PIN: ' + error.message, 'red');
    return null;
  }
}

async function verifyPin(pin) {
  colorLog(`🔐 Testing PIN verification with: ${pin}`, 'blue');
  
  try {
    const response = await fetch(`${apiUrl}/staff/verify-pin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ staffId, pin })
    });
    const data = await response.json();
    
    if (data.isValid) {
      colorLog('✅ Verification SUCCESS: PIN is valid', 'green');
    } else {
      colorLog('❌ Verification FAILED: ' + data.error, 'red');
    }
    
    console.log('🔐 Full verification result:', data);
    return data;
  } catch (error) {
    colorLog('❌ Error verifying PIN: ' + error.message, 'red');
    return null;
  }
}

async function testRenewalAuth(pin) {
  colorLog(`🔄 Testing renewal authentication with: ${pin}`, 'blue');
  
  try {
    // This tests the renewals route PIN verification
    // Note: This will fail with other validation errors, but PIN should be verified
    const response = await fetch(`${apiUrl}/renewals/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        staffId, 
        staffPin: pin,
        // Dummy data (will fail validation but PIN should be checked first)
        memberId: '00000000-0000-0000-0000-000000000000',
        packageId: '00000000-0000-0000-0000-000000000000',
        paymentMethod: 'cash',
        amountPaid: 100,
        durationMonths: 1
      })
    });
    const data = await response.json();
    
    if (data.error === 'Invalid PIN') {
      colorLog('❌ Renewal PIN verification FAILED', 'red');
    } else if (data.error && data.error !== 'Invalid PIN') {
      colorLog('✅ Renewal PIN verification SUCCESS (failed on other validation)', 'green');
    } else {
      colorLog('🎉 Renewal process would succeed!', 'green');
    }
    
    console.log('🔄 Renewal test result:', data);
    return data;
  } catch (error) {
    colorLog('❌ Error testing renewal auth: ' + error.message, 'red');
    return null;
  }
}

async function migrateAllPins() {
  colorLog('🚀 Running PIN migration for all staff...', 'blue');
  
  try {
    const response = await fetch(`${apiUrl}/staff/debug/migrate-pins`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    const data = await response.json();
    
    if (data.status === 'success') {
      colorLog(`✅ Migration completed: ${data.message}`, 'green');
      if (data.migrated && data.migrated.length > 0) {
        colorLog('📋 Migrated staff:', 'cyan');
        data.migrated.forEach(staff => {
          console.log(`  - ${staff.name} (${staff.id})`);
        });
      }
    } else {
      colorLog('❌ Migration failed: ' + data.error, 'red');
    }
    
    return data;
  } catch (error) {
    colorLog('❌ Error running migration: ' + error.message, 'red');
    return null;
  }
}

// Run comprehensive tests
async function runComprehensiveTests() {
  colorLog('='.repeat(60), 'cyan');
  colorLog('🧪 COMPREHENSIVE PIN SYSTEM TEST', 'bright');
  colorLog('='.repeat(60), 'cyan');
  
  // Step 1: Check current PIN status
  colorLog('\n📋 STEP 1: Checking current PIN status', 'yellow');
  const initialStatus = await checkPin();
  
  if (!initialStatus) {
    colorLog('❌ Cannot proceed - staff not found', 'red');
    return;
  }
  
  // Step 2: Set a known PIN using secure system
  colorLog('\n🔧 STEP 2: Setting secure PIN (1234)', 'yellow');
  await setPin('1234');
  
  // Step 3: Verify new status
  colorLog('\n📋 STEP 3: Checking updated PIN status', 'yellow');
  await checkPin();
  
  // Step 4: Test staff verification
  colorLog('\n🔐 STEP 4: Testing staff PIN verification', 'yellow');
  await verifyPin('1234'); // Correct PIN
  await verifyPin('9999'); // Wrong PIN
  
  // Step 5: Test renewal authentication
  colorLog('\n🔄 STEP 5: Testing renewal authentication', 'yellow');
  await testRenewalAuth('1234'); // Correct PIN
  
  // Step 6: Test different PIN
  colorLog('\n🔧 STEP 6: Testing with different PIN (5678)', 'yellow');
  await setPin('5678');
  await verifyPin('5678'); // Should work
  await verifyPin('1234'); // Should fail now
  
  colorLog('\n' + '='.repeat(60), 'cyan');
  colorLog('✅ COMPREHENSIVE TESTS COMPLETE!', 'bright');
  colorLog('='.repeat(60), 'cyan');
}

// Basic tests (original functionality)
async function runBasicTests() {
  colorLog('='.repeat(50), 'cyan');
  colorLog('🧪 BASIC PIN TEST SCRIPT', 'bright');
  colorLog('='.repeat(50), 'cyan');
  
  // Check current status
  await checkPin();
  
  // Set PIN to 1234
  await setPin('1234');
  
  // Check status again
  await checkPin();
  
  // Test verification
  await verifyPin('1234');
  await verifyPin('1212'); // Test wrong PIN
  
  colorLog('\n' + '='.repeat(50), 'cyan');
  colorLog('✅ BASIC TESTS COMPLETE!', 'bright');
  colorLog('='.repeat(50), 'cyan');
}

// Command line interface
const args = process.argv.slice(2);
const command = args[0];

if (command === 'comprehensive' || command === 'full') {
  runComprehensiveTests();
} else if (command === 'migrate') {
  colorLog('🚀 Running PIN migration only...', 'blue');
  migrateAllPins();
} else if (command === 'check') {
  colorLog('🔍 Checking PIN status only...', 'blue');
  checkPin();
} else if (command === 'set' && args[1]) {
  colorLog(`🔧 Setting PIN to: ${args[1]}`, 'blue');
  setPin(args[1]);
} else if (command === 'verify' && args[1]) {
  colorLog(`🔐 Verifying PIN: ${args[1]}`, 'blue');
  verifyPin(args[1]);
} else {
  // Default: run basic tests
  runBasicTests();
}

// Export functions for programmatic use
module.exports = {
  checkPin,
  setPin,
  verifyPin,
  testRenewalAuth,
  migrateAllPins,
  runBasicTests,
  runComprehensiveTests
};