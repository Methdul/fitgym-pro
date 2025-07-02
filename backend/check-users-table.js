// backend/check-users-table.js - Check the users table issue

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

async function checkUsersTable() {
  console.log('🔍 CHECKING USERS TABLE ISSUE...\n');

  try {
    // Step 1: Check what's in the custom users table
    console.log('📊 Step 1: Checking custom users table...');
    const { data: customUsers, error: customError } = await supabase
      .from('users')
      .select('*');

    if (customError) {
      console.log('❌ Cannot access users table:', customError.message);
    } else {
      console.log(`📋 Custom users table has ${customUsers.length} records:`);
      customUsers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.first_name || 'No name'} ${user.last_name || ''} (${user.email})`);
        console.log(`   ID: ${user.id || user.auth_user_id}`);
      });
    }

    // Step 2: Check what's in auth.users
    console.log('\n🔐 Step 2: Checking auth.users...');
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    console.log(`📋 Auth users table has ${authUsers.users.length} records:`);
    
    // Show first few auth users
    authUsers.users.slice(0, 5).forEach((user, index) => {
      console.log(`${index + 1}. ${user.email}`);
      console.log(`   Auth ID: ${user.id}`);
    });

    // Step 3: Check specifically for member 798's auth user
    console.log('\n👤 Step 3: Checking member 798 auth user...');
    const authUser798 = authUsers.users.find(u => u.email === '798@gmail.com');
    if (authUser798) {
      console.log('✅ Found auth user for 798:');
      console.log(`   Auth ID: ${authUser798.id}`);
      
      // Check if this auth user exists in custom users table
      const { data: customUser798, error: customUser798Error } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', authUser798.id)
        .single();
      
      if (customUser798Error) {
        console.log('❌ Auth user 798 NOT found in custom users table');
        console.log('💡 This is why the foreign key fails!');
        
        // Option 1: Create the missing user record
        console.log('\n🛠️ Option 1: Creating missing user record...');
        const { data: newUser, error: createUserError } = await supabase
          .from('users')
          .insert({
            auth_user_id: authUser798.id,
            email: authUser798.email,
            first_name: 'gjh',
            last_name: 'gkh',
            role: 'member',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select();

        if (createUserError) {
          console.log('❌ Failed to create user record:', createUserError.message);
        } else {
          console.log('✅ Created user record in custom users table');
          console.log('✅ Now the foreign key should work');
          
          // Test the link again
          console.log('\n🧪 Testing link again...');
          const { data: linkResult, error: linkError } = await supabase
            .from('members')
            .update({ user_id: authUser798.id })
            .eq('email', '798@gmail.com')
            .select();

          if (linkError) {
            console.log('❌ Link still fails:', linkError.message);
          } else {
            console.log('✅ LINK NOW WORKS! Member 798 is linked');
          }
        }
      } else {
        console.log('✅ Auth user 798 found in custom users table');
        console.log(`   Custom user ID: ${customUser798.id}`);
      }
    }

    // Step 4: Create missing user records for all auth users
    console.log('\n🔄 Step 4: Creating missing user records for all auth users...');
    let createdCount = 0;
    
    for (const authUser of authUsers.users) {
      // Check if user record exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', authUser.id)
        .single();
      
      if (!existingUser) {
        // Create missing user record
        const { error: createError } = await supabase
          .from('users')
          .insert({
            auth_user_id: authUser.id,
            email: authUser.email,
            first_name: authUser.user_metadata?.first_name || 'User',
            last_name: authUser.user_metadata?.last_name || 'Name',
            role: authUser.user_metadata?.role || 'member',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        
        if (!createError) {
          createdCount++;
          console.log(`✅ Created user record for ${authUser.email}`);
        }
      }
    }
    
    console.log(`\n🎉 Created ${createdCount} missing user records`);
    
    // Step 5: Now try to link all members
    console.log('\n🔗 Step 5: Linking all members to auth accounts...');
    const { data: unlinkMembers } = await supabase
      .from('members')
      .select('id, email, first_name, last_name, user_id')
      .is('user_id', null);

    let linkedCount = 0;
    for (const member of unlinkMembers) {
      const authUser = authUsers.users.find(u => u.email === member.email);
      if (authUser) {
        const { error: linkErr } = await supabase
          .from('members')
          .update({ user_id: authUser.id })
          .eq('id', member.id);
        
        if (!linkErr) {
          linkedCount++;
          console.log(`✅ Linked: ${member.first_name} ${member.last_name}`);
        }
      }
    }
    
    console.log(`\n🎉 Successfully linked ${linkedCount} members!`);
    console.log('\n✅ ALL ISSUES SHOULD NOW BE FIXED!');

  } catch (error) {
    console.error('💥 Check failed:', error.message);
  }
}

checkUsersTable();