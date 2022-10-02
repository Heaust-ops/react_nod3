import { Nod3 } from "./node";
import { Socket } from "./socket";
import { Maybe } from "./utils";

class Nod3Mem {
  private mem: (Nod3<unknown> | Socket)[];

  constructor() {
    this.mem = [];
  }

  public add = (el: Nod3<unknown> | Socket) => {
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

export const memory = new Nod3Mem();
