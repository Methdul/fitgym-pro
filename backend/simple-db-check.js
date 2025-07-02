// backend/simple-db-check.js - Simple database check

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

async function simpleDbCheck() {
  console.log('🔍 SIMPLE DATABASE CHECK...\n');

  try {
    // Step 1: Check members table structure by getting one record
    console.log('📊 Step 1: Checking members table...');
    const { data: sampleMember, error: memberError } = await supabase
      .from('members')
      .select('*')
      .limit(1)
      .single();

    if (memberError) {
      console.log('❌ Cannot access members table:', memberError.message);
      return;
    }

    console.log('✅ Members table accessible');
    console.log('📋 Table columns:');
    Object.keys(sampleMember).forEach(column => {
      console.log(`  - ${column}`);
    });

    // Check for user_id column specifically
    if ('user_id' in sampleMember) {
      console.log('✅ user_id column EXISTS');
    } else {
      console.log('❌ user_id column MISSING');
    }

    // Step 2: Check auth access
    console.log('\n🔐 Step 2: Checking auth access...');
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.log('❌ Cannot access auth:', authError.message);
      return;
    }

    console.log(`✅ Auth accessible (${authUsers.users.length} total users)`);

    // Step 3: Find member 798 and check their status
    console.log('\n👤 Step 3: Checking member 798...');
    const { data: member798, error: member798Error } = await supabase
      .from('members')
      .select('*')
      .eq('email', '798@gmail.com')
      .single();

    if (member798Error) {
      console.log('❌ Member 798 not found:', member798Error.message);
    } else {
      console.log('✅ Member 798 found:');
      console.log(`  - ID: ${member798.id}`);
      console.log(`  - Name: ${member798.first_name} ${member798.last_name}`);
      console.log(`  - Email: ${member798.email}`);
      console.log(`  - National ID: ${member798.national_id}`);
      console.log(`  - User ID: ${member798.user_id || 'NULL'}`);
    }

    // Step 4: Check if auth user exists for 798
    const authUser798 = authUsers.users.find(user => user.email === '798@gmail.com');
    if (authUser798) {
      console.log('✅ Auth account exists for 798:');
      console.log(`  - Auth ID: ${authUser798.id}`);
      console.log(`  - Email: ${authUser798.email}`);
    } else {
      console.log('❌ No auth account for 798');
    }

    // Step 5: Test linking if both exist
    if (member798 && authUser798 && !member798.user_id) {
      console.log('\n🧪 Step 5: Testing link update...');
      const { data: linkResult, error: linkError } = await supabase
        .from('members')
        .update({ user_id: authUser798.id })
        .eq('id', member798.id)
        .select();

      if (linkError) {
        console.log('❌ LINK FAILED:', linkError.message);
        console.log('❌ Error code:', linkError.code);
        console.log('❌ Error hint:', linkError.hint);
      } else {
        console.log('✅ LINK SUCCESSFUL!');
        console.log('✅ Member 798 now linked to auth account');
      }
    }

    // Step 6: Count recent members without auth
    console.log('\n📈 Step 6: Checking recent members...');
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const { data: recentMembers, error: recentError } = await supabase
      .from('members')
      .select('id, first_name, last_name, email, user_id, created_at')
      .gte('created_at', yesterday.toISOString())
      .order('created_at', { ascending: false })
      .limit(5);

    if (recentMembers) {
      console.log(`📋 Found ${recentMembers.length} recent members:`);
      recentMembers.forEach((member, index) => {
        console.log(`${index + 1}. ${member.first_name} ${member.last_name} (${member.email})`);
        console.log(`   Auth linked: ${member.user_id ? 'YES' : 'NO'}`);
      });

      const withoutAuth = recentMembers.filter(m => !m.user_id).length;
      console.log(`\n⚠️ ${withoutAuth} of ${recentMembers.length} recent members have NO auth accounts`);
    }

  } catch (error) {
    console.error('💥 Check failed:', error.message);
  }

  console.log('\n🎯 SUMMARY COMPLETE');
}

simpleDbCheck();