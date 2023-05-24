import { JSONProvider } from "./JSONProvider";

export interface SetOption {
  expire?: number;
}

export interface DataProvider<V> {
  set(key: string, value: V, option?: SetOption): void;
  get(key: string): null | { value: V; option?: SetOption };
  delete(key: string): void;
}

export class TempStore<V> {
  constructor(private provider: DataProvider<V>) {}

  set(key: string, value: V, option?: SetOption) {
    this.provider.set(key, value, option);
  }

  get(key: string): null | V {
    var res = this.provider.get(key);

    if (res?.option?.expire && res.option.expire <= Date.now()) {
      this.provider.delete(key);
      return null;
    }

    return res?.value ?? null;
  }

  delete(key: string) {
    this.provider.delete(key);
  }
}
