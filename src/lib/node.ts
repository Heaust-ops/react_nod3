import { nod3EventManager, Nod3EventType } from "./events";
import { getUUID, Maybe } from "./utils";

class Nod3Mem {
  private mem: Nod3<unknown>[];

  constructor() {
    this.mem = [];
  }

  public add = (el: Nod3<unknown>) => {
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

const memory = new Nod3Mem();

export interface Nod3Input {
  id: string;
  type: string;
  allowedTypes: string[];
  value: unknown;
  hook?: string
}

export interface Nod3Output {
  id: string;
  type: string;
  executor: <A, B>(preprocessData: A, inputs: Nod3Inputs) => B;
  value: unknown;
}

export type Nod3Inputs = Record<string, Nod3Input>;
export type Nod3Outputs = Record<string, Nod3Output>;
class Nod3<PreprocessData> {
  objectType: string;
  id: string;

  type: string;

  inputs: Nod3Inputs;
  outputs: Nod3Outputs;

  position: [number, number];

  preprocessData: Maybe<PreprocessData>;
  preprocessor: (inputs: Nod3Inputs) => PreprocessData;

  constructor(
    type: string,
    position: [number, number],
    preprocessor: (inputs: Nod3Inputs) => PreprocessData
  ) {
    this.id = getUUID();
    this.objectType = "nod3";
    this.type = type;

    this.position = position;

    this.inputs = {} as Nod3Inputs;
    this.outputs = {} as Nod3Outputs;

    this.preprocessor = preprocessor;

    nod3EventManager.fire(Nod3EventType.added, {
      id: this.id,
      details: "nod3 added",
    });

    memory.add(this);
  }

  public addInput = <value>(label: string, options: Partial<Nod3Input>) => {
    options.id = `${`${this.id}@${label}`}input`;
    options.type = options.type ?? "basic";
    options.allowedTypes = options.allowedTypes ?? [options.type];
    options.value = options.value as Maybe<value>;
    this.inputs[label] = options as Nod3Input;
    return this;
  };

  public addOutput = (
    label: string,
    options: Partial<Nod3Output> & Pick<Nod3Output, "executor">
  ) => {
    options.id = `${`${this.id}@${label}`}output`;
    options.type = options.type ?? "basic";
    options.value = null;
    this.outputs[label] = options as Nod3Output;
    return this;
  };

  public refreshOutputs = () => {
    this.preprocessData = this.preprocessor(this.inputs);
    for (const label in this.outputs) {
      this.outputs[label].value = this.outputs[label].executor(
        this.preprocessData,
        this.inputs
      );
    }
  };

  public refreshInputs = () => {
    this.inputHookNodes.forEach((nod3) => nod3.refreshOutputs());
    for (const label in this.inputs) {
      const hookNod3 = Nod3.inputHookNode(this.inputs[label]);
      if (hookNod3) {
        const outputLabel = Nod3.extractLabel(
          this.inputs[label].hook as string
        );
       
      }
    }
  };

  public static extractLabel = (id: string) => {
    if (id.includes("input")) return id.split("@")[1].split("input")[0];
    if (id.includes("output")) return id.split("@")[1].split("output")[0];
    console.log("improper id");
    return "improper";
  };

  public get inputHookNodes() {
    const nod3s = new Set();

    for (const label in this.inputs) {
      const hookNod3 = Nod3.inputHookNode(this.inputs[label]);
      if (hookNod3) nod3s.add(hookNod3);
    }

    return Array.from(nod3s) as Nod3<unknown>[];
  }

  public preprocess = (inputs: Nod3Inputs) => {
    this.preprocessData = this.preprocessor(inputs);
  };

  /**
   * remove nod3 from memory
   */
  public dispose = () => {
    memory.remove(this.id);
  };

  public static inputHookNode = (input: Nod3Input) => {
    const { hook } = input;
    if (typeof hook !== "string") return null;
    if (!hook.includes("output")) return null;
    if (!hook.includes("@")) return null;
    const nod3Id = hook.split("@")[0];
    const nod3 = Nod3.getById(nod3Id);
    if (!nod3) return null;

    return nod3;
  };

  /** Static Accessors */
  public static getById = (id: string) => {
    const obj = memory.get(id);
    if (obj?.objectType === "nod3") return obj as Nod3<unknown>;
    return null;
  };

  public static getAll = () => {
    return memory
      .getAll()
      .filter((el) => el.objectType === "nod3") as Nod3<unknown>[];
  };
}
