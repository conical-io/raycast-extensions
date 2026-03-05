// CUSTOM: Data hook for the Quick-add Item form — loads opted-in columns only
import { usePromise } from "@raycast/utils";
import { getBoardColumns } from "../api/boardColumnsApi";
import { getColumnConfig } from "../utils/columnConfigStorage";
import { ColumnConfig } from "../models/columnConfig";

export function useEnabledColumns(boardId: number): {
  isLoading: boolean;
  enabledColumns: ColumnConfig[];
  defaultGroupId: string | undefined;
  error: string | undefined;
} {
  const { isLoading, data, error } = usePromise(async () => {
    const [liveCols, config] = await Promise.all([
      getBoardColumns(boardId),
      getColumnConfig(boardId),
    ]);

    if (!config) return { enabledColumns: [], defaultGroupId: undefined };

    const liveIds = new Set(liveCols.map((c) => c.id));
    return {
      enabledColumns: config.columns.filter(
        (c) => c.enabled && liveIds.has(c.columnId)
      ),
      defaultGroupId: config.defaultGroupId,
    };
  }, []);

  return {
    isLoading,
    enabledColumns: data?.enabledColumns ?? [],
    defaultGroupId: data?.defaultGroupId,
    error: error ? String(error) : undefined,
  };
}
