// XXX Ideally I'd like to replace this function with an explicit path
// or optic or something. Although --- if it's just for debugging, maybe
// it'd be enough to build up a parallel bit of debugging info, together
// with the actual function.
const setter = Symbol('setter');

export type Setter<T> = { t: typeof setter, f: (x: T) => T };

export function runSetter<T>(setter: Setter<T>, input: T): T {
  return setter.f(input);
}

export function mkSetter<T>(f: (x: T) => T): Setter<T> {
  return { t: setter, f };
}
