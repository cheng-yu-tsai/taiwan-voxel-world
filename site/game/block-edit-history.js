export class BlockEditHistory {
  constructor(limit = 100) {
    if (!Number.isInteger(limit) || limit <= 0) throw new RangeError('History limit must be a positive integer');
    this.limit = limit;
    this.undoStack = [];
    this.redoStack = [];
  }

  record(edit) {
    this.undoStack.push({ ...edit });
    if (this.undoStack.length > this.limit) this.undoStack.shift();
    this.redoStack.length = 0;
  }

  undo() {
    const edit = this.undoStack.pop() ?? null;
    if (edit) this.redoStack.push(edit);
    return edit;
  }

  redo() {
    const edit = this.redoStack.pop() ?? null;
    if (edit) this.undoStack.push(edit);
    return edit;
  }

  clear() {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
  }
}
