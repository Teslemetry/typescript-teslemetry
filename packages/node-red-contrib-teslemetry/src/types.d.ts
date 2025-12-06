import { NodeMessageInFlow } from "node-red";

export interface Msg extends NodeMessageInFlow {
  [key: string]: any;
}
