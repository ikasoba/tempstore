import { DataProvider, SetOption } from "./index.js";
import fs from "fs/promises";

export type JsonValues =
  | null
  | boolean
  | string
  | number
  | JsonValues[]
  | { [k: string]: JsonValues };

export type Value =
  | {
      type: "primitive";
      value: JsonValues;
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

export type JSONProviderValue = JsonValues | Date | ArrayBuffer;

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

  set(
    key: string,
    value: JSONProviderValue,
    option?: SetOption | undefined
  ): void {
    if (value instanceof Date) {
      this.database[key] = {
        type: "date",
        date: value.toJSON(),
        option: option,
      };
    } else if (value instanceof ArrayBuffer) {
      this.database[key] = {
        type: "buffer",
        buf: Buffer.from(value).toString("base64"),
        option: option,
      };
    } else {
      this.database[key] = {
        type: "primitive",
        value: value,
        option: option,
      };
    }

    fs.writeFile(this.path, JSON.stringify(this.database), "utf-8").catch(
      (e) => (fs.writeFile(this.path, "{}", "utf-8"), "{}")
    );
  }

  get(
    key: string
  ): { value: JSONProviderValue; option?: SetOption | undefined } | null {
    const value = this.database[key];

    if (value?.type == "primitive") {
      return { value: value.value, option: value.option };
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

    return null;
  }

  delete(key: string): void {
    delete this.database[key];
  }
}
