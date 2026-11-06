/** Envuelve el texto seleccionado (o inserta las etiquetas en el cursor). */
export function wrapSelection(value: string, start: number, end: number, open: string, close: string): string {
  const from = Math.max(0, Math.min(start, end));
  const to = Math.min(value.length, Math.max(start, end));
  return `${value.slice(0, from)}${open}${value.slice(from, to)}${close}${value.slice(to)}`;
}
