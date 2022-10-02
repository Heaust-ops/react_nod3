import { nod3EventManager, Nod3EventType } from "./events";
import { memory } from "./memory";
import {
  InSocket,
  InSocketOptions,
  InSockets,
  OutSocket,
  OutSocketOptions,
  OutSockets,
} from "./socket";
import { Maybe, getUUID } from "./utils";

export class Nod3<PreprocessData> {
  objectType: string;
  id: string;

  type: string;

  position: [number, number];

  inputs: InSockets = {};
  outputs: OutSockets = {};

  preprocessData: Maybe<PreprocessData>;
  preprocessor: (inputs: InSockets) => PreprocessData;

  constructor(
    type: string,
    position: [number, number],
    preprocessor: (inputs: InSockets) => PreprocessData
  ) {
    this.id = getUUID();
    this.objectType = "nod3";
    this.type = type;

    this.position = position;

    this.preprocessor = preprocessor;

    nod3EventManager.fire(Nod3EventType.added, {
      id: this.id,
      details: { msg: "nod3 added" },
    });

    memory.add(this);
  }

  public preprocess() {
    this.preprocessData = this.preprocessor(this.inputs);
    return this;
  }

  public addInput(label: string, opts: Omit<InSocketOptions, "id">) {
    const sock = new InSocket({ ...opts, id: `${this.id}@${label}@input` });
    this.inputs[label] = sock;
    return this;
  }

  public addOutput(label: string, opts: Omit<OutSocketOptions, "id">) {
    const sock = new OutSocket({ ...opts, id: `${this.id}@${label}@output` });
    this.outputs[label] = sock;
    return this;
  }

  public refresh() {
    Object.values(this.inputs).forEach((input) => input.refresh());
    this.preprocess();
    Object.values(this.outputs).forEach((output) => output.refresh());

    return this;
  }

  public refreshDepth(depth: number) {
    const levels = this.getDepth(depth).reverse();
    for (const level of levels) {
      for (const nod3 of level) {
        nod3.refresh();
      }
    }

    return this;
  }

  public getDepth(depth: number) {
    const nod3sLevels = [[this]] as Nod3<unknown>[][];

    for (let i = 0; i < depth; i++) {
      const currentLevel = [] as Nod3<unknown>[];

      for (const nod3 of nod3sLevels[i]) {
        for (const input of Object.values(nod3.inputs)) {
          /**
           * For every input of every nod3
           */
          const accumulatedNod3Ids = [
            ...currentLevel,
            ...nod3sLevels.reduce((a, b) => [...a, ...b]),
          ].map((el) => el.id);

          const uniqueNod3s = input.hookedNod3s.filter((node) =>
            accumulatedNod3Ids.includes(node.id)
          );

          /** Get so far unrecorded hooked nodes */
          currentLevel.push(...uniqueNod3s);
        }
      }

      if (currentLevel.length === 0) break;
      nod3sLevels.push();
    }

    return nod3sLevels;
  }

  /**
   * remove nod3 from memory
   */
  public dispose = () => {
    memory.remove(this.id);
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
