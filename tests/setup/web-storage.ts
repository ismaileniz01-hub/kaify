/**
 * Node 25+ exposes Web Storage globals; Node 24 (the version pinned in
 * package.json engines, .nvmrc and CI) does not. Give the node test
 * environment an in-memory Storage so browser-side helpers behave the same
 * on every supported Node version.
 */
class MemoryStorage implements Storage {
  #items = new Map<string, string>();

  get length(): number {
    return this.#items.size;
  }

  clear(): void {
    this.#items.clear();
  }

  getItem(key: string): string | null {
    return this.#items.has(key) ? (this.#items.get(key) as string) : null;
  }

  key(index: number): string | null {
    return [...this.#items.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.#items.delete(key);
  }

  setItem(key: string, value: string): void {
    this.#items.set(key, String(value));
  }
}

for (const name of ["sessionStorage", "localStorage"] as const) {
  if (typeof globalThis[name] === "undefined") {
    Object.defineProperty(globalThis, name, {
      value: new MemoryStorage(),
      configurable: true,
      writable: true,
    });
  }
}
