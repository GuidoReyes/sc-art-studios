import { describe, it, expect } from "vitest";
import { Writable } from "node:stream";
import { createLogger, serializeRequest, serializeResponse } from "./logger.js";

function capture() {
  const lines: string[] = [];
  const stream = new Writable({
    write(chunk, _enc, cb) {
      lines.push(chunk.toString());
      cb();
    },
  });
  return { lines, stream };
}

describe("createLogger", () => {
  it("escribe JSON estructurado", () => {
    const { lines, stream } = capture();

    createLogger("info", stream).info({ evento: "x" }, "hola");

    const entry = JSON.parse(lines[0]);
    expect(entry.msg).toBe("hola");
    expect(entry.evento).toBe("x");
  });

  it("oculta tokens, contraseñas y cookies", () => {
    const { lines, stream } = capture();

    createLogger("info", stream).info({
      password: "secreta",
      token: "tok",
      req: { headers: { cookie: "access=abc", authorization: "Bearer abc" } },
    });

    expect(lines[0]).not.toContain("secreta");
    expect(JSON.parse(lines[0]).token).toBe("[oculto]");
    expect(lines[0]).not.toContain("access=abc");
    expect(lines[0]).not.toContain("Bearer abc");
  });
});

describe("serializeRequest", () => {
  it("guarda método, ruta sin query string e id, sin cabeceras ni IP", () => {
    const out = serializeRequest({
      id: "req-1",
      method: "GET",
      url: "/api/contact?email=ana@example.com",
      headers: { cookie: "x" },
      remoteAddress: "1.2.3.4",
    });

    expect(out).toEqual({ id: "req-1", method: "GET", path: "/api/contact" });
  });
});

describe("serializeResponse", () => {
  it("guarda solo el código de estado", () => {
    expect(serializeResponse({ statusCode: 201 })).toEqual({ statusCode: 201 });
  });
});
