export const MAIN_PANES = Object.freeze(["EDITOR", "CAPTURE"]);
export const EDITOR_VIEWS = Object.freeze(["FRONT", "BACK", "LEFT", "RIGHT", "TOP", "ISO"]);

export class ViewState {
  constructor() {
    this.main_pane = "EDITOR";
    this.editor_view = "ISO";
  }

  swap() {
    this.main_pane = this.main_pane === "EDITOR" ? "CAPTURE" : "EDITOR";
  }

  setEditorView(name) {
    if (!EDITOR_VIEWS.includes(name)) throw new Error(`unknown editor_view ${name}`);
    this.editor_view = name;
  }

  setMainPane(name) {
    if (!MAIN_PANES.includes(name)) throw new Error(`unknown main_pane ${name}`);
    this.main_pane = name;
  }
}
