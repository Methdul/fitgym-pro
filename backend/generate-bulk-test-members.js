// Bulk Test Members Generator - 200+ Members
// Run this with: node generate-bulk-test-members.js

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

console.log('🔧 Environment check:');
console.log('SUPABASE_URL exists:', !!process.env.SUPABASE_URL);
console.log('SUPABASE_SERVICE_KEY exists:', !!process.env.SUPABASE_SERVICE_KEY);

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Required: SUPABASE_URL, SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('✅ Supabase client created successfully');

// Constants from your system
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

// Configuration for bulk generation
const CONFIG = {
  TOTAL_MEMBERS: 200,
  STARTING_COUNTER: 56, // Start from 56 since you already have 55 members
  BATCH_SIZE: 10, // Slightly larger batches for efficiency
  BATCH_DELAY: 700, // Slightly longer delay for safety
  
  // Distribution percentages
  ACTIVE_PERCENT: 30,    // 30% active (60 members)
  EXPIRED_PERCENT: 50,   // 50% expired (100 members) - good for renewal testing
  SUSPENDED_PERCENT: 20, // 20% suspended (40 members)
  
  // Package distribution
  INDIVIDUAL_PERCENT: 65, // 65% individual (130 members)
  FAMILY_PERCENT: 35      // 35% family (70 members)
};

// Expanded name lists for variety
const FIRST_NAMES = [
  // Original names plus many more
  'John', 'Jane', 'Michael', 'Sarah', 'David', 'Lisa', 'Chris', 'Amy', 'Robert', 'Emily',
  'James', 'Jessica', 'William', 'Ashley', 'Richard', 'Amanda', 'Thomas', 'Stephanie', 'Charles', 'Melissa',
  'Daniel', 'Nicole', 'Matthew', 'Jennifer', 'Anthony', 'Kimberly', 'Mark', 'Donna', 'Donald', 'Carol',
  'Steven', 'Sharon', 'Paul', 'Cynthia', 'Andrew', 'Angela', 'Joshua', 'Brenda', 'Kenneth', 'Emma',
  'Kevin', 'Olivia', 'Brian', 'Rachel', 'George', 'Catherine', 'Edward', 'Samantha', 'Ronald', 'Deborah',
  'Timothy', 'Dorothy', 'Jason', 'Lisa', 'Jeffrey', 'Nancy', 'Ryan', 'Karen', 'Jacob', 'Betty',
  // Additional names for variety
  'Alexander', 'Victoria', 'Benjamin', 'Madison', 'Ethan', 'Hannah', 'Noah', 'Grace', 'Logan', 'Sophia',
  'Mason', 'Isabella', 'Lucas', 'Mia', 'Jackson', 'Charlotte', 'Aiden', 'Abigail', 'Gabriel', 'Lily',
  'Owen', 'Chloe', 'Carter', 'Ella', 'Sebastian', 'Avery', 'Jack', 'Scarlett', 'Luke', 'Zoe',
  'Nathan', 'Natalie', 'Connor', 'Aria', 'Wyatt', 'Aubrey', 'Caleb', 'Addison', 'Henry', 'Layla',
  'Isaac', 'Penelope', 'Hunter', 'Mila', 'Eli', 'Nora', 'Adam', 'Hazel', 'Julian', 'Elena',
  'Adrian', 'Aurora', 'Levi', 'Lucy', 'Aaron', 'Savannah', 'Ian', 'Anna', 'Xavier', 'Maya',
  'Dominic', 'Leah', 'Cole', 'Audrey', 'Blake', 'Ariana', 'Dean', 'Aaliyah', 'Max', 'Claire'
];

const LAST_NAMES = [
  // Original names plus many more
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
  'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
  'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
  'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts',
  // Additional surnames
  'Phillips', 'Evans', 'Turner', 'Diaz', 'Parker', 'Cruz', 'Edwards', 'Collins', 'Reyes', 'Stewart',
  'Morris', 'Morales', 'Murphy', 'Cook', 'Rogers', 'Gutierrez', 'Ortiz', 'Morgan', 'Cooper', 'Peterson',
  'Bailey', 'Reed', 'Kelly', 'Howard', 'Ramos', 'Kim', 'Cox', 'Ward', 'Richardson', 'Watson',
  'Brooks', 'Chavez', 'Wood', 'James', 'Bennett', 'Gray', 'Mendoza', 'Ruiz', 'Hughes', 'Price',
  'Alvarez', 'Castillo', 'Sanders', 'Patel', 'Myers', 'Long', 'Ross', 'Foster', 'Jimenez', 'Powell'
];

// Helper functions
function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomDate(startDays, endDays) {
  const start = new Date();
  start.setDate(start.getDate() + startDays);
  const end = new Date();
  end.setDate(end.getDate() + endDays);
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

// Generate member distribution
function calculateDistribution() {
  const total = CONFIG.TOTAL_MEMBERS;
  
  return {
    active: Math.floor(total * CONFIG.ACTIVE_PERCENT / 100),
    expired: Math.floor(total * CONFIG.EXPIRED_PERCENT / 100),
    suspended: Math.floor(total * CONFIG.SUSPENDED_PERCENT / 100),
    individualPerStatus: {
      active: Math.floor(total * CONFIG.ACTIVE_PERCENT * CONFIG.INDIVIDUAL_PERCENT / 10000),
      expired: Math.floor(total * CONFIG.EXPIRED_PERCENT * CONFIG.INDIVIDUAL_PERCENT / 10000),
      suspended: Math.floor(total * CONFIG.SUSPENDED_PERCENT * CONFIG.INDIVIDUAL_PERCENT / 10000)
    },
    familyPerStatus: {
      active: Math.floor(total * CONFIG.ACTIVE_PERCENT * CONFIG.FAMILY_PERCENT / 10000),
      expired: Math.floor(total * CONFIG.EXPIRED_PERCENT * CONFIG.FAMILY_PERCENT / 10000),
      suspended: Math.floor(total * CONFIG.SUSPENDED_PERCENT * CONFIG.FAMILY_PERCENT / 10000)
    }
  };
}

// Generate test members
function generateBulkTestMembers() {
  const distribution = calculateDistribution();
  const members = [];
  let memberCounter = CONFIG.STARTING_COUNTER;

  console.log('📊 Distribution Plan:');
  console.log(`Active: ${distribution.active} (Individual: ${distribution.individualPerStatus.active}, Family: ${distribution.familyPerStatus.active})`);
  console.log(`Expired: ${distribution.expired} (Individual: ${distribution.individualPerStatus.expired}, Family: ${distribution.familyPerStatus.expired})`);
  console.log(`Suspended: ${distribution.suspended} (Individual: ${distribution.individualPerStatus.suspended}, Family: ${distribution.familyPerStatus.suspended})`);

  // Helper function to create a member
  function createMember(status, packageInfo, statusDateRange) {
    const firstName = getRandomElement(FIRST_NAMES);
    const lastName = getRandomElement(LAST_NAMES);
    const startDate = getRandomDate(statusDateRange.startDays, statusDateRange.endDays);
    const expiryDate = new Date(startDate);
    expiryDate.setMonth(expiryDate.getMonth() + packageInfo.duration_months);

    return {
      branch_id: BRANCH_ID,
      first_name: firstName,
      last_name: lastName,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${memberCounter}@testgym.com`,
      phone: `077${(2000000 + memberCounter).toString().slice(1)}`, // Different phone range
      national_id: `BULK${memberCounter.toString().padStart(6, '0')}`, // Different prefix
      status: status,
      package_type: packageInfo.type,
      package_name: packageInfo.name,
      package_price: packageInfo.price,
      start_date: formatDate(startDate),
      expiry_date: formatDate(expiryDate),
      is_verified: Math.random() > 0.2, // 80% verified
      created_at: startDate.toISOString(),
      updated_at: status === 'active' ? startDate.toISOString() : new Date().toISOString()
    };
  }

  // Generate Active Members
  console.log('📝 Generating ACTIVE members...');
  
  // Active Individual
  for (let i = 0; i < distribution.individualPerStatus.active; i++) {
    members.push(createMember('active', PACKAGES.SINGLE, { startDays: -60, endDays: -7 }));
    memberCounter++;
  }

  // Active Family
  for (let i = 0; i < distribution.familyPerStatus.active; i++) {
    members.push(createMember('active', PACKAGES.FAMILY, { startDays: -45, endDays: -5 }));
    memberCounter++;
  }

  // Generate Expired Members
  console.log('📝 Generating EXPIRED members...');
  
  // Expired Individual
  for (let i = 0; i < distribution.individualPerStatus.expired; i++) {
    members.push(createMember('expired', PACKAGES.SINGLE, { startDays: -180, endDays: -60 }));
    memberCounter++;
  }

  // Expired Family
  for (let i = 0; i < distribution.familyPerStatus.expired; i++) {
    members.push(createMember('expired', PACKAGES.FAMILY, { startDays: -150, endDays: -45 }));
    memberCounter++;
  }

  // Generate Suspended Members
  console.log('📝 Generating SUSPENDED members...');
  
  // Suspended Individual
  for (let i = 0; i < distribution.individualPerStatus.suspended; i++) {
    members.push(createMember('suspended', PACKAGES.SINGLE, { startDays: -120, endDays: -20 }));
    memberCounter++;
  }

  // Suspended Family
  for (let i = 0; i < distribution.familyPerStatus.suspended; i++) {
    members.push(createMember('suspended', PACKAGES.FAMILY, { startDays: -100, endDays: -15 }));
    memberCounter++;
  }

  // Fill any remaining spots to reach exactly TOTAL_MEMBERS
  while (members.length < CONFIG.TOTAL_MEMBERS) {
    const randomStatus = getRandomElement(['active', 'expired', 'suspended']);
    const randomPackage = Math.random() > 0.35 ? PACKAGES.SINGLE : PACKAGES.FAMILY;
    const dateRange = randomStatus === 'active' 
      ? { startDays: -60, endDays: -7 }
      : randomStatus === 'expired'
      ? { startDays: -180, endDays: -60 }
      : { startDays: -120, endDays: -20 };
    
    members.push(createMember(randomStatus, randomPackage, dateRange));
    memberCounter++;
  }

  console.log(`✅ Generated ${members.length} members (IDs: ${CONFIG.STARTING_COUNTER} to ${memberCounter - 1})`);
  return members;
}

// Insert members in batches with better error handling
async function insertMembersInBatches(members, batchSize = CONFIG.BATCH_SIZE) {
  console.log(`\n🚀 Inserting ${members.length} members in batches of ${batchSize}...`);
  
  let successCount = 0;
  let errorCount = 0;
  const totalBatches = Math.ceil(members.length / batchSize);

  for (let i = 0; i < members.length; i += batchSize) {
    const batch = members.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    
    try {
      console.log(`📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} members)...`);
      
      const { data, error } = await supabase
        .from('members')
        .insert(batch);
      
      if (error) {
        console.error(`❌ Error in batch ${batchNumber}:`, error.message);
        console.error('Failed members:', batch.map(m => `${m.first_name} ${m.last_name} (${m.email})`));
        errorCount += batch.length;
      } else {
        console.log(`✅ Batch ${batchNumber} completed successfully (${batch.length} members)`);
        successCount += batch.length;
      }
      
      // Progress indicator
      const progressPercent = Math.round((batchNumber / totalBatches) * 100);
      console.log(`📊 Progress: ${progressPercent}% (${successCount} success, ${errorCount} errors)`);
      
      // Delay between batches
      if (i + batchSize < members.length) {
        console.log(`⏱️  Waiting ${CONFIG.BATCH_DELAY}ms before next batch...`);
        await new Promise(resolve => setTimeout(resolve, CONFIG.BATCH_DELAY));
      }
      
    } catch (err) {
      console.error(`❌ Exception in batch ${batchNumber}:`, err.message);
      errorCount += batch.length;
    }
  }

  return { successCount, errorCount };
}

// Main execution function
async function main() {
  console.log('🚀 Starting BULK Test Members Generation...');
  console.log(`📍 Branch ID: ${BRANCH_ID}`);
  console.log(`👤 Staff ID: ${STAFF_ID}`);
  console.log(`🎯 Target: ${CONFIG.TOTAL_MEMBERS} members`);
  console.log(`🔢 Starting from member #${CONFIG.STARTING_COUNTER}`);
  console.log('📦 Packages:', Object.values(PACKAGES).map(p => `${p.name} (${p.type})`).join(', '));
  
  // Test connection
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
    
    console.log(`✅ Connected to database. Branch: ${data.name}\n`);
  } catch (err) {
    console.error('❌ Database connection failed:', err);
    process.exit(1);
  }
  
  // Generate members
  const members = generateBulkTestMembers();
  
  // Final summary before insertion
  const finalSummary = {
    total: members.length,
    active: members.filter(m => m.status === 'active').length,
    expired: members.filter(m => m.status === 'expired').length,
    suspended: members.filter(m => m.status === 'suspended').length,
    individual: members.filter(m => m.package_type === 'individual').length,
    family: members.filter(m => m.package_type === 'family').length
  };
  
  console.log('\n📊 Final Generation Summary:');
  console.log(`Total Members: ${finalSummary.total}`);
  console.log(`Active: ${finalSummary.active} | Expired: ${finalSummary.expired} | Suspended: ${finalSummary.suspended}`);
  console.log(`Individual: ${finalSummary.individual} | Family: ${finalSummary.family}`);
  
  // Estimate time
  const estimatedBatches = Math.ceil(members.length / CONFIG.BATCH_SIZE);
  const estimatedTime = Math.ceil(estimatedBatches * CONFIG.BATCH_DELAY / 1000);
  console.log(`⏱️  Estimated completion time: ~${estimatedTime} seconds`);
  
  // Insert members
  const startTime = Date.now();
  const results = await insertMembersInBatches(members, CONFIG.BATCH_SIZE);
  const endTime = Date.now();
  const actualTime = Math.round((endTime - startTime) / 1000);
  
  console.log('\n🎉 BULK Test Members Generation Completed!');
  console.log(`📊 Results: ${results.successCount} successful, ${results.errorCount} failed`);
  console.log(`⏱️  Actual time: ${actualTime} seconds`);
  console.log(`📈 Rate: ${Math.round(results.successCount / actualTime)} members/second`);
  
  console.log('\n📋 Verification queries:');
  console.log(`SELECT status, package_type, COUNT(*) as count FROM members WHERE branch_id = '${BRANCH_ID}' GROUP BY status, package_type ORDER BY status, package_type;`);
  console.log(`SELECT COUNT(*) as total_members FROM members WHERE branch_id = '${BRANCH_ID}';`);
}

// Enhanced error handling
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled rejection:', error);
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('\n⚠️  Process interrupted by user');
  process.exit(0);
});

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { generateBulkTestMembers, insertMembersInBatches };