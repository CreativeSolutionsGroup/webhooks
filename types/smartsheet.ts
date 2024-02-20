type Callback = {
  scopeObjectId: string;
  webhookId: string;
  events: Array<CallbackEvent>;
  newWebhookStatus: string;
  nonce: string;
  scope: string;
  timestamp: string;
};

type CallbackEvent = {
  id: string;
  columnId: string;
  rowId: string;
  userId: string;
  objectType:
    | "attachment"
    | "cell"
    | "column"
    | "comment"
    | "discussion"
    | "row"
    | "sheet";
  changeAgent: string;
  eventType: "created" | "deleted" | "updated";
  timestamp: string;
};

type CellDescriptor = {
  id: string;
  version: number;
  index: number;
  title: string;
  type: string;
  options?: Array<string>;
  validation: boolean;
  width: number;
};

type ColumnsList = {
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
  data: Array<CellDescriptor>;
};

type Cell = {
  columnId: string;
  value: string;
  displayValue: string;
};

type Row = {
  id: string;
  sheetId: string;
  rowNumber: number;
  siblingId: string;
  version: number;
  expanded: boolean;
  accessLevel: string;
  createdAt: string;
  modifiedAt: string;
  cells: Array<Cell>;
};
