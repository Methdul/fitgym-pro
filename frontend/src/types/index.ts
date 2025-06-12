
export type UserRole = 'admin' | 'member';
export type StaffRole = 'manager' | 'senior_staff' | 'associate';
export type MemberStatus = 'active' | 'expired' | 'suspended';
export type PackageType = 'individual' | 'couple';
export type PaymentMethod = 'card' | 'cash';

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  hours: string;
  image_url?: string;
  member_count: number;
  staff_count: number;
  facilities: string[];
  created_at: string;
  updated_at: string;
}

export interface BranchStaff {
  id: string;
  branch_id: string;
  first_name: string;
  last_name: string;
  role: StaffRole;
  pin: string;
  email: string;
  phone?: string;
  last_active?: string;
  created_at: string;
  updated_at: string;
}

export interface Member {
  id: string;
  branch_id: string;
  user_id?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  national_id: string;
  status: MemberStatus;
  package_type: PackageType;
  package_name: string;
  package_price: number;
  start_date: string;
  expiry_date: string;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface Package {
  id: string;
  name: string;
  type: PackageType;
  price: number;
  duration_months: number;
  features: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MemberRenewal {
  id: string;
  member_id: string;
  package_id: string;
  payment_method: PaymentMethod;
  amount_paid: number;
  previous_expiry: string;
  new_expiry: string;
  renewed_by_staff_id: string;
  created_at: string;
}

export interface Partnership {
  id: string;
  name: string;
  category: 'food' | 'retail' | 'wellness' | 'automotive';
  description: string;
  benefits: string;
  website_url?: string;
  logo_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GymStaff {
  id: string;
  name: string;
  role: string;
  specialization: string;
  experience_years: number;
  certifications: string[];
  photo_url?: string;
  is_displayed: boolean;
  created_at: string;
  updated_at: string;
}

export interface StaffActionLog {
  id: string;
  staff_id: string;
  action_type: string;
  description: string;
  member_id?: string;
  created_at: string;
}
