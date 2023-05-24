export type Awaitable<T> = PromiseLike<T> | T;

export interface SetOption {
  expire?: number;
}

export interface DataProvider<V> {
  set(key: string, value: V, option?: SetOption): Awaitable<void>;
  get(key: string): Awaitable<null | { value: V; option?: SetOption }>;
  delete(key: string): Awaitable<void>;
  keys(): Awaitable<string[]>;
  values(): Awaitable<V[]>;
  entries(): Awaitable<[string, V][]>;
}

export class TempStore<V> {
  constructor(private provider: DataProvider<V>) {}

  async set(key: string, value: V, option?: SetOption) {
    await this.provider.set(key, value, option);
  }

  async get(key: string): Promise<null | V> {
    var res = await this.provider.get(key);

    if (res?.option?.expire && res.option.expire <= Date.now()) {
      this.provider.delete(key);
      return null;
    }

    return res?.value ?? null;
  }

  delete(key: string) {
    this.provider.delete(key);
  }

  async keys() {
    return this.provider.keys();
  }

  async values() {
    return this.provider.values();
  }

  async entries() {
    return this.provider.entries();
  }
}
