import { nod3EventManager, Nod3EventType } from "./events";
import { memory } from "./memory";
import { Nod3 } from "./node";

export type InSockets = Record<string, InSocket>;
export type OutSockets = Record<string, OutSocket>;

export interface SocketOptions {
  id: string;
  type?: string;
  value: unknown;
}

export class Socket {
  /** Must be of the form "<nod3Id>@<label>@<socketType>" */
  id: string;
  type: string;
  value: unknown;
  objectType = "socket";

  constructor(args: SocketOptions) {
    this.id = args.id;
    this.type = args.type ?? "basic";

    nod3EventManager.fire(Nod3EventType.added, {
      id: this.id,
      details: { msg: "socket added" },
    });

    memory.add(this);
  }

  public dispose() {
    memory.remove(this.id);
  }

  /**
   * Getters
   */

  public get nod3() {
    const nod3 = memory
      .getAll()
      .filter((el) => el.id === this.nod3Id)[0] as Nod3<unknown>;
    if (!nod3) console.log("stale reference to deleted nod3");
    return nod3;
  }

  public get nod3Id() {
    return Socket.getNod3Id(this.id);
  }

  public get label() {
    return Socket.getLabelById(this.id);
  }

  public get socketType() {
    return Socket.getSocketTypeById(this.id);
  }

  public get isInput() {
    return this.socketType === "input";
  }

  public get isOutput() {
    return this.socketType === "output";
  }

  /**
   * Static ID Extractors
   */

  public static getNod3Id(id: string) {
    return id.split("@")[0];
  }

  public static getLabelById(id: string) {
    return id.split("@")[1];
  }

  public static getSocketTypeById(id: string) {
    return id.split("@")[2];
  }

  /**
   * Static Memory Accessors
   */

  public static getById = (id: string) => {
    const obj = memory.get(id);
    if (obj?.objectType === "socket") return obj as Socket;
    return null;
  };

  public static getByNod3Id = (id: string) => {
    return memory
      .getAll()
      .filter(
        (el) => el.objectType === "socket" && (el as Socket).nod3Id === id
      ) as Socket[];
  };

  public static getAll = () => {
    return memory
      .getAll()
      .filter((el) => el.objectType === "socket") as Socket[];
  };
}

export interface InSocketOptions extends SocketOptions {
  allowedTypes?: string[];
  accept1?: boolean;
}

export class InSocket extends Socket {
  allowedTypes: string[];
  hooks: string[] = [];
  accept1: boolean;

  constructor(args: InSocketOptions) {
    super(args);
    this.allowedTypes = args.allowedTypes ?? [this.type];
    this.accept1 = typeof args.accept1 === "boolean" ? args.accept1 : false;
  }

  public setValue = (value: unknown) => {
    nod3EventManager.fire(Nod3EventType.changed, {
      id: this.id,
      details: {
        msg: "socket changed",
        id: this.nod3.id,
      },
    });

    this.value = [value];
  };

  public clearHooks() {
    this.hooks = [];
  }

  public hook = (outSocket: OutSocket | string) => {
    const id = (outSocket as OutSocket).id ?? outSocket;
    const exists = this.hooks.includes(id);
    if (exists) return;
    if (typeof outSocket === "string" && !Socket.getById(outSocket)) return;
    this.accept1 ? (this.hooks = [id]) : this.hooks.push(id);
  };

  public unhook = (outSocket: OutSocket | string) => {
    const id = (outSocket as OutSocket).id ?? outSocket;
    this.hooks = this.hooks.filter((el) => el !== id);
  };

  public refresh() {
    this.value = [];
    for (const outSock of this.hookedOutputs) {
      (this.value as unknown[]).push(outSock.value);
    }
  }

  public get isHooked() {
    return !!this.hooks.length;
  }

  public get hookedOutputs() {
    const socks = [];

    for (const id of this.hooks) {
      const sock = Socket.getById(id);
      if (sock) socks.push(sock);
    }

    return socks;
  }

  public get hookedNod3s() {
    const nod3s = [];

    for (const id of this.hooks) {
      const nod3 = Nod3.getById(Socket.getNod3Id(id));
      if (nod3) nod3s.push(nod3);
    }

    return nod3s;
  }
}

export interface OutSocketOptions extends SocketOptions {
  calculator: <A, B>(preprocessData: A, inputs: InSockets) => B;
}

export class OutSocket extends Socket {
  calculator: <A, B>(preprocessData: A, inputs: InSockets) => B;
  constructor(args: OutSocketOptions) {
    super(args);
    this.calculator = args.calculator;
  }

  public refresh() {
    this.value = this.calculator(this.nod3.preprocessData, this.nod3.inputs);
  }
}
