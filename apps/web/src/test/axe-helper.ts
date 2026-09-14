import { expect } from 'vitest';
import * as matchers from 'vitest-axe/matchers';
import { axe } from 'vitest-axe';

expect.extend(matchers);

declare module 'vitest' {
  interface Assertion {
    toHaveNoViolations(): void;
  }
}

export { axe };
