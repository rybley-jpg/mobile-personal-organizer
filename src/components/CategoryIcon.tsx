import { Category } from '@/types';
import {
  Home, Briefcase, Heart, Plane, Phone, Wallet, Calendar, ShoppingCart,
  AlertTriangle, Tag, type LucideIcon,
} from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  home: Home,
  briefcase: Briefcase,
  heart: Heart,
  plane: Plane,
  phone: Phone,
  wallet: Wallet,
  calendar: Calendar,
  'shopping-cart': ShoppingCart,
  'alert-triangle': AlertTriangle,
  tag: Tag,
};

export function CategoryIcon({ icon, color, size = 18 }: { icon: string; color: string; size?: number }) {
  const Icon = ICON_MAP[icon] ?? Tag;
  return (
    <span
      className="inline-flex items-center justify-center rounded-full shrink-0"
      style={{ backgroundColor: `${color}22`, color, width: size + 12, height: size + 12 }}
    >
      <Icon size={size} />
    </span>
  );
}

export function getCategoryById(categories: Category[], id: string | null): Category | null {
  if (!id) return null;
  return categories.find((c) => c.id === id) ?? null;
}

export function getCategoryByName(categories: Category[], name: string): Category | null {
  return categories.find((c) => c.name === name) ?? null;
}
