export type BoardColumn = {
  id: string;
  title: string;
  type: string;
  settings_str: string;
};

export type ColumnConfig = {
  columnId: string;
  columnTitle: string;
  columnType: string;
  settingsStr: string;
  enabled: boolean;
  defaultValue: string;
};

export type QuickAddColumnConfig = {
  boardId: number;
  columns: ColumnConfig[];
  defaultGroupId?: string;
  savedAt: string;
};
