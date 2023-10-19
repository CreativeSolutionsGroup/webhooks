const getColumn = (name: string, row: Row, columnList: ColumnsList) => {
  const columnValue = getRawColumn(name, row, columnList);

  if (columnValue) {
    if (columnValue.displayValue) {
      return columnValue.displayValue;
    } else if (columnValue.value) {
      return columnValue.value;
    } else {
      return "<span style='color:red'>N/A</span>";
    }
  }

  return "";
};

const getRawColumn = (name: string, row: Row, columnList: ColumnsList) => {
  const column = columnList.data.find((v) => v.title === name);
  if (column) {
    return row.cells.find((v) => v.columnId === column.id);
  }
  return undefined;
};

export { getColumn, getRawColumn };
