// CUSTOM: Data hook for the Configure Quick-add Columns command
import { useState } from "react";
import { usePromise } from "@raycast/utils";
import { getBoardColumns } from "../api/boardColumnsApi";
import { getColumnConfig } from "../utils/columnConfigStorage";
import { BoardColumn, QuickAddColumnConfig } from "../models/columnConfig";

export function useColumnConfigEditor(boardId: number): {
  isLoading: boolean;
  columns: BoardColumn[];
  savedConfig: QuickAddColumnConfig | undefined;
  error: string | undefined;
} {
  const [savedConfig, setSavedConfig] = useState<
    QuickAddColumnConfig | undefined
  >(undefined);

  const {
    isLoading,
    data: columns,
    error,
  } = usePromise(async () => {
    const [cols, config] = await Promise.all([
      getBoardColumns(boardId),
      getColumnConfig(boardId),
    ]);
    setSavedConfig(config);
    return cols;
  }, []);

  return {
    isLoading,
    columns: columns ?? [],
    savedConfig,
    error: error ? String(error) : undefined,
  };
}
