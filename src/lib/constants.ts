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
  {
    label: 'Staff',
    href: '/staff',
    icon: Briefcase,
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: Settings2,
  },
];