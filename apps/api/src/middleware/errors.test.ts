import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import { z } from "zod";
import { errorHandler } from "./errors.js";

function appThatThrows(err: unknown) {
  const app = express();
  app.get("/boom", () => {
    throw err;
  });
  app.use(errorHandler);
  return app;
}

describe("errorHandler", () => {
  it("convierte ZodError en 400 con la lista de problemas", async () => {
    const zodError = z.object({ email: z.email() }).safeParse({ email: "x" }).error;

    const res = await request(appThatThrows(zodError)).get("/boom");

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Datos inválidos");
    expect(res.body.issues[0].path).toEqual(["email"]);
  });

  it("no repite en la respuesta el valor enviado", async () => {
    const zodError = z.object({ role: z.enum(["OWNER", "EDITOR"]) }).safeParse({ role: "valor-secreto" }).error;

    const res = await request(appThatThrows(zodError)).get("/boom");

    expect(JSON.stringify(res.body)).not.toContain("valor-secreto");
  });

  it("delega a Express (que corta la conexión) si la respuesta ya empezó", async () => {
    const app = express();
    app.get("/partial", (_req, res, next) => {
      res.write("parcial");
      next(new Error("tarde"));
    });
    app.use(errorHandler);

    await expect(request(app).get("/partial")).rejects.toThrow(/aborted|socket hang up/);
  });

  it("responde 500 genérico sin filtrar el mensaje interno", async () => {
    const res = await request(appThatThrows(new Error("password=hunter2 en la DB"))).get("/boom");

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "Error interno" });
    expect(JSON.stringify(res.body)).not.toContain("hunter2");
  });

  it("respeta el status 4xx de errores HTTP (p. ej. 413) con mensaje genérico", async () => {
    const tooLarge = Object.assign(new Error("request entity too large"), { status: 413, expose: true });

    const res = await request(appThatThrows(tooLarge)).get("/boom");

    expect(res.status).toBe(413);
    expect(res.body).toEqual({ error: "Solicitud inválida" });
  });
});
