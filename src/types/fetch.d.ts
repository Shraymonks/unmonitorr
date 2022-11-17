// Workaround for fetch type not yet in @types/node
// https://github.com/DefinitelyTyped/DefinitelyTyped/issues/60924
declare global {
  var fetch: typeof import('undici').fetch;
}
export {};
