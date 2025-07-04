// Test Members Generator Script - Matching Your Existing Backend Setup
// Run this with: node generate-test-members.js

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Load environment variables (same as your backend)
dotenv.config();

console.log('🔧 Environment check:');
console.log('SUPABASE_URL exists:', !!process.env.SUPABASE_URL);
console.log('SUPABASE_SERVICE_KEY exists:', !!process.env.SUPABASE_SERVICE_KEY);

// Use the same environment variables as your backend
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Required: SUPABASE_URL, SUPABASE_SERVICE_KEY');
  console.error('Make sure your .env file is in the backend directory');
  process.exit(1);
}

// Create Supabase client (same config as your backend)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('✅ Supabase client created successfully');

// Constants from your system (you provided these)
const BRANCH_ID = '13d3ebe0-2931-4324-abc4-e003a576b97d';
const STAFF_ID = '3bd212e3-273b-4eb2-9cec-9c2cb72b90ba';

const PACKAGES = {
  SINGLE: {
    id: '2b64b358-1004-4dd9-a9c3-c279e80fcda9',
    name: 'single',
    type: 'individual',
    price: 50.00,
    duration_months: 1,
    max_members: 1
  },
  FAMILY: {
    id: 'd7552caf-c869-44eb-b312-b42ff6fc1424',
    name: 'try max',
    type: 'family',
    price: 120.00,
    duration_months: 1,
    max_members: 4
  }
};

// Helper function to generate random dates
function getRandomDate(startDays, endDays) {
  const start = new Date();
  start.setDate(start.getDate() + startDays);
  const end = new Date();
  end.setDate(end.getDate() + endDays);
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Helper function to format date for database
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

// Generate test member data
function generateTestMembers() {
  const firstNames = [
    'John', 'Jane', 'Michael', 'Sarah', 'David', 'Lisa', 'Chris', 'Amy', 'Robert', 'Emily',
    'James', 'Jessica', 'William', 'Ashley', 'Richard', 'Amanda', 'Thomas', 'Stephanie', 'Charles', 'Melissa',
    'Daniel', 'Nicole', 'Matthew', 'Jennifer', 'Anthony', 'Kimberly', 'Mark', 'Donna', 'Donald', 'Carol',
    'Steven', 'Sharon', 'Paul', 'Cynthia', 'Andrew', 'Angela', 'Joshua', 'Brenda', 'Kenneth', 'Emma',
    'Kevin', 'Olivia', 'Brian', 'Rachel', 'George', 'Catherine', 'Edward', 'Samantha', 'Ronald', 'Deborah',
    'Timothy', 'Dorothy', 'Jason', 'Lisa', 'Jeffrey', 'Nancy', 'Ryan', 'Karen', 'Jacob', 'Betty'
  ];

  const lastNames = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
    'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
    'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
    'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
    'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts'
  ];

  const members = [];
  let memberCounter = 1;

  // Generate ACTIVE MEMBERS (20 members)
  console.log('📝 Generating 20 ACTIVE members...');
  
  // 12 Active Individual Members
  for (let i = 0; i < 12; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const startDate = getRandomDate(-60, -7); // Started 7-60 days ago
    const expiryDate = new Date(startDate);
    expiryDate.setMonth(expiryDate.getMonth() + 1); // 1 month duration
    
    members.push({
      branch_id: BRANCH_ID,
      first_name: firstName,
      last_name: lastName,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${memberCounter}@testgym.com`,
      phone: `077${(1000000 + memberCounter).toString().slice(1)}`,
      national_id: `TEST${memberCounter.toString().padStart(6, '0')}`,
      status: 'active',
      package_type: PACKAGES.SINGLE.type,
      package_name: PACKAGES.SINGLE.name,
      package_price: PACKAGES.SINGLE.price,
      start_date: formatDate(startDate),
      expiry_date: formatDate(expiryDate),
      is_verified: true,
      created_at: startDate.toISOString(),
      updated_at: startDate.toISOString()
    });
    memberCounter++;
  }

  // 8 Active Family Members
  for (let i = 0; i < 8; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const startDate = getRandomDate(-45, -5); // Started 5-45 days ago
    const expiryDate = new Date(startDate);
    expiryDate.setMonth(expiryDate.getMonth() + 1);
    
    members.push({
      branch_id: BRANCH_ID,
      first_name: firstName,
      last_name: lastName,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${memberCounter}@testgym.com`,
      phone: `077${(1000000 + memberCounter).toString().slice(1)}`,
      national_id: `TEST${memberCounter.toString().padStart(6, '0')}`,
      status: 'active',
      package_type: PACKAGES.FAMILY.type,
      package_name: PACKAGES.FAMILY.name,
      package_price: PACKAGES.FAMILY.price,
      start_date: formatDate(startDate),
      expiry_date: formatDate(expiryDate),
      is_verified: true,
      created_at: startDate.toISOString(),
      updated_at: startDate.toISOString()
    });
    memberCounter++;
  }

  // Generate EXPIRED MEMBERS (25 members)
  console.log('📝 Generating 25 EXPIRED members...');
  
  // 15 Expired Individual Members
  for (let i = 0; i < 15; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const startDate = getRandomDate(-120, -60); // Started 60-120 days ago
    const expiryDate = new Date(startDate);
    expiryDate.setMonth(expiryDate.getMonth() + 1);
    
    members.push({
      branch_id: BRANCH_ID,
      first_name: firstName,
      last_name: lastName,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${memberCounter}@testgym.com`,
      phone: `077${(1000000 + memberCounter).toString().slice(1)}`,
      national_id: `TEST${memberCounter.toString().padStart(6, '0')}`,
      status: 'expired',
      package_type: PACKAGES.SINGLE.type,
      package_name: PACKAGES.SINGLE.name,
      package_price: PACKAGES.SINGLE.price,
      start_date: formatDate(startDate),
      expiry_date: formatDate(expiryDate),
      is_verified: true,
      created_at: startDate.toISOString(),
      updated_at: new Date().toISOString()
    });
    memberCounter++;
  }

  // 10 Expired Family Members
  for (let i = 0; i < 10; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const startDate = getRandomDate(-90, -45); // Started 45-90 days ago
    const expiryDate = new Date(startDate);
    expiryDate.setMonth(expiryDate.getMonth() + 1);
    
    members.push({
      branch_id: BRANCH_ID,
      first_name: firstName,
      last_name: lastName,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${memberCounter}@testgym.com`,
      phone: `077${(1000000 + memberCounter).toString().slice(1)}`,
      national_id: `TEST${memberCounter.toString().padStart(6, '0')}`,
      status: 'expired',
      package_type: PACKAGES.FAMILY.type,
      package_name: PACKAGES.FAMILY.name,
      package_price: PACKAGES.FAMILY.price,
      start_date: formatDate(startDate),
      expiry_date: formatDate(expiryDate),
      is_verified: true,
      created_at: startDate.toISOString(),
      updated_at: new Date().toISOString()
    });
    memberCounter++;
  }

  // Generate SUSPENDED MEMBERS (10 members)
  console.log('📝 Generating 10 SUSPENDED members...');
  
  // 6 Suspended Individual Members
  for (let i = 0; i < 6; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const startDate = getRandomDate(-80, -20); // Started 20-80 days ago
    const expiryDate = new Date(startDate);
    expiryDate.setMonth(expiryDate.getMonth() + 1);
    
    members.push({
      branch_id: BRANCH_ID,
      first_name: firstName,
      last_name: lastName,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${memberCounter}@testgym.com`,
      phone: `077${(1000000 + memberCounter).toString().slice(1)}`,
      national_id: `TEST${memberCounter.toString().padStart(6, '0')}`,
      status: 'suspended',
      package_type: PACKAGES.SINGLE.type,
      package_name: PACKAGES.SINGLE.name,
      package_price: PACKAGES.SINGLE.price,
      start_date: formatDate(startDate),
      expiry_date: formatDate(expiryDate),
      is_verified: true,
      created_at: startDate.toISOString(),
      updated_at: new Date().toISOString()
    });
    memberCounter++;
  }

  // 4 Suspended Family Members
  for (let i = 0; i < 4; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const startDate = getRandomDate(-70, -15); // Started 15-70 days ago
    const expiryDate = new Date(startDate);
    expiryDate.setMonth(expiryDate.getMonth() + 1);
    
    members.push({
      branch_id: BRANCH_ID,
      first_name: firstName,
      last_name: lastName,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${memberCounter}@testgym.com`,
      phone: `077${(1000000 + memberCounter).toString().slice(1)}`,
      national_id: `TEST${memberCounter.toString().padStart(6, '0')}`,
      status: 'suspended',
      package_type: PACKAGES.FAMILY.type,
      package_name: PACKAGES.FAMILY.name,
      package_price: PACKAGES.FAMILY.price,
      start_date: formatDate(startDate),
      expiry_date: formatDate(expiryDate),
      is_verified: true,
      created_at: startDate.toISOString(),
      updated_at: new Date().toISOString()
    });
    memberCounter++;
  }

  return members;
}

// Function to insert members in batches
async function insertMembersInBatches(members, batchSize = 8) {
  console.log(`\n🚀 Inserting ${members.length} members in batches of ${batchSize}...`);
  
  for (let i = 0; i < members.length; i += batchSize) {
    const batch = members.slice(i, i + batchSize);
    
    try {
      const { data, error } = await supabase
        .from('members')
        .insert(batch);
      
      if (error) {
        console.error(`❌ Error inserting batch ${Math.floor(i/batchSize) + 1}:`, error);
        console.error('Failed members:', batch.map(m => `${m.first_name} ${m.last_name}`));
      } else {
        console.log(`✅ Successfully inserted batch ${Math.floor(i/batchSize) + 1} (${batch.length} members)`);
      }
      
      // Small delay between batches to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (err) {
      console.error(`❌ Exception in batch ${Math.floor(i/batchSize) + 1}:`, err);
    }
  }
}

// Main execution function
async function main() {
  console.log('🚀 Starting Test Members Generation...');
  console.log(`📍 Branch ID: ${BRANCH_ID}`);
  console.log(`👤 Staff ID: ${STAFF_ID}`);
  console.log('📦 Packages:', Object.values(PACKAGES).map(p => `${p.name} (${p.type})`).join(', '));
  
  // Test connection first
  try {
    const { data, error } = await supabase
      .from('branches')
      .select('name')
      .eq('id', BRANCH_ID)
      .single();
    
    if (error) {
      console.error('❌ Cannot connect to database or find branch:', error.message);
      process.exit(1);
    }
    
    console.log(`✅ Connected to database. Branch: ${data.name}`);
  } catch (err) {
    console.error('❌ Database connection failed:', err);
    process.exit(1);
  }
  
  // Generate test members
  const members = generateTestMembers();
  
  // Summary
  const summary = {
    total: members.length,
    active: members.filter(m => m.status === 'active').length,
    expired: members.filter(m => m.status === 'expired').length,
    suspended: members.filter(m => m.status === 'suspended').length,
    individual: members.filter(m => m.package_type === 'individual').length,
    family: members.filter(m => m.package_type === 'family').length
  };
  
  console.log('\n📊 Generation Summary:');
  console.log(`Total Members: ${summary.total}`);
  console.log(`Active: ${summary.active} | Expired: ${summary.expired} | Suspended: ${summary.suspended}`);
  console.log(`Individual: ${summary.individual} | Family: ${summary.family}`);
  
  // Insert members
  await insertMembersInBatches(members, 8);
  
  console.log('\n🎉 Test members generation completed!');
  console.log('\n📋 Quick verification query:');
  console.log(`SELECT status, package_type, COUNT(*) as count FROM members WHERE branch_id = '${BRANCH_ID}' GROUP BY status, package_type ORDER BY status, package_type;`);
}

// Error handling
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled rejection:', error);
  process.exit(1);
});

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { generateTestMembers, insertMembersInBatches };