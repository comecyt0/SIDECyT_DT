/**
 * Validador algorítmico de la CURP y formato de nombres (E76 en SIGAE, D83 en SICEI; 16/10/2026).
 *
 * Espejo EXACTO de `App\Support\ValidadorCurp` y `App\Support\NombrePropio` del API. El mismo archivo vive en
 * SIGAE (apps/web/src/lib/curp.ts) y en SICEI (web/src/lib/curp.ts): si se cambia uno, se cambian los cuatro.
 * El front avisa mientras se escribe; el API vuelve a validar (dos capas, CLAUDE.md §0).
 */

export const ENTIDADES: Record<string, string> = {
  AS: "Aguascalientes", BC: "Baja California", BS: "Baja California Sur", CC: "Campeche", CL: "Coahuila",
  CM: "Colima", CS: "Chiapas", CH: "Chihuahua", DF: "Ciudad de México", DG: "Durango", GT: "Guanajuato",
  GR: "Guerrero", HG: "Hidalgo", JC: "Jalisco", MC: "Estado de México", MN: "Michoacán", MS: "Morelos",
  NT: "Nayarit", NL: "Nuevo León", OC: "Oaxaca", PL: "Puebla", QT: "Querétaro", QR: "Quintana Roo",
  SP: "San Luis Potosí", SL: "Sinaloa", SR: "Sonora", TC: "Tabasco", TS: "Tamaulipas", TL: "Tlaxcala",
  VZ: "Veracruz", YN: "Yucatán", ZS: "Zacatecas", NE: "Nacido en el extranjero",
};

export const SEXOS: Record<string, string> = { H: "Hombre", M: "Mujer", X: "No binario" };

export const REGEX_CURP =
  /^[A-Z][AEIOUX][A-Z]{2}\d{6}[HMX](AS|BC|BS|CC|CL|CM|CS|CH|DF|DG|GT|GR|HG|JC|MC|MN|MS|NT|NL|OC|PL|QT|QR|SP|SL|SR|TC|TS|TL|VZ|YN|ZS|NE)[B-DF-HJ-NP-TV-Z]{3}[0-9A-Z]\d$/;

/** Letras (con acentos, ñ y ü), espacios, guion, apóstrofo y punto; sin números. */
export const REGEX_NOMBRE = /^\p{L}[\p{L}\p{M} '’.-]*$/u;
export const MAX_NOMBRE = 60;

const PARTICULAS_CURP = ["DA", "DAS", "DE", "DEL", "DER", "DI", "DIE", "DD", "EL", "LA", "LOS", "LAS", "LE", "LES", "MAC", "MC", "VAN", "VON", "Y"];
const NOMBRES_COMUNES = ["MARIA", "MA", "JOSE", "J"];
const ALTISONANTES = new Set(
  ("BACA BAKA BUEI BUEY CACA CACO CAGA CAGO CAKA CAKO COGE COGI COJA COJE COJI COJO COLA CULO FALO FETO GETA GUEI " +
    "GUEY JETA JOTO KACA KACO KAGA KAGO KAKA KAKO KOGE KOGI KOJA KOJE KOJI KOJO KOLA KULO LILO LOCA LOCO LOKA LOKO " +
    "MAME MAMO MEAR MEAS MEON MIAR MION MOCO MOKO MULA MULO NACA NACO PEDA PEDO PENE PIPI PITO POPO PUTA PUTO QULO " +
    "RATA ROBA ROBE ROBO RUIN SENO TETA VACA VAGA VAGO VAKA VUEI VUEY WUEI WUEY").split(" "),
);
const DICCIONARIO = "0123456789ABCDEFGHIJKLMNÑOPQRSTUVWXYZ";
const PARTICULAS_NOMBRE = ["de", "del", "la", "las", "los", "y", "e", "da", "das", "do", "dos", "di", "der", "van", "von"];

/** Deja la CURP en mayúsculas, sin espacios ni símbolos y con 18 caracteres como máximo (para el onChange). */
export function limpiarCurp(v: string): string {
  return v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 18);
}

export function formatoCurpValido(curp: string): boolean {
  return REGEX_CURP.test(curp);
}

/** Fecha AAAA-MM-DD que trae la CURP, o null si no es una fecha real. */
export function fechaDeCurp(curp: string): string | null {
  const aa = Number(curp.slice(4, 6));
  const mm = Number(curp.slice(6, 8));
  const dd = Number(curp.slice(8, 10));
  const anio = (/\d/.test(curp[16] ?? "") ? 1900 : 2000) + aa;
  const f = new Date(Date.UTC(anio, mm - 1, dd));
  if (f.getUTCFullYear() !== anio || f.getUTCMonth() !== mm - 1 || f.getUTCDate() !== dd) return null;
  return `${anio}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
}

export interface DatosCurp {
  sexo: string;
  sexoNombre: string;
  entidad: string;
  entidadNombre: string;
  fecha: string | null;
}

/** Lo que dice la CURP por sí sola (sexo, entidad, fecha); null si el formato no es válido. */
export function datosDeCurp(curp: string): DatosCurp | null {
  if (!formatoCurpValido(curp)) return null;
  const entidad = curp.slice(11, 13);
  return {
    sexo: curp[10],
    sexoNombre: SEXOS[curp[10]],
    entidad,
    entidadNombre: ENTIDADES[entidad],
    fecha: fechaDeCurp(curp),
  };
}

export function digitoVerificador(curp17: string): number {
  let suma = 0;
  [...curp17.slice(0, 17)].forEach((c, i) => {
    suma += Math.max(0, DICCIONARIO.indexOf(c)) * (18 - i);
  });
  return (10 - (suma % 10)) % 10;
}

function palabra(texto: string, esNombre: boolean): string {
  const limpio = texto
    .trim()
    .toUpperCase()
    .replace(/Ñ/g, "\u0000")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\u0000/g, "Ñ")
    .replace(/['’.]/g, "")
    .replace(/[^A-ZÑ]+/g, " ");
  const palabras = limpio.split(" ").filter((p) => p !== "" && !PARTICULAS_CURP.includes(p));
  if (esNombre && palabras.length > 1 && NOMBRES_COMUNES.includes(palabras[0])) return palabras[1];
  return palabras[0] ?? "";
}

const inicial = (p: string) => (p === "" || p[0] === "Ñ" ? "X" : p[0]);
const vocalInterna = (p: string) => p.slice(1).match(/[AEIOU]/)?.[0] ?? "X";
const consonanteInterna = (p: string) => {
  const c = p.slice(1).match(/[B-DF-HJ-NP-TV-ZÑ]/)?.[0];
  return !c || c === "Ñ" ? "X" : c;
};

/** Las 4 letras iniciales y las 3 consonantes internas que corresponden a esa persona. */
export function curpEsperada(nombres: string, primerApellido: string, segundoApellido: string) {
  const p1 = palabra(primerApellido, false);
  const p2 = palabra(segundoApellido, false);
  const n = palabra(nombres, true);
  let letras = inicial(p1) + vocalInterna(p1) + inicial(p2) + inicial(n);
  if (ALTISONANTES.has(letras)) letras = letras[0] + "X" + letras.slice(2);
  return { letras, consonantes: consonanteInterna(p1) + consonanteInterna(p2) + consonanteInterna(n) };
}

const ddmmaaaa = (f: string) => f.split("-").reverse().join("/");

/** Problemas de la CURP frente a los datos (vacío = coincide). Mismos textos que el API. */
export function compararCurp(
  curp: string,
  nombres: string,
  primerApellido: string,
  segundoApellido: string,
  fechaNacimiento: string,
): Record<string, string> {
  if (!formatoCurpValido(curp)) {
    return {
      formato:
        "La CURP no tiene un formato válido. Son 18 caracteres: 4 letras, 6 números de tu fecha de nacimiento, sexo, estado y 5 caracteres más.",
    };
  }
  const problemas: Record<string, string> = {};
  if (Number(curp[17]) !== digitoVerificador(curp)) {
    problemas.verificador = "El último dígito de la CURP no corresponde con los anteriores. Revisa que esté bien escrita.";
  }
  const esperado = curpEsperada(nombres, primerApellido, segundoApellido);
  if (curp.slice(0, 4) !== esperado.letras) {
    problemas.letras = `Las primeras 4 letras de la CURP (${curp.slice(0, 4)}) no corresponden a tu nombre y apellidos; deberían ser ${esperado.letras}.`;
  }
  const fechaCurp = fechaDeCurp(curp);
  if (fechaCurp !== fechaNacimiento) {
    problemas.fecha =
      fechaCurp === null
        ? "La fecha dentro de la CURP no es una fecha real. Revisa los números 5 a 10."
        : `La fecha de la CURP (${ddmmaaaa(fechaCurp)}) no es tu fecha de nacimiento.`;
  }
  if (curp.slice(13, 16) !== esperado.consonantes) {
    problemas.consonantes = `Las letras 14 a 16 de la CURP (${curp.slice(13, 16)}) no corresponden a tu nombre y apellidos; deberían ser ${esperado.consonantes}.`;
  }
  return problemas;
}

/** «MARÍA DE LA LUZ» → «María de la Luz»; partículas en minúscula salvo al final o al abrir el nombre. */
export function nombrePropio(texto: string, esNombre = false): string {
  const limpio = texto.trim().replace(/\s+/g, " ");
  if (limpio === "") return "";
  const palabras = limpio.toLowerCase().split(" ");
  const ultima = palabras.length - 1;
  return palabras
    .map((p, i) => {
      const esParticula = PARTICULAS_NOMBRE.includes(p) && i < ultima && !(esNombre && i === 0);
      return esParticula ? p : p.replace(/(^|-|(?<=^\p{L})['’])(\p{L})/gu, (_m, a: string, b: string) => a + b.toUpperCase());
    })
    .join(" ");
}

/** Mensaje del campo de nombre o apellido, o null si está bien. */
export function problemaNombre(texto: string, etiqueta: string, obligatorio = true): string | null {
  const t = texto.trim();
  if (t === "") return obligatorio ? `Escribe tu ${etiqueta}.` : null;
  if (t.length > MAX_NOMBRE) return `Máximo ${MAX_NOMBRE} caracteres.`;
  if (!REGEX_NOMBRE.test(t)) return `Tu ${etiqueta} solo puede llevar letras, espacios, guion o apóstrofo; sin números.`;
  return null;
}

// ── Estado de un formulario de identidad (lo comparten los formularios de ambos sistemas) ──────────────────────────

export interface Identidad {
  nombres: string;
  primer_apellido: string;
  segundo_apellido: string;
  /** «No tengo segundo apellido»: la CURP lleva X en la 3.ª letra. */
  sin_segundo: boolean;
  fecha_nacimiento: string;
  curp: string;
  /** La persona confirma que su CURP es correcta aunque no coincida: va a revisión manual. */
  curp_revision: boolean;
}

export const IDENTIDAD_VACIA: Identidad = {
  nombres: "", primer_apellido: "", segundo_apellido: "", sin_segundo: false, fecha_nacimiento: "", curp: "", curp_revision: false,
};

const NO_REVISABLES = ["formato", "verificador"];

export interface RevisionIdentidad {
  /** Errores de cada campo (nombres, primer_apellido, segundo_apellido, fecha_nacimiento, curp). */
  campos: Partial<Record<keyof Identidad, string>>;
  /** Qué no coincide entre la CURP y los datos (solo cuando todo lo demás está bien). */
  problemas: string[];
  /** Los problemas se pueden mandar a revisión manual (no son de formato ni de dígito verificador). */
  revisable: boolean;
  /** Lo que dice la CURP (sexo, estado, fecha), si tiene formato válido. */
  datos: DatosCurp | null;
  coincide: boolean;
}

export function revisarIdentidad(i: Identidad, hoy = new Date().toISOString().slice(0, 10)): RevisionIdentidad {
  const campos: RevisionIdentidad["campos"] = {};
  const n = problemaNombre(i.nombres, "nombre");
  if (n) campos.nombres = n;
  const p1 = problemaNombre(i.primer_apellido, "primer apellido");
  if (p1) campos.primer_apellido = p1;
  if (!i.sin_segundo) {
    const p2 = problemaNombre(i.segundo_apellido, "segundo apellido");
    if (p2) campos.segundo_apellido = i.segundo_apellido.trim() === "" ? "Escribe tu segundo apellido o marca «No tengo segundo apellido»." : p2;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(i.fecha_nacimiento)) campos.fecha_nacimiento = "Escribe tu fecha de nacimiento.";
  else if (i.fecha_nacimiento >= hoy || i.fecha_nacimiento <= "1900-01-01") campos.fecha_nacimiento = "La fecha de nacimiento no es válida.";
  if (i.curp.length !== 18) campos.curp = `La CURP debe tener 18 caracteres (llevas ${i.curp.length}).`;
  else if (!formatoCurpValido(i.curp)) campos.curp = "La CURP no tiene un formato válido.";

  const datos = datosDeCurp(i.curp);
  if (Object.keys(campos).length > 0) return { campos, problemas: [], revisable: false, datos, coincide: false };

  const encontrados = compararCurp(i.curp, i.nombres, i.primer_apellido, i.sin_segundo ? "" : i.segundo_apellido, i.fecha_nacimiento);
  const claves = Object.keys(encontrados);
  return {
    campos,
    problemas: Object.values(encontrados),
    revisable: claves.length > 0 && !claves.some((k) => NO_REVISABLES.includes(k)),
    datos,
    coincide: claves.length === 0,
  };
}

/** Primer motivo que impide continuar, o null. Con problemas revisables, basta con que la persona pida revisión. */
export function errorIdentidad(i: Identidad): string | null {
  const r = revisarIdentidad(i);
  const primero = Object.values(r.campos)[0];
  if (primero) return primero;
  if (r.coincide) return null;
  if (!r.revisable) return r.problemas[0];
  return i.curp_revision ? null : "Tu CURP no coincide con tu nombre o tu fecha de nacimiento. Corrige los datos o, si estás seguro de que tu CURP es correcta, envíala a revisión.";
}

/** Lo que se manda al API: nombres ya con mayúscula inicial. */
export function payloadIdentidad(i: Identidad) {
  return {
    nombres: nombrePropio(i.nombres, true),
    primer_apellido: nombrePropio(i.primer_apellido),
    segundo_apellido: i.sin_segundo ? "" : nombrePropio(i.segundo_apellido),
    fecha_nacimiento: i.fecha_nacimiento,
    curp: i.curp,
    curp_revision: i.curp_revision,
  };
}

/** Nombre completo para resúmenes: «Nombres Primer Segundo». */
export function nombreCompleto(i: Pick<Identidad, "nombres" | "primer_apellido" | "segundo_apellido" | "sin_segundo">): string {
  return [nombrePropio(i.nombres, true), nombrePropio(i.primer_apellido), i.sin_segundo ? "" : nombrePropio(i.segundo_apellido)]
    .filter(Boolean)
    .join(" ");
}

export const ddmmaaaaFecha = (f: string | null | undefined) => (f ? ddmmaaaa(f) : "");