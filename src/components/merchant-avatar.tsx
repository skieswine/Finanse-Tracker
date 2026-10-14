import { CATEGORY_ICONS, CategoryIcon } from "@/components/category-icon";
import { cn } from "@/lib/utils";
import { Circle } from "lucide-react";

// Colours come from --avatar-0..7 in globals.css (validated categorical
// palette, separate light/dark steps).
const PALETTE_SIZE = 8;

/** First word, letters only: "REWE SAGT DANKE." and "REWE Markt GmbH" → "rewe". */
function merchantKey(merchant: string): string {
  const word = merchant.trim().split(/\s+/)[0] ?? "";
  return word.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
}

/** Small stable string hash (FNV-1a). */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

type MerchantAvatarProps = {
  merchant: string | null;
  category?: { icon: string; color: string } | null;
  isTransfer?: boolean;
  className?: string;
};

/**
 * Monogram of the payee with a small category badge. Falls back to the plain
 * category icon when there is no merchant (or for transfers). All local — no logos fetched.
 */
export function MerchantAvatar({ merchant, category, isTransfer, className }: MerchantAvatarProps) {
  const key = merchant ? merchantKey(merchant) : "";
  if (!key || isTransfer) {
    return <CategoryIcon icon={isTransfer ? "repeat" : category?.icon} color={category?.color} className={className} />;
  }

  const color = `var(--avatar-${hash(key) % PALETTE_SIZE})`;
  const letter = key.charAt(0).toLocaleUpperCase();
  const BadgeIcon = (category && CATEGORY_ICONS[category.icon]) || Circle;

  return (
    <span aria-hidden="true" className={cn("relative flex size-9 shrink-0", className)}>
      <span
        className="flex size-9 items-center justify-center rounded-full text-sm font-semibold"
        style={{ backgroundColor: `color-mix(in oklch, ${color} 16%, transparent)`, color }}
      >
        {letter}
      </span>
      {category && (
        <span
          className="absolute -right-1 -bottom-1 flex size-4.5 items-center justify-center rounded-full ring-2 ring-card"
          style={{ backgroundColor: category.color, color: "#fff" }}
        >
          <BadgeIcon className="size-2.5" />
        </span>
      )}
    </span>
  );
}
