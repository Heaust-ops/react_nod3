import { nod3EventManager, Nod3EventType } from "./events";
import { getUUID, Maybe } from "./utils";

export type Nod3SocketType = string;

export type Nod3SocketAllowedTypes = Nod3SocketType[];

export interface Nod3SocketLabel {
  in: Maybe<string>;
  out: Maybe<string>;
}

export interface Nod3SocketData<T> {
  type: Nod3SocketType;
  value: T;
}

export type Nod3Executor = (
  inputs: Nod3Socket[],
  outputs: Nod3Socket[]
) => void;

class Nod3AndSocketMem {
  private mem: (Nod3 | Nod3Socket)[];

  constructor() {
    this.mem = [];
  }

  public add = (el: Nod3 | Nod3Socket) => {
    this.mem.push(el);
  };

  public remove = (id: Maybe<string>) => {
    if (!id) return;
    this.mem = this.mem.filter((el) => el.id !== id);
  };

  public get = (id: string) => {
    for (const el of this.mem) {
      if (el.id === id) return el;
    }

    return null;
  };

  public getAll = () => this.mem;
}

const memory = new Nod3AndSocketMem();

class Nod3Socket {
  objectType: string;
  allowedTypes: Nod3SocketAllowedTypes;
  id: string;
  type: string;
  label: Nod3SocketLabel;
  data: Maybe<Nod3SocketData<unknown>>;
  side: {
    out: Maybe<Nod3>;
    in: Maybe<Nod3>;
  };

  constructor(
    type: string,
    allowedTypes: Nod3SocketAllowedTypes,
    label: Nod3SocketLabel,
    data?: Nod3SocketData<unknown>
  ) {
    this.id = getUUID();
    this.type = type;
    this.objectType = "socket";
    this.label = label;
    this.data = data;
    this.allowedTypes = allowedTypes;
    this.side = { in: null, out: null };
    memory.add(this);
  }

  public dispose = () => {
    memory.remove(this.id);
  };

  public connectTo = (inputSocket: Nod3Socket) => {
    if (!this.side.out || !inputSocket.side.in) return;
    if (!inputSocket.allowedTypes.includes(this.type)) return;
    if (this.side.in) this.sever();

    nod3EventManager.fire(Nod3EventType.changed, {
      id: this.id,
      details: "socket connected",
    });

    const nod3 = inputSocket.side.in;
    this.side.in = nod3;
    this.label.in = inputSocket.label.in;

    for (let i = 0; i < nod3.inputs.length; i++) {
      if (nod3.inputs[i].id === inputSocket.id) nod3.inputs[i] = this;
    }

    inputSocket.dispose();
  };

  public sever = () => {
    if (!(this.side.in && this.side.out)) return;

    nod3EventManager.fire(Nod3EventType.changed, {
      id: this.id,
      details: "socket severed",
    });

    const nod3 = this.side.out;
    this.side.out = null;

    for (let i = 0; i < nod3.inputs.length; i++) {
      if (nod3.inputs[i].id === this.id)
        nod3.inputs[i] = new Nod3Socket(
          this.type,
          this.allowedTypes,
          this.label
        );
    }
  };

  public get isConnected() {
    return this.side.in && this.side.out;
  }

  public static getById = (id: string) => {
    const obj = memory.get(id);
    if (obj?.objectType === "socket") return obj as Nod3Socket;
    return null;
  };

  public static getAll = () => {
    return memory
      .getAll()
      .filter((el) => el.objectType === "socket") as Nod3Socket[];
  };
}

class Nod3 {
  objectType: string;
  type: string;
  id: string;
  inputs: Nod3Socket[];
  outputs: Nod3Socket[];
  executor: Maybe<Nod3Executor>;

  constructor(type: string) {
    this.id = getUUID();
    this.objectType = "nod3";
    this.type = type;
    this.inputs = [];
    this.outputs = [];

    nod3EventManager.fire(Nod3EventType.added, {
      id: this.id,
      details: "nod3 added",
    });

    memory.add(this);
  }

  public addSocket = (
    type: Nod3SocketType,
    label: string,
    side: "in" | "out",
    allowedTypes: Nod3SocketAllowedTypes = [type]
  ) => {
    const lbl = {
      in: null,
      out: null,
    } as Nod3SocketLabel;
    lbl[side] = label;
    const socket = new Nod3Socket(type, allowedTypes, lbl);
    socket.side[side] = this;
    this[`${side}puts`].push(socket);
  };

  public dispose = () => {
    memory.remove(this.id);
  };

  private runPrevious = (onlyIfNull = true) => {
    for (const socket of this.inputs) {
      if (onlyIfNull && socket.data) continue;
      if (!socket.side.out) {
        console.log("please set a default value for the input socket");
        continue;
      }
      socket.side.out.run();
    }
  };

  public run = (rerun = false) => {
    if (!this.executor) {
      console.log("Node doesn't have an executor");
      return;
    }
    this.runPrevious(!rerun);
    this.executor(this.inputs, this.outputs);
  };

  public remove = () => {
    nod3EventManager.fire(Nod3EventType.removed, {
      id: this.id,
      details: "nod3 removed",
    });

    for (const socket of [...this.inputs, ...this.outputs]) {
      socket.sever();
    }
    this.dispose();
  };

  public static getById = (id: string) => {
    const obj = memory.get(id);
    if (obj?.objectType === "nod3") return obj as Nod3;
    return null;
  };

  public static getAll = () => {
    return memory.getAll().filter((el) => el.objectType === "nod3") as Nod3[];
  };
}
