import { useTranslations } from "next-intl";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { BrandIcon } from "./icons/BrandIcon";

interface WhatsAppButtonProps {
  /** Número del adulto responsable (lib/site.ts). Sin número no se muestra el botón. */
  phone: string | undefined;
  /** Mensaje prellenado, p. ej. "Hola, me interesa la máscara Jaguar Dorado". */
  message: string;
  className?: string;
}

export function WhatsAppButton({ phone, message, className = "" }: WhatsAppButtonProps) {
  const t = useTranslations("WhatsApp");
  if (!phone) return null;

  return (
    <a
      href={buildWhatsAppUrl(phone, message)}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex w-fit items-center gap-3 rounded-full border-4 border-ink bg-whatsapp px-6 py-3 text-lg font-extrabold text-ink shadow-sticker transition-[transform,box-shadow] duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-sticker-lg focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-ink active:translate-x-0.5 active:translate-y-0.5 active:shadow-none motion-reduce:transition-none ${className}`}
    >
      <BrandIcon name="whatsapp" className="size-6" />
      {t("label")}
      <span className="sr-only">{t("newTab")}</span>
    </a>
  );
}
