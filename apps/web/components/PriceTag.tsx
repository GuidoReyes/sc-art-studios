import { useTranslations } from "next-intl";
import { formatGtq, formatUsd, usdToGtq } from "@/lib/price";

interface PriceTagProps {
  usd: number;
  /** Tipo de cambio de CostSettings. Pasarlo solo a visitantes de Guatemala para mostrar quetzales. */
  gtqPerUsd?: number;
  className?: string;
}

export function PriceTag({ usd, gtqPerUsd, className = "" }: PriceTagProps) {
  const t = useTranslations("Price");
  return (
    <p className={`flex flex-wrap items-baseline gap-x-2 ${className}`}>
      <span className="font-display text-2xl leading-none">{formatUsd(usd)}</span>
      {gtqPerUsd !== undefined && (
        <span className="text-sm font-extrabold">{t("approxGtq", { amount: formatGtq(usdToGtq(usd, gtqPerUsd)) })}</span>
      )}
    </p>
  );
}
