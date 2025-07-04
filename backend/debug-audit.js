// backend/debug-audit-fixed.js - Fixed JavaScript version
const { createClient } = require('@supabase/supabase-js');

// Your Supabase configuration - UPDATE THESE!
const supabaseUrl = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL_HERE';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY_HERE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAnalyticsQuery() {
  console.log('🔍 TESTING ANALYTICS QUERY ON AUDIT LOGS...\n');
  
  try {
    // Get the exact query that analytics uses
    const branchId = '13d3ebe0-2931-4324-abc4-e003a576b97d';
    const start = new Date('2025-07-01');
    const end = new Date('2025-07-31');
    
    console.log(`📊 Querying audit logs for branch: ${branchId}`);
    console.log(`📅 Date range: ${start.toISOString()} to ${end.toISOString()}`);
    
    // This is the EXACT query that analytics uses
    const { data: auditLogs, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('branch_id', branchId)
      .in('action', ['CREATE_MEMBER', 'PROCESS_MEMBER_RENEWAL'])
      .eq('success', true)
      .gte('timestamp', start.toISOString())
      .lt('timestamp', end.toISOString())
      .limit(100)
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('❌ Analytics query failed:', error);
      return;
    }

    console.log(`📊 Found ${auditLogs?.length || 0} financial audit logs\n`);

    if (auditLogs && auditLogs.length > 0) {
      console.log('🔍 PROCESSING EACH LOG (like analytics does):\n');
      
      auditLogs.forEach((log, index) => {
        console.log(`--- LOG ${index + 1} ---`);
        console.log(`ID: ${log.id}`);
        console.log(`Action: ${log.action}`);
        console.log(`Timestamp: ${log.timestamp}`);
        console.log(`User: ${log.user_email}`);
        
        const requestData = log.request_data || {};
        console.log('Request Data Structure:', typeof requestData);
        
        // Test the EXACT amount extraction logic from analytics
        let amount = 0;
        if (requestData.package_price) {
          amount = parseFloat(requestData.package_price);
        } else if (requestData.total_amount) {
          amount = parseFloat(requestData.total_amount);
        } else if (requestData.amount_paid) {
          amount = parseFloat(requestData.amount_paid);
        }
        
        console.log(`💰 Extracted Amount: ${amount}`);
        
        // Test member name extraction
        const responseData = log.response_data || {};
        let memberName = 'Unknown Member';
        if (responseData.member_name) {
          memberName = responseData.member_name;
        } else if (requestData.member_first_name && requestData.member_last_name) {
          memberName = `${requestData.member_first_name} ${requestData.member_last_name}`;
        }
        
        console.log(`👤 Extracted Member Name: ${memberName}`);
        
        // Test package name extraction
        let packageName = 'Unknown Package';
        if (requestData.package_name && requestData.package_name !== 'Unknown Package') {
          packageName = requestData.package_name;
        }
        
        console.log(`📦 Extracted Package Name: ${packageName}`);
        
        // Test payment method
        let paymentMethod = 'Unknown';
        if (requestData.payment_method) {
          paymentMethod = requestData.payment_method === 'cash' ? 'Cash' : 
                          requestData.payment_method === 'card' ? 'Card' : 
                          requestData.payment_method;
        }
        
        console.log(`💳 Extracted Payment Method: ${paymentMethod}`);
        
        console.log(`✅ Would show in analytics as:`);
        console.log(`   Member: ${memberName}`);
        console.log(`   Amount: $${amount.toFixed(2)}`);
        console.log(`   Package: ${packageName}`);
        console.log(`   Payment: ${paymentMethod}`);
        console.log(''); // Empty line
      });
    } else {
      console.log('❌ No audit logs found for the date range');
    }
    
  } catch (error) {
    console.error('💥 Test error:', error);
  }
}

async function checkSpecificLog() {
  console.log('🔍 CHECKING SPECIFIC LOG THAT SHOULD WORK...\n');
  
  try {
    // Check the specific log we know has data
    const { data: specificLog, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('id', 'dfea84cc-32a5-4e2b-b426-3df7d1247875')
      .single();
    
    if (error) {
      console.error('❌ Error fetching specific log:', error);
      return;
    }
    
    console.log('📋 Specific log details:');
    console.log('ID:', specificLog.id);
    console.log('Action:', specificLog.action);
    console.log('Timestamp:', specificLog.timestamp);
    console.log('Branch ID:', specificLog.branch_id);
    console.log('Success:', specificLog.success);
    
    const requestData = specificLog.request_data || {};
    console.log('\n📨 Request Data Structure:');
    console.log('Type:', typeof requestData);
    console.log('Body exists:', !!requestData.body);
    
    if (requestData.body) {
      const body = requestData.body;
      console.log('\n🔍 Body Contents:');
      console.log('package_price:', body.package_price, typeof body.package_price);
      console.log('member_first_name:', body.member_first_name);
      console.log('member_last_name:', body.member_last_name);
      console.log('payment_method:', body.payment_method);
      console.log('package_name:', body.package_name);
      
      // Test if this would work in analytics
      console.log('\n🧪 Analytics Test:');
      const amount = parseFloat(body.package_price);
      const memberName = `${body.member_first_name} ${body.member_last_name}`;
      
      console.log('Amount parsed:', amount);
      console.log('Member name:', memberName);
      console.log('Would show "$0.00"?', amount === 0 || isNaN(amount));
      console.log('Would show "Unknown Member"?', !body.member_first_name || !body.member_last_name);
    }
    
  } catch (error) {
    console.error('💥 Specific log check error:', error);
  }
}

// Run the tests
async function runTests() {
  await testAnalyticsQuery();
  await checkSpecificLog();
  console.log('✅ Tests complete!');
  process.exit(0);
}

runTests();