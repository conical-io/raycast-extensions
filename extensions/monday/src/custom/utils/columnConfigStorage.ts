// CUSTOM: LocalStorage helpers for Quick-add column configuration
import { LocalStorage } from "@raycast/api";
import { QuickAddColumnConfig } from "../models/columnConfig";

function storageKey(boardId: number): string {
  return `quickAddColumnConfig_${boardId}`;
}

export async function getColumnConfig(
  boardId: number
): Promise<QuickAddColumnConfig | undefined> {
  const raw = await LocalStorage.getItem<string>(storageKey(boardId));
  if (raw) {
    return JSON.parse(raw) as QuickAddColumnConfig;
  }
  return undefined;
}

export async function saveColumnConfig(
  config: QuickAddColumnConfig
): Promise<void> {
  await LocalStorage.setItem(
    storageKey(config.boardId),
    JSON.stringify(config)
  );
}

export async function clearColumnConfig(boardId: number): Promise<void> {
  await LocalStorage.removeItem(storageKey(boardId));
}
