import { Maybe } from "./utils";

export enum Nod3EventType {
  added = "@reserved_nod3_event_added",
  removed = "@reserved_nod3_event_removed",
  changed = "@reserved_nod3_event_changed",
}

export interface Nod3EventData<T> {
  id: string;
  details: T;
}

export type Nod3EventHandler = <T>(
  type: Nod3EventType,
  data: Nod3EventData<T>
) => void;

class Nod3EventManager {
  data: Maybe<Nod3EventData<unknown>>;
  handlers: Record<Nod3EventType, Maybe<Nod3EventHandler>[]>;
  handlerRunners: Record<Nod3EventType, () => void>;

  constructor() {
    this.data = null;

    /** This will store all the hooked handlers */
    this.handlers = {} as Record<Nod3EventType, Nod3EventHandler[]>;
    for (const evType of Object.values(Nod3EventType)) {
      this.handlers[evType] = [] as Nod3EventHandler[];
    }

    /** This is so event listeners can be added and removed */
    this.handlerRunners = {} as Record<Nod3EventType, () => void>;
    for (const evType of Object.values(Nod3EventType)) {
      this.handlerRunners[evType] = () => {
        if (!this.data) return;
        for (const handler of this.handlers[evType]) {
          if (handler) handler(evType, this.data);
        }
      };
    }
  }

  public fire = <T>(type: Nod3EventType, data: Nod3EventData<T>) => {
    document.dispatchEvent(new Event(type));
    this.data = data;
  };

  public hookHandler = (
    types: Nod3EventType[] | Nod3EventType,
    handler: Nod3EventHandler
  ) => {
    if (!(types instanceof Array)) types = [types];
    const ids = {} as Record<Nod3EventType, number>;
    for (const evType of types) {
      ids[evType] = this.handlers[evType].length;
      this.handlers[evType].push(handler);
    }
    return ids;
  };

  public unhookHandler = (ids: Record<Nod3EventType, number>) => {
    for (const evType in ids) {
      this.handlers[evType as Nod3EventType][ids[evType as Nod3EventType]] =
        null;
    }
  };

  public addListeners = () => {
    for (const evType of Object.values(Nod3EventType)) {
      document.addEventListener(evType, this.handlerRunners[evType]);
    }
  };

  public removeListeners = () => {
    for (const evType of Object.values(Nod3EventType)) {
      document.removeEventListener(evType, this.handlerRunners[evType]);
    }
  };
}

export const nod3EventManager = new Nod3EventManager();
