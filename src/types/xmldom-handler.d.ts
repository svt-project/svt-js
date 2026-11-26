declare module "@xmldom/xmldom/lib/dom-parser.js" {
  import type { Document, Node } from "@xmldom/xmldom";

  // The pinned parser exposes its SAX handler separately from its public DOM types.
  export class __DOMHandler {
    readonly cdata: boolean;
    readonly doc: Document;
    readonly currentElement: Node | null | undefined;
    characters(chars: string, start: number, length: number): void;
  }
}
