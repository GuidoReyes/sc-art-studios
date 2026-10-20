import { z } from "zod";

// Schemas compartidos entre web y api. Ejemplo: formulario de contacto.
export const ContactSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  whatsapp: z.string().regex(/^\+?[0-9 ]{8,16}$/).optional(),
  message: z.string().min(5).max(2000),
  turnstileToken: z.string().min(1),
}).strict();
export type Contact = z.infer<typeof ContactSchema>;

export type * from "./masks.js";
export type * from "./content.js";
