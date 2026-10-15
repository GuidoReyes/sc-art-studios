import { notFound } from "next/navigation";

// Cualquier ruta desconocida bajo /[locale] muestra el 404 traducido.
export default function CatchAllPage() {
  notFound();
}
