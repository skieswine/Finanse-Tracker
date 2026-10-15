import {
  ArrowLeftRight,
  FileBarChart,
  HandCoins,
  LayoutDashboard,
  Lightbulb,
  Landmark,
  MoreHorizontal,
  PiggyBank,
  Tags,
  Target,
  Upload,
  UserCog,
  type LucideIcon,
} from "lucide-react";
import type { Dictionary } from "@/lib/i18n/types";

export type NavItem = {
  href: string;
  labelKey: keyof Dictionary["nav"];
  icon: LucideIcon;
  /** Extra path prefixes that also mark this item active. */
  alsoActiveOn?: string[];
};

/** Desktop sidebar: every top-level page. */
export const sidebarItems: NavItem[] = [
  { href: "/", labelKey: "dashboard", icon: LayoutDashboard },
  { href: "/transactions", labelKey: "transactions", icon: ArrowLeftRight },
  { href: "/import", labelKey: "import", icon: Upload },
  { href: "/insights", labelKey: "insights", icon: Lightbulb },
  { href: "/reports", labelKey: "reports", icon: FileBarChart },
];

/** Mobile bottom nav: max 5 slots, the rest lives under "More". */
export const bottomNavItems: NavItem[] = [
  { href: "/", labelKey: "dashboard", icon: LayoutDashboard },
  { href: "/transactions", labelKey: "transactions", icon: ArrowLeftRight },
  { href: "/import", labelKey: "import", icon: Upload },
  { href: "/insights", labelKey: "insights", icon: Lightbulb },
  {
    href: "/more",
    labelKey: "more",
    icon: MoreHorizontal,
    alsoActiveOn: ["/reports", "/categories", "/accounts", "/goals", "/debts", "/budgets", "/account"],
  },
];

export function isActive(pathname: string, item: Pick<NavItem, "href" | "alsoActiveOn">) {
  const match = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  return match(item.href) || (item.alsoActiveOn ?? []).some(match);
}

/** Settings group: sidebar section on desktop, "More" page on mobile. */
export const settingsItems: NavItem[] = [
  { href: "/categories", labelKey: "categories", icon: Tags },
  { href: "/accounts", labelKey: "accounts", icon: Landmark },
  { href: "/goals", labelKey: "goals", icon: PiggyBank },
  { href: "/debts", labelKey: "debts", icon: HandCoins },
  { href: "/budgets", labelKey: "budgets", icon: Target },
  { href: "/account", labelKey: "account", icon: UserCog },
];
