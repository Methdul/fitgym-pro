// test-pin.js
const staffId = '471832ff-9c0d-481a-baed-0eb56963fb57';
const apiUrl = 'http://localhost:5001/api';

async function checkPin() {
  console.log('🔍 Checking PIN status...');
  
  try {
    const response = await fetch(`${apiUrl}/staff/debug/pin-check/${staffId}`);
    const data = await response.json();
    console.log('📋 Current PIN status:', data);
    return data;
  } catch (error) {
    console.error('❌ Error checking PIN:', error);
  }
}

async function setPin(newPin) {
  console.log(`🔧 Setting new PIN to: ${newPin}`);
  
  try {
    const response = await fetch(`${apiUrl}/staff/debug/set-pin/${staffId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ newPin })
    });
    const data = await response.json();
    console.log('✅ PIN update result:', data);
    return data;
  } catch (error) {
    console.error('❌ Error setting PIN:', error);
  }
}

async function verifyPin(pin) {
  console.log(`🔐 Testing PIN verification with: ${pin}`);
  
  try {
    const response = await fetch(`${apiUrl}/staff/verify-pin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ staffId, pin })
    });
    const data = await response.json();
    console.log('🔐 Verification result:', data);
    return data;
  } catch (error) {
    console.error('❌ Error verifying PIN:', error);
  }
}

// Run the tests
async function runTests() {
  console.log('=================================');
  console.log('🧪 PIN Debug Test Script');
  console.log('=================================\n');
  
  // Check current status
  await checkPin();
  
  // Set PIN to 1234
  await setPin('1234');
  
  // Check status again
  await checkPin();
  
  // Test verification
  await verifyPin('1234');
  await verifyPin('1212'); // Test wrong PIN
  
  console.log('\n=================================');
  console.log('✅ Tests complete!');
  console.log('=================================');
}

// Run if called directly
if (require.main === module) {
  runTests();
}