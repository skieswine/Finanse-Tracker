import {
  Banknote,
  Briefcase,
  Bus,
  Car,
  Circle,
  Coffee,
  Dumbbell,
  Gift,
  GraduationCap,
  HeartPulse,
  Home,
  Laptop,
  LifeBuoy,
  PartyPopper,
  PawPrint,
  PiggyBank,
  Plane,
  PlusCircle,
  Repeat,
  Shield,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Undo2,
  Utensils,
  Zap,
  Baby,
  Fuel,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/** Curated icon set; `categories.icon` stores one of these keys. */
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "shopping-cart": ShoppingCart,
  home: Home,
  zap: Zap,
  bus: Bus,
  car: Car,
  fuel: Fuel,
  repeat: Repeat,
  utensils: Utensils,
  coffee: Coffee,
  "shopping-bag": ShoppingBag,
  shirt: Shirt,
  "heart-pulse": HeartPulse,
  dumbbell: Dumbbell,
  shield: Shield,
  smartphone: Smartphone,
  "party-popper": PartyPopper,
  plane: Plane,
  "graduation-cap": GraduationCap,
  baby: Baby,
  "paw-print": PawPrint,
  gift: Gift,
  wrench: Wrench,
  banknote: Banknote,
  briefcase: Briefcase,
  laptop: Laptop,
  "undo-2": Undo2,
  "plus-circle": PlusCircle,
  "piggy-bank": PiggyBank,
  "life-buoy": LifeBuoy,
  circle: Circle,
};

export const CATEGORY_ICON_NAMES = Object.keys(CATEGORY_ICONS);

type CategoryIconProps = {
  icon: string | null | undefined;
  color?: string | null;
  className?: string;
};

/** Round colored badge with the category icon. */
export function CategoryIcon({ icon, color, className }: CategoryIconProps) {
  const Icon = (icon && CATEGORY_ICONS[icon]) || Circle;
  return (
    <span
      aria-hidden="true"
      className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", className)}
      style={{
        backgroundColor: color ? `${color}22` : "var(--muted)",
        color: color ?? "var(--muted-foreground)",
      }}
    >
      <Icon className="size-4" />
    </span>
  );
}
