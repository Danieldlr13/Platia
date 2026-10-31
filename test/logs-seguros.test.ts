import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describirError } from "../src/ingest/log-seguro";

describe("describirError", () => {
  it("no incluye el mensaje del error", () => {
    const err = new Error("monto 58.900 en EXITO SUPERMERCADO de persona@example.com");
    const txt = describirError(err);
    expect(txt).toBe("Error");
    expect(txt).not.toMatch(/58|EXITO|example/);
  });

  it("conserva el tipo y el código seguros (p. ej. error de Supabase)", () => {
    const pg = {
      name: "PostgrestError",
      code: "23505",
      message: "duplicate key value violates unique constraint",
      details: "Key (comercio)=(UBER RIDES) already exists.",
    };
    expect(describirError(pg)).toBe("PostgrestError [23505]");
  });

  it("descarta nombres o códigos con texto libre", () => {
    expect(describirError({ name: "Compraste $3.704 en UBER", code: "a b c" })).toBe("Error");
  });

  it("tolera valores que no son objetos", () => {
    expect(describirError("texto con $1.000")).toBe("error desconocido");
    expect(describirError(undefined)).toBe("error desconocido");
  });
});

// Guarda estática: ningún console.* de la ingesta ni de los scripts puede
// referenciar campos con datos financieros o del correo.
describe("console.* en src/ingest y scripts", () => {
  const prohibidos =
    /\.message\b|\bmonto\b|\bcomercio\b|\btarjeta\b|\bresumen\b|\.subject\b|\.from\b|\.text\b|\.html\b|\.razon\b|REMITENTE|IMAP_USER|\binterno\.html\b|\$\{\s*(e|err|error)\s*\}|,\s*(e|err|error)\s*\)/;

  // Descarta el texto literal de los mensajes y deja solo lo que se interpola
  // o se pasa como argumento (lo único que puede traer datos en tiempo de ejecución).
  function soloExpresiones(llamada: string): string {
    return llamada
      .replace(/"(?:[^"\\]|\\.)*"/g, '""')
      .replace(/`(?:[^`\\$]|\\.|\$(?!\{)|\$\{[^}]*\})*`/g, (t) =>
        (t.match(/\$\{[^}]*\}/g) ?? []).join(" "),
      );
  }

  const archivos = ["src/ingest", "scripts"].flatMap((dir) =>
    readdirSync(dir)
      .filter((f) => f.endsWith(".ts"))
      .map((f) => join(dir, f)),
  );

  it("encuentra archivos que revisar", () => {
    expect(archivos.length).toBeGreaterThan(5);
  });

  for (const archivo of archivos) {
    it(`${archivo} no imprime datos sensibles`, () => {
      const fuente = readFileSync(archivo, "utf8");
      // Une cada llamada console.*( ... ); aunque ocupe varias líneas.
      const llamadas = fuente.match(/console\.(log|error|warn|info)\([\s\S]*?\);/g) ?? [];
      for (const llamada of llamadas) {
        expect(soloExpresiones(llamada), llamada).not.toMatch(prohibidos);
      }
    });
  }
});
