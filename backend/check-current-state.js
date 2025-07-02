// backend/check-current-state.js - Check what constraints exist now

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function checkCurrentState() {
  console.log('🔍 CHECKING CURRENT DATABASE STATE...\n');

  try {
    // Test what happens when we try to update user_id
    console.log('🧪 Testing user_id update...');
    
    const { data: testResult, error: testError } = await supabase
      .from('members')
      .update({ user_id: 'bb081c2a-9ab4-4a4a-ab77-92debdb99d03' })
      .eq('email', '798@gmail.com')
      .select();

    if (testError) {
      console.log('❌ UPDATE FAILS:', testError.message);
      console.log('❌ Error code:', testError.code);
      console.log('❌ Error details:', testError.details);
      
      if (testError.message.includes('foreign key constraint')) {
        console.log('\n💡 DIAGNOSIS: Foreign key constraint still exists');
        
        if (testError.message.includes('table "users"')) {
          console.log('💡 Constraint points to custom "users" table');
          console.log('💡 We need to either:');
          console.log('   1. Remove the constraint completely, OR');
          console.log('   2. Create missing records in "users" table');
        } else if (testError.message.includes('auth.users')) {
          console.log('💡 Constraint points to "auth.users" table');
        }
      }
      
    } else {
      console.log('✅ UPDATE WORKS! No foreign key blocking');
      console.log('✅ Member 798 is now linked:', testResult);
      
      // Test login
      console.log('\n🔐 Testing login...');
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: '798@gmail.com',
        password: '798'
      });

      if (loginError) {
        console.log('❌ Login fails:', loginError.message);
      } else {
        console.log('✅ Login works! 798@gmail.com can log in');
      }
    }

  } catch (error) {
    console.error('💥 Check failed:', error.message);
  }

  console.log('\n🎯 RECOMMENDATION:');
  console.log('Based on the results above, we\'ll know what to do next.');
}

checkCurrentState();