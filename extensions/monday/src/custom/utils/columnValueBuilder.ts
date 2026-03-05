// CUSTOM: Serializes form values to Monday.com column_values JSON format
import { Form } from "@raycast/api";
import { ColumnConfig } from "../models/columnConfig";

export type StatusOption = { index: number; label: string; color: string };
export type DropdownOption = { id: number; name: string };

export function parseStatusOptions(settingsStr: string): StatusOption[] {
  try {
    const settings = JSON.parse(settingsStr);
    const labels: Record<string, string> = settings.labels ?? {};
    const colors: Record<string, { color: string }> =
      settings.labels_colors ?? {};
    return Object.entries(labels)
      .filter(([, label]) => label !== "") // Monday uses "" for blank/empty slots
      .map(([index, label]) => ({
        index: parseInt(index, 10),
        label,
        color: colors[index]?.color ?? "#c4c4c4",
      }));
  } catch {
    return [];
  }
}

export function parseLinkedBoardId(settingsStr: string): number | undefined {
  try {
    const settings = JSON.parse(settingsStr);
    const ids: number[] = settings.boardIds ?? [];
    return ids[0];
  } catch {
    return undefined;
  }
}

export function parseDropdownOptions(settingsStr: string): DropdownOption[] {
  try {
    const settings = JSON.parse(settingsStr);
    const labels: Array<{ id: number; name: string }> =
      settings.settings?.labels ?? [];
    return labels.map((l) => ({ id: l.id, name: l.name }));
  } catch {
    return [];
  }
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Converts form field values to a Monday.com column_values JSON string.
 * enabledColumns: the opted-in columns from saved config
 * formValues: raw values from onSubmit — keyed by column ID
 */
export function buildColumnValues(
  enabledColumns: ColumnConfig[],
  formValues: Record<string, Form.Value>
): string {
  const result: Record<string, unknown> = {};

  for (const col of enabledColumns) {
    const raw = formValues[col.columnId];
    if (raw === null || raw === undefined || raw === "") continue;
    if (Array.isArray(raw) && raw.length === 0) continue;

    switch (col.columnType) {
      case "text":
        result[col.columnId] = raw as string;
        break;

      case "long_text":
        result[col.columnId] = { text: raw as string };
        break;

      case "numbers":
        result[col.columnId] = raw as string;
        break;

      case "color": // status column (older API name)
      case "status": // status column (newer API name)
        result[col.columnId] = { index: parseInt(raw as string, 10) };
        break;

      case "dropdown":
        result[col.columnId] = { ids: [parseInt(raw as string, 10)] };
        break;

      case "date": {
        const dateVal = raw instanceof Date ? raw : new Date(raw as string);
        result[col.columnId] = { date: formatDate(dateVal) };
        break;
      }

      case "boolean":
        result[col.columnId] = {
          checked: raw === true || raw === "true" ? "true" : "false",
        };
        break;

      case "email":
        result[col.columnId] = { email: raw as string, text: raw as string };
        break;

      case "phone":
        result[col.columnId] = { phone: raw as string, countryShortName: "US" };
        break;

      case "link":
        result[col.columnId] = { url: raw as string, text: raw as string };
        break;

      case "rating":
        result[col.columnId] = { rating: parseInt(raw as string, 10) };
        break;

      case "board_relation":
        result[col.columnId] = { item_ids: [parseInt(raw as string, 10)] };
        break;

      case "people": // people column (Monday.com's actual type string)
      case "multiple-person": {
        const ids = Array.isArray(raw)
          ? (raw as string[])
          : (raw as string).split(",").filter(Boolean);
        if (ids.length > 0) {
          result[col.columnId] = {
            personsAndTeams: ids.map((id) => ({
              id: parseInt(id.trim(), 10),
              kind: "person",
            })),
          };
        }
        break;
      }
    }
  }

  return JSON.stringify(result);
}

/**
 * Serializes a single form value to a string for storage as a default.
 * Used by the configure command when saving defaults to LocalStorage.
 */
export function serializeDefaultValue(value: Form.Value): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return formatDate(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (Array.isArray(value)) return value.join(",");
  return String(value);
}
