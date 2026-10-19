import { useTranslations } from "next-intl";
import type { PublicMaskStatus } from "@/lib/mask";
import { SURFACE_CLASSES, type SurfaceName } from "@/lib/palette";

const STATUS_STYLE: Record<
  PublicMaskStatus,
  { surface: SurfaceName; key: "available" | "reserved" | "sold" | "commissionExample" }
> = {
  AVAILABLE: { surface: "turquoise", key: "available" },
  RESERVED: { surface: "orange", key: "reserved" },
  SOLD: { surface: "cream", key: "sold" },
  COMMISSION_EXAMPLE: { surface: "purple", key: "commissionExample" },
};

interface StatusPillProps {
  status: PublicMaskStatus;
  className?: string;
}

export function StatusPill({ status, className = "" }: StatusPillProps) {
  const t = useTranslations("Masks.status");
  const { surface, key } = STATUS_STYLE[status];
  return (
    <span
      className={`inline-flex items-center rounded-full border-[3px] border-ink px-3 py-0.5 text-sm font-extrabold uppercase tracking-wide shadow-sticker ${SURFACE_CLASSES[surface]} ${className}`}
    >
      {t(key)}
    </span>
  );
}
