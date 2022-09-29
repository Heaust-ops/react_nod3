import { Maybe } from "./utils";

export {};

export type Nod3SocketType = string;

export interface Nod3SocketAllowedTypes {
  in: Nod3SocketType[];
  out: Nod3SocketType[];
}

export interface Nod3SocketData<T> {
  type: Nod3SocketType;
  value: T;
}

class Nod3Socket {
  types: Nod3SocketAllowedTypes;
  data: Maybe<Nod3SocketData<unknown>>;
  connection: {
    in: Maybe<Nod3>;
    out: Maybe<Nod3>;
  };

  constructor(types: Nod3SocketAllowedTypes, data?: Nod3SocketData<unknown>) {
    this.data = data;
    this.types = types;
    this.connection = { in: null, out: null };
  }
}

export type Nod3Executor = (
  inputs: Nod3Socket[],
  outputs: Nod3Socket[]
) => void;

class Nod3 {
  type: string;
  inputs: Nod3Socket[];
  outputs: Nod3Socket[];
  executor: Maybe<Nod3Executor>;
  constructor(type: string) {
    this.type = type;
    this.inputs = [];
    this.outputs = [];
  }

  private clearBacklogs = () => {
    for (const input of this.inputs) {
      if (input.data) continue;
      if (!input.connection.in) {
        console.log("please set a default value for the input node");
        continue;
      }
      input.connection.in.run();
    }
  };

  public run = () => {
    if (!this.executor) {
      console.log("Node doesn't have an executor");
      return;
    }
    this.clearBacklogs();
    this.executor(this.inputs, this.outputs);
  };
}
