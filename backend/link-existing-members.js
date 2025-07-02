// backend/link-existing-members.js - Link all existing members who have auth accounts

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

async function linkExistingMembers() {
  console.log('🔗 LINKING ALL EXISTING MEMBERS...\n');

  try {
    // Get all auth users
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    console.log(`📋 Found ${authUsers.users.length} auth users`);

    // Get all members without user_id
    const { data: unlinkMembers } = await supabase
      .from('members')
      .select('id, email, first_name, last_name, user_id, national_id')
      .is('user_id', null);

    console.log(`📋 Found ${unlinkMembers ? unlinkMembers.length : 0} unlinked members`);

    if (!unlinkMembers || unlinkMembers.length === 0) {
      console.log('✅ All members are already linked!');
      return;
    }

    let linkedCount = 0;
    let createdAuthCount = 0;

    for (const member of unlinkMembers) {
      console.log(`\n👤 Processing: ${member.first_name} ${member.last_name} (${member.email})`);
      
      // Check if auth account exists
      let authUser = authUsers.users.find(u => u.email === member.email);
      
      if (!authUser) {
        // Create auth account if it doesn't exist
        console.log('   🔐 Creating auth account...');
        
        const { data: newAuthData, error: createError } = await supabase.auth.admin.createUser({
          email: member.email,
          password: member.national_id || '123456', // Use national ID or default
          email_confirm: true,
          user_metadata: {
            first_name: member.first_name,
            last_name: member.last_name,
            role: 'member'
          }
        });

        if (createError) {
          console.log('   ❌ Auth creation failed:', createError.message);
          continue;
        }

        authUser = newAuthData.user;
        createdAuthCount++;
        console.log('   ✅ Auth account created');
      }

      // Link member to auth account
      const { error: linkError } = await supabase
        .from('members')
        .update({ user_id: authUser.id })
        .eq('id', member.id);

      if (linkError) {
        console.log('   ❌ Link failed:', linkError.message);
      } else {
        linkedCount++;
        console.log('   ✅ Linked successfully');
        console.log(`   📧 Can login with: ${member.email} / ${member.national_id || '123456'}`);
      }
    }

    console.log(`\n🎉 SUMMARY:`);
    console.log(`✅ Created ${createdAuthCount} new auth accounts`);
    console.log(`✅ Linked ${linkedCount} members`);
    console.log(`🔐 All linked members can now log in!`);

  } catch (error) {
    console.error('💥 Linking failed:', error.message);
  }
}

linkExistingMembers();