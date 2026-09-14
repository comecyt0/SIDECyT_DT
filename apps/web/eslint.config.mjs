import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import securityPlugin from "eslint-plugin-security";
import noUnsanitized from "eslint-plugin-no-unsanitized";

// M3 — Plugins de seguridad de ESLint:
//   - eslint-plugin-security: detecta patrones de inseguridad (RegExp inseguro,
//     eval, child_process con input, etc.).
//   - eslint-plugin-no-unsanitized: prohíbe innerHTML/outerHTML/document.write
//     y APIs de Trusted Types sin sanitización.
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "public/sw.js",
  ]),
  {
    plugins: {
      security: securityPlugin,
      "no-unsanitized": noUnsanitized,
    },
    rules: {
      // Reglas previas
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["error", {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_",
        "ignoreRestSiblings": true,
      }],
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",

      // M3 — Seguridad (eslint-plugin-security)
      "security/detect-object-injection": "off",        // Falsos positivos en TS estricto
      "security/detect-non-literal-fs-filename": "warn",
      "security/detect-non-literal-regexp": "warn",
      "security/detect-non-literal-require": "error",
      "security/detect-eval-with-expression": "error",
      "security/detect-pseudoRandomBytes": "error",
      "security/detect-possible-timing-attacks": "warn",
      "security/detect-unsafe-regex": "error",
      "security/detect-buffer-noassert": "error",
      "security/detect-child-process": "error",
      "security/detect-disable-mustache-escape": "error",
      "security/detect-new-buffer": "error",
      "security/detect-no-csrf-before-method-override": "error",
      "security/detect-bidi-characters": "error",

      // M3 — no-unsanitized (innerHTML, document.write, etc.)
      "no-unsanitized/method": "error",
      "no-unsanitized/property": "error",
    },
  },
]);

export default eslintConfig;
