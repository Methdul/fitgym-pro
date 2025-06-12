
# FitGym Pro - Modern Gym Management System

A comprehensive gym management system built with React, TypeScript, and Supabase.

## 🏋️‍♂️ Features

### Public Features
- **Modern Landing Page** with dark theme and orange accents
- **Multi-Branch Support** with location finder
- **Partnership Program** showing member benefits
- **About Page** with dynamic staff display
- **Responsive Design** for all devices

### Management Features
- **Staff Dashboard** with PIN-based accountability
- **Member Management** with advanced filtering
- **Role-Based Permissions** (Manager, Senior Staff, Associate)
- **Real-time Statistics** and reporting
- **Audit Trail** for all staff actions

## 🚀 Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS with custom dark theme
- **UI Components**: shadcn/ui
- **Authentication**: Supabase Auth
- **Database**: PostgreSQL via Supabase
- **Icons**: Lucide React
- **Routing**: React Router

## 🎨 Design System

### Colors
- **Primary**: Orange (hsl(14 100% 57%))
- **Background**: Very dark (hsl(220 13% 9%))
- **Cards**: Dark gradient (hsl(220 13% 11%))
- **Borders**: Muted dark (hsl(220 13% 20%))

### Custom CSS Classes
- `.gym-gradient`: Main background gradient
- `.gym-card-gradient`: Card background gradient
- `.glassmorphism`: Navbar styling

## 📁 Project Structure

```
src/
├── components/
│   ├── ui/              # shadcn/ui components
│   └── Navbar.tsx       # Main navigation
├── hooks/
│   └── useAuth.tsx      # Authentication context
├── lib/
│   └── supabase.ts      # Database client & helpers
├── pages/
│   ├── Home.tsx         # Landing page
│   ├── About.tsx        # Company information
│   ├── Branches.tsx     # Location listing
│   ├── Partnerships.tsx # Partner benefits
│   ├── Login.tsx        # Authentication
│   └── StaffDashboard.tsx # Branch management
├── types/
│   └── index.ts         # TypeScript definitions
└── index.css           # Global styles & design system
```

## 🔧 Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Supabase

#### Environment Variables
Create a `.env.local` file:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

#### Database Schema
Run these SQL commands in your Supabase SQL editor:

```sql
-- Enable RLS
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Create enums
CREATE TYPE user_role AS ENUM ('admin', 'member');
CREATE TYPE staff_role AS ENUM ('manager', 'senior_staff', 'associate');
CREATE TYPE member_status AS ENUM ('active', 'expired', 'suspended');
CREATE TYPE package_type AS ENUM ('individual', 'couple');
CREATE TYPE payment_method AS ENUM ('card', 'cash');

-- Create tables
CREATE TABLE branches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255) NOT NULL,
    hours VARCHAR(255) NOT NULL,
    image_url TEXT,
    member_count INTEGER DEFAULT 0,
    staff_count INTEGER DEFAULT 0,
    facilities TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE users (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role user_role DEFAULT 'member',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE branch_staff (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    role staff_role NOT NULL,
    pin VARCHAR(4) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    last_active TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE packages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type package_type NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    duration_months INTEGER NOT NULL,
    features TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    national_id VARCHAR(50) NOT NULL,
    status member_status DEFAULT 'active',
    package_type package_type NOT NULL,
    package_name VARCHAR(255) NOT NULL,
    package_price DECIMAL(10,2) NOT NULL,
    start_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE member_renewals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    member_id UUID REFERENCES members(id) ON DELETE CASCADE,
    package_id UUID REFERENCES packages(id),
    payment_method payment_method NOT NULL,
    amount_paid DECIMAL(10,2) NOT NULL,
    previous_expiry DATE NOT NULL,
    new_expiry DATE NOT NULL,
    renewed_by_staff_id UUID REFERENCES branch_staff(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE partnerships (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('food', 'retail', 'wellness', 'automotive')),
    description TEXT NOT NULL,
    benefits TEXT NOT NULL,
    website_url TEXT,
    logo_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE gym_staff (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(255) NOT NULL,
    specialization VARCHAR(255) NOT NULL,
    experience_years INTEGER NOT NULL,
    certifications TEXT[] DEFAULT '{}',
    photo_url TEXT,
    is_displayed BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE staff_actions_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    staff_id UUID REFERENCES branch_staff(id),
    action_type VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    member_id UUID REFERENCES members(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_members_branch_id ON members(branch_id);
CREATE INDEX idx_members_status ON members(status);
CREATE INDEX idx_staff_branch_id ON branch_staff(branch_id);
CREATE INDEX idx_renewals_member_id ON member_renewals(member_id);
CREATE INDEX idx_actions_staff_id ON staff_actions_log(staff_id);

-- RLS Policies
-- Branches (public read)
CREATE POLICY "Anyone can view branches" ON branches FOR SELECT USING (true);

-- Members (branch staff can manage)
CREATE POLICY "Staff can manage branch members" ON members 
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM branch_staff 
        WHERE branch_staff.branch_id = members.branch_id 
        AND branch_staff.email = auth.jwt() ->> 'email'
    )
);

-- Staff (managers can manage)
CREATE POLICY "Managers can manage staff" ON branch_staff 
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM branch_staff AS mgr
        WHERE mgr.branch_id = branch_staff.branch_id 
        AND mgr.role = 'manager'
        AND mgr.email = auth.jwt() ->> 'email'
    )
);

-- Partnerships (public read)
CREATE POLICY "Anyone can view partnerships" ON partnerships FOR SELECT USING (is_active = true);

-- Gym staff (public read)
CREATE POLICY "Anyone can view gym staff" ON gym_staff FOR SELECT USING (is_displayed = true);

-- Packages (public read)
CREATE POLICY "Anyone can view packages" ON packages FOR SELECT USING (is_active = true);
```

#### Sample Data
```sql
-- Insert sample branches
INSERT INTO branches (id, name, address, phone, email, hours, member_count, staff_count, facilities) VALUES
('branch_001', 'FitGym Pro Downtown', '123 Main St, Downtown', '+1 (555) 123-4567', 'downtown@fitgym.com', 'Mon-Fri: 5AM-11PM, Sat-Sun: 6AM-10PM', 250, 8, ARRAY['Cardio Zone', 'Weight Training', 'Group Classes', 'Personal Training', 'Sauna']),
('branch_002', 'FitGym Pro Westside', '456 West Ave, Westside', '+1 (555) 234-5678', 'westside@fitgym.com', 'Mon-Fri: 5AM-11PM, Sat-Sun: 6AM-10PM', 180, 6, ARRAY['Cardio Zone', 'Weight Training', 'Swimming Pool', 'Group Classes']);

-- Insert sample staff
INSERT INTO branch_staff (branch_id, first_name, last_name, role, pin, email, phone) VALUES
('branch_001', 'John', 'Smith', 'manager', '1234', 'john.smith@fitgym.com', '+1 (555) 111-1111'),
('branch_001', 'Sarah', 'Johnson', 'senior_staff', '2345', 'sarah.johnson@fitgym.com', '+1 (555) 222-2222'),
('branch_001', 'Mike', 'Davis', 'associate', '3456', 'mike.davis@fitgym.com', '+1 (555) 333-3333');

-- Insert sample packages
INSERT INTO packages (name, type, price, duration_months, features) VALUES
('Basic Individual', 'individual', 49.99, 1, ARRAY['Gym Access', 'Cardio Equipment', 'Basic Support']),
('Premium Individual', 'individual', 79.99, 1, ARRAY['Gym Access', 'All Equipment', 'Group Classes', 'Personal Training Session']),
('Basic Couple', 'couple', 89.99, 1, ARRAY['Gym Access for 2', 'Cardio Equipment', 'Basic Support']),
('Premium Couple', 'couple', 139.99, 1, ARRAY['Gym Access for 2', 'All Equipment', 'Group Classes', 'Personal Training Sessions']);

-- Insert sample partnerships
INSERT INTO partnerships (name, category, description, benefits, website_url) VALUES
('Healthy Bites Cafe', 'food', 'Organic and nutritious meal options for fitness enthusiasts', '15% discount on all meals and smoothies', 'https://healthybites.com'),
('SportZone Equipment', 'retail', 'Premium fitness equipment and athletic wear', '20% off all purchases with member ID', 'https://sportzone.com'),
('Zen Wellness Spa', 'wellness', 'Relaxation and recovery services for athletes', 'Free consultation + 25% off massage therapy', 'https://zenwellness.com'),
('QuickFix Auto', 'automotive', 'Reliable auto repair and maintenance services', '10% discount on all services', 'https://quickfixauto.com');

-- Insert sample gym staff
INSERT INTO gym_staff (name, role, specialization, experience_years, certifications) VALUES
('Alex Rodriguez', 'Head Trainer', 'Strength & Conditioning', 8, ARRAY['NASM-CPT', 'CSCS', 'Nutrition Specialist']),
('Emily Chen', 'Fitness Instructor', 'Group Fitness & Yoga', 5, ARRAY['ACE-CPT', 'RYT-200', 'Zumba Certified']),
('Marcus Thompson', 'Personal Trainer', 'Weight Loss & Bodybuilding', 6, ARRAY['ACSM-CPT', 'Precision Nutrition']),
('Lisa Park', 'Wellness Coach', 'Functional Movement', 4, ARRAY['FMS Level 2', 'TRX Certified']),
('David Wilson', 'Senior Trainer', 'Sports Performance', 10, ARRAY['NSCA-CSCS', 'Olympic Lifting', 'Speed & Agility']);
```

### 3. Run the Application
```bash
npm run dev
```

## 🔐 Authentication & Roles

### User Roles
- **Admin**: Full system access
- **Staff**: Branch-specific management via shared URLs
- **Member**: Personal dashboard access

### Staff Access
- No individual staff logins
- Shared branch URLs: `/dashboard/staff/branch_001`
- PIN verification for all actions
- Role-based permissions within branches

### Demo Accounts
- **Admin**: admin@fitgym.com / admin123
- **Member**: member@fitgym.com / member123

## 🔧 Key Features Implementation

### 1. PIN-Based Staff Accountability
- All staff actions require PIN verification
- Audit trail logs every action with staff identification
- No shared passwords - individual PINs for each staff member

### 2. Multi-Step Modals
- **Add Member**: Personal info → Package selection → Payment → Account creation
- **Renew Member**: Package selection → Pricing → Confirmation
- **PIN Verification**: Staff selection → PIN entry → Action approval

### 3. Real-Time Statistics
- Live member counts and status tracking
- Revenue calculations
- Expiry date monitoring
- Staff activity tracking

### 4. Role-Based Permissions
- **Associates**: Basic member management
- **Senior Staff**: Can remove associates + member management
- **Managers**: Full branch control

## 📱 Responsive Design

- Mobile-first approach
- Collapsible navigation
- Stacked cards on mobile
- Full-width modals on small screens
- Touch-friendly interface

## 🎨 UI/UX Features

- **Dark Theme**: Professional gym aesthetic
- **Orange Accents**: Primary branding color
- **Glassmorphism**: Modern navigation styling
- **Hover Effects**: Interactive feedback
- **Loading States**: Skeleton loaders
- **Toast Notifications**: Action feedback
- **Empty States**: Helpful placeholder content

## 🚀 Deployment

The app is ready for deployment on Vercel, Netlify, or any static hosting service.

### Build for Production
```bash
npm run build
```

## 📄 License

This project is proprietary software for FitGym Pro.
