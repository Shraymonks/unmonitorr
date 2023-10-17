// Workaround for fetch type not yet in @types/node
// https://github.com/DefinitelyTyped/DefinitelyTyped/issues/60924
declare global {
  const fetch: typeof import('undici-types').fetch;
}
export {};
