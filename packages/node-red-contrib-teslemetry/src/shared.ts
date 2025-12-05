import { Products, Teslemetry } from "@teslemetry/api";

export type Instance = {
  teslemetry: Teslemetry;
  products: Promise<Products>;
};

export const instances = new Map<string, Instance>();
