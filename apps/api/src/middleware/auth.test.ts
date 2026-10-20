import { describe, expect, it } from "vitest";
import express from "express";
import cookieParser from "cookie-parser";
import request from "supertest";
import { createTokenService } from "../lib/tokens.js";
import { ACCESS_COOKIE, requireAdmin } from "./auth.js";

const tokens = createTokenService({ accessSecret: "a".repeat(32), refreshSecret: "b".repeat(32) });

function build() {
  const app = express();
  app.use(cookieParser());
  const handler = requireAdmin(tokens, "OWNER");
  app.get("/owner", handler, (_req, res) => void res.json(res.locals.admin));
  app.post("/owner", handler, (_req, res) => void res.json(res.locals.admin));
  return app;
}

const cookie = (role: "OWNER" | "EDITOR" = "OWNER", sid = "fam1") =>
  `${ACCESS_COOKIE}=${tokens.signAccess({ sub: "u1", role, sid })}`;

describe("requireAdmin", () => {
  it("deja pasar un GET con sesión válida y deja la sesión en res.locals", async () => {
    const res = await request(build()).get("/owner").set("Cookie", cookie());

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: "u1", role: "OWNER", sessionId: "fam1" });
  });

  it("401 sin cookie", async () => {
    expect((await request(build()).get("/owner")).status).toBe(401);
  });

  it("401 con un token inválido", async () => {
    const res = await request(build()).get("/owner").set("Cookie", `${ACCESS_COOKIE}=basura`);

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Sesión vencida" });
  });

  it("403 si el rol no está permitido", async () => {
    expect((await request(build()).get("/owner").set("Cookie", cookie("EDITOR"))).status).toBe(403);
  });

  it("un POST sin cabecera CSRF es 403", async () => {
    const res = await request(build()).post("/owner").set("Cookie", cookie());

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: "Token CSRF inválido" });
  });

  it("un POST con el CSRF de otra sesión es 403", async () => {
    const res = await request(build())
      .post("/owner")
      .set("Cookie", cookie())
      .set("X-CSRF-Token", tokens.csrfToken("fam2"));

    expect(res.status).toBe(403);
  });

  it("un POST con el CSRF de su sesión pasa", async () => {
    const res = await request(build())
      .post("/owner")
      .set("Cookie", cookie())
      .set("X-CSRF-Token", tokens.csrfToken("fam1"));

    expect(res.status).toBe(200);
  });
});
