import { describe, expect, it } from "vitest";
import { compararCurp, curpEsperada, datosDeCurp, digitoVerificador, limpiarCurp, nombrePropio, problemaNombre } from "./curp";

describe("validador de CURP (E76/D83)", () => {
  it("calcula el dígito del ejemplo oficial de RENAPO", () => {
    expect(digitoVerificador("HEGG560427MVZRRL0")).toBe(4);
    expect(compararCurp("HEGG560427MVZRRL04", "Gloria", "Hernández", "García", "1956-04-27")).toEqual({});
  });

  it("aplica las reglas de RENAPO: partículas, María/José, Ñ y altisonantes", () => {
    expect(curpEsperada("María de los Ángeles", "de la Peña", "")).toEqual({ letras: "PEXA", consonantes: "XXN" });
    expect(curpEsperada("José Luis", "Núñez", "Ortiz")).toEqual({ letras: "NUOL", consonantes: "XRS" });
    expect(curpEsperada("Ofelia", "Bueno", "Ibarra").letras).toBe("BUIO");
    expect(curpEsperada("Yesenia", "Bueno", "Escobar").letras).toBe("BXEY"); // BUEY es altisonante
    expect(curpEsperada("Pedro", "Pérez", "").letras).toBe("PEXP"); // sin segundo apellido
  });

  it("explica qué parte no coincide", () => {
    const p = compararCurp("HEGG560427MVZRRL04", "Gloria", "Hernández", "García", "1956-04-28");
    expect(Object.keys(p)).toEqual(["fecha"]);
    expect(p.fecha).toContain("27/04/1956");
    expect(Object.keys(compararCurp("HEGG560427MVZRRL05", "Gloria", "Hernández", "García", "1956-04-27"))).toEqual(["verificador"]);
    expect(Object.keys(compararCurp("FOCA", "Ana", "Flores", "Castorena", "2000-01-01"))).toEqual(["formato"]);
  });

  it("lee sexo, estado y fecha de la CURP", () => {
    expect(datosDeCurp("HEGG560427MVZRRL04")).toEqual({
      sexo: "M", sexoNombre: "Mujer", entidad: "VZ", entidadNombre: "Veracruz", fecha: "1956-04-27",
    });
    expect(datosDeCurp("HEGG560427MZZRRL04")).toBeNull();
  });

  it("limpia la CURP mientras se escribe", () => {
    expect(limpiarCurp(" hegg-560427 mvzrrl04xx")).toBe("HEGG560427MVZRRL04");
  });
});

describe("nombres con mayúscula inicial", () => {
  it("unifica mayúsculas y respeta partículas, guiones y acentos", () => {
    expect(nombrePropio("MARÍA DE LA LUZ", true)).toBe("María de la Luz");
    expect(nombrePropio("  de   la cruz ")).toBe("de la Cruz");
    expect(nombrePropio("ruiz-esparza")).toBe("Ruiz-Esparza");
    expect(nombrePropio("o'connor")).toBe("O'Connor");
    expect(nombrePropio("del")).toBe("Del");
    expect(nombrePropio("ÑUÑO")).toBe("Ñuño");
  });

  it("rechaza números en nombres", () => {
    expect(problemaNombre("Florescastorena 12", "primer apellido")).toMatch(/sin números/);
    expect(problemaNombre("Peña Nieto", "primer apellido")).toBeNull();
    expect(problemaNombre("", "segundo apellido", false)).toBeNull();
  });
});
