import { Products, Teslemetry } from "packages/api/dist/index.cjs";

export type Instance = {
  teslemetry: Teslemetry;
  products: Promise<Products>;
};

export const instances = new Map<string, Instance>();
