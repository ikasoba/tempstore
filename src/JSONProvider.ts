import { Awaitable, DataProvider, SetOption } from "./index.js";
import fs from "fs/promises";

export type JsonValues = null | boolean | string | number;

export type Value =
  | {
      type: "primitive";
      value: JsonValues | Value[] | { [k: string]: Value };
      option?: SetOption;
    }
  | {
      type: "date";
      date: string;
      option?: SetOption;
    }
  | {
      type: `buffer`;
      /** base64 encoded */
      buf: string;
      option?: SetOption;
    };

export interface DataBase {
  [k: string]: Value | undefined;
}

export type JSONProviderValue =
  | JsonValues
  | Date
  | ArrayBuffer
  | JSONProviderValue[]
  | { [k: string]: JSONProviderValue };

export class JSONProvider implements DataProvider<JSONProviderValue> {
  static async create(path: string) {
    const database: DataBase = JSON.parse(
      await fs
        .readFile(path, "utf8")
        .catch((e) => (fs.writeFile(path, "{}", "utf-8"), "{}"))
    );
    return new JSONProvider(path, database);
  }

  constructor(public path: string, private database: DataBase) {}

  serialize(value: JSONProviderValue, option?: SetOption): Value {
    if (value instanceof Date) {
      return {
        type: "date",
        date: value.toJSON(),
        option: option,
      };
    } else if (value instanceof ArrayBuffer) {
      return {
        type: "buffer",
        buf: Buffer.from(value).toString("base64"),
        option: option,
      };
    } else {
      if (value instanceof Array) {
        return {
          type: "primitive",
          value: value.map((x) => this.serialize(x)),
          option: option,
        };
      } else if (value && typeof value == "object") {
        return {
          type: "primitive",
          value: Object.fromEntries(
            Object.entries(value).map(([k, v]) => [k, this.serialize(v)])
          ),
        };
      }
      return {
        type: "primitive",
        value: value,
        option: option,
      };
    }
  }

  deserialize(value: Value): {
    value: JSONProviderValue;
    option?: SetOption | undefined;
  } {
    if (value?.type == "primitive") {
      if (typeof value.value == "object" && !(value.value instanceof Array)) {
        const o: { [k: string]: JSONProviderValue } = {};
        for (const key in value.value) {
          o[key] = this.deserialize(value.value[key]).value;
        }
        return { value: o, option: value.option };
      } else if (value.value instanceof Array) {
        return {
          value: value.value.map((x) => this.deserialize(x).value),
          option: value.option,
        };
      } else {
        return {
          value: value.value,
          option: value.option,
        };
      }
    } else if (value?.type == "buffer") {
      return {
        value: Buffer.from(value.buf, "base64"),
        option: value.option,
      };
    } else if (value?.type == "date") {
      return {
        value: new Date(value.date),
        option: value.option,
      };
    }
    return {
      value: null,
    };
  }

  async set(
    key: string,
    value: JSONProviderValue,
    option?: SetOption | undefined
  ) {
    this.database[key] = this.serialize(value, option) as any;

    await fs
      .writeFile(this.path, JSON.stringify(this.database), "utf-8")
      .catch((e) => (fs.writeFile(this.path, "{}", "utf-8"), "{}"));
  }

  get(
    key: string
  ): { value: JSONProviderValue; option?: SetOption | undefined } | null {
    const value = this.database[key];

    return value != null ? this.deserialize(value) : null;
  }

  delete(key: string): void {
    delete this.database[key];
  }

  keys() {
    return Object.keys(this.database);
  }

  values() {
    return Object.values(this.database)
      .filter((x): x is typeof x & {} => x != undefined)
      .map((x) => this.deserialize(x).value);
  }

  entries() {
    return Object.entries(this.database)
      .filter(
        (x): x is [(typeof x)[0], (typeof x)[1] & {}] => x[1] != undefined
      )
      .map(
        ([k, v]) =>
          [k, this.deserialize(v).value] as [string, JSONProviderValue]
      );
  }
}
