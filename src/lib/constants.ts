
import type { LucideIcon } from 'lucide-react';
import { LayoutDashboard, Package, ShoppingCart, Truck, UsersRound, Settings2, Building2, Briefcase } from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    label: 'Products',
    href: '/products',
    icon: Package,
  },
  {
    label: 'Orders',
    href: '/orders',
    icon: ShoppingCart,
  },
  {
    label: 'Procurements',
    href: '/procurements',
    icon: Truck,
  },
  {
    label: 'Users',
    href: '/users',
    icon: UsersRound,
  },
  {
    label: 'Business Profiles',
    href: '/business-profiles',
    icon: Building2,
  },
  // {
  //   label: 'Staff',
  //   href: '/staff',
  //   icon: Briefcase,
  // },
  {
    label: 'Settings',
    href: '/settings',
    icon: Settings2,
  },
];

export interface IndianState {
  name: string;
  code: string; // GST State Code (e.g., "06", "27")
  type: 'STATE' | 'UT'; // Union Territory
}

export const indianStates: IndianState[] = [
  { name: "ANDAMAN AND NICOBAR ISLANDS", code: "35", type: "UT" },
  { name: "ANDHRA PRADESH", code: "37", type: "STATE" },
  { name: "ANDHRA PRADESH (BEFORE DIVISION)", code: "28", type: "STATE" }, 
  { name: "ARUNACHAL PRADESH", code: "12", type: "STATE" },
  { name: "ASSAM", code: "18", type: "STATE" },
  { name: "BIHAR", code: "10", type: "STATE" },
  { name: "CHANDIGARH", code: "04", type: "UT" },
  { name: "CHHATTISGARH", code: "22", type: "STATE" },
  { name: "DADRA AND NAGAR HAVELI", code: "26", type: "UT" }, 
  { name: "DADRA AND NAGAR HAVELI AND DAMAN AND DIU", code: "26", type: "UT" },
  { name: "DAMAN AND DIU", code: "25", type: "UT" }, 
  { name: "DELHI", code: "07", type: "UT" },
  { name: "GOA", code: "30", type: "STATE" },
  { name: "GUJARAT", code: "24", type: "STATE" },
  { name: "HARYANA", code: "06", type: "STATE" },
  { name: "HIMACHAL PRADESH", code: "02", type: "STATE" },
  { name: "JAMMU AND KASHMIR", code: "01", type: "UT" },
  { name: "JHARKHAND", code: "20", type: "STATE" },
  { name: "KARNATAKA", code: "29", type: "STATE" },
  { name: "KERALA", code: "32", type: "STATE" },
  { name: "LADAKH", code: "38", type: "UT" },
  { name: "LAKSHADWEEP", code: "31", type: "UT" },
  { name: "MADHYA PRADESH", code: "23", type: "STATE" },
  { name: "MAHARASHTRA", code: "27", type: "STATE" },
  { name: "MANIPUR", code: "14", type: "STATE" },
  { name: "MEGHALAYA", code: "17", type: "STATE" },
  { name: "MIZORAM", code: "15", type: "STATE" },
  { name: "NAGALAND", code: "13", type: "STATE" },
  { name: "ODISHA", code: "21", type: "STATE" },
  { name: "OTHER TERRITORY", code: "97", type: "UT" }, 
  { name: "PUDUCHERRY", code: "34", type: "UT" },
  { name: "PUNJAB", code: "03", type: "STATE" },
  { name: "RAJASTHAN", code: "08", type: "STATE" },
  { name: "SIKKIM", code: "11", type: "STATE" },
  { name: "TAMIL NADU", code: "33", type: "STATE" },
  { name: "TELANGANA", code: "36", type: "STATE" },
  { name: "TRIPURA", code: "16", type: "STATE" },
  { name: "UTTAR PRADESH", code: "09", type: "STATE" },
  { name: "UTTARAKHAND", code: "05", type: "STATE" },
  { name: "WEST BENGAL", code: "19", type: "STATE" }
];

// These are internal system roles for staff/users with specific platform access
export const USER_ROLES_OPTIONS = ["ADMIN", "MANAGER", "POS_USER", "SALES_PERSON"] as const;

// Value used in forms to represent a customer (no specific internal role)
export const CUSTOMER_ROLE_VALUE = "CUSTOMER_NO_ROLE"; // A non-empty string for form value

export const USER_ROLE_SELECT_OPTIONS = [
  { value: CUSTOMER_ROLE_VALUE, label: "Customer" },
  ...USER_ROLES_OPTIONS.map(role => ({ 
    value: role, 
    label: role.replace(/_/g, " ").charAt(0).toUpperCase() + role.replace(/_/g, " ").slice(1).toLowerCase() 
  }))
];

