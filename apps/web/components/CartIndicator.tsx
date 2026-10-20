import { ShoppingBag } from "lucide-react";
import { useTranslations } from "next-intl";

interface CartIndicatorProps {
  /** Líneas del carrito de Shopify; llega con la tarea del carrito (Storefront API). */
  count: number;
}

export function CartIndicator({ count }: CartIndicatorProps) {
  const t = useTranslations("Nav");
  return (
    <span role="status" className="relative inline-flex size-11 items-center justify-center rounded-full border-[3px] border-ink bg-cream">
      <ShoppingBag aria-hidden="true" className="size-5" strokeWidth={2.5} />
      <span className="sr-only">{t("cart", { count })}</span>
      {count > 0 && (
        <span
          aria-hidden="true"
          className="absolute -right-1.5 -top-1.5 flex min-w-6 items-center justify-center rounded-full border-2 border-ink bg-pink-deep px-1 text-xs font-extrabold text-cream"
        >
          {count}
        </span>
      )}
    </span>
  );
}
