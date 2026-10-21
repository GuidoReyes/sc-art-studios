// Capa 3: el texto enriquecido de las historias se limpia antes de guardarse; la web lo pinta tal cual.
import sanitizeHtml from "sanitize-html";

// Solo formato de texto y enlaces. Nada de imágenes, iframes, estilos ni atributos de eventos:
// las fotos van por R2 y los videos por su propio modelo.
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ["p", "br", "strong", "em", "b", "i", "u", "s", "h2", "h3", "h4", "ul", "ol", "li", "blockquote", "a"],
  allowedAttributes: { a: ["href", "rel", "target"] },
  allowedSchemes: ["https", "http", "mailto"],
  allowProtocolRelative: false,
  // Los enlaces salen a otra pestaña sin pasar la referencia ni dar reputación a sitios ajenos.
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer nofollow", target: "_blank" }),
  },
};

export function sanitizeRichText(html: string): string {
  return sanitizeHtml(html, OPTIONS).trim();
}
