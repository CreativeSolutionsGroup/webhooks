type Callback = {
  scopeObjectId: number;
  webhookId: number;
  events: Array<CallbackEvent>;
  newWebhookStatus: string;
  nonce: string;
  scope: string;
  timestamp: string;
};

type CallbackEvent = {
  id: number;
  columnId: number;
  rowId: number;
  userId: number;
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
  id: number;
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
  columnId: number;
  value: string;
  displayValue: string;
};

type Row = {
  id: number;
  sheetId: number;
  rowNumber: number;
  siblingId: number;
  version: number;
  expanded: boolean;
  accessLevel: string;
  createdAt: string;
  modifiedAt: string;
  cells: Array<Cell>;
};
