// nfc-pcsc has no published TypeScript types. This is a minimal shape covering
// the subset this project uses (NFC reader/card/error/end events).
declare module "nfc-pcsc" {
  import { EventEmitter } from "node:events";

  export class NFC extends EventEmitter {
    on(event: "reader", listener: (reader: Reader) => void): this;
    on(event: "error", listener: (err: Error) => void): this;
  }

  export class Reader extends EventEmitter {
    reader: { name: string };
    on(event: "card", listener: (card: { uid: string; data?: Buffer }) => void): this;
    on(event: "error", listener: (err: Error) => void): this;
    on(event: "end", listener: () => void): this;
  }
}
