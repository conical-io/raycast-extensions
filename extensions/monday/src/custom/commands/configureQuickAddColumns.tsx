// CUSTOM: Configure which columns and default values appear in Quick-add Item
import {
  Form,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  getPreferenceValues,
  Alert,
  confirmAlert,
} from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import { useColumnConfigEditor } from "../hooks/useColumnConfigEditor";
import {
  saveColumnConfig,
  clearColumnConfig,
} from "../utils/columnConfigStorage";
import { serializeDefaultValue } from "../utils/columnValueBuilder";
import {
  ColumnConfig,
  QuickAddColumnConfig,
  BoardColumn,
} from "../models/columnConfig";
import { ColumnFormField } from "../components/ColumnFormField";
import { ErrorView } from "../../lib/helpers";
import { getLinkedBoardItems, LinkedItem } from "../api/boardColumnsApi";
import { parseLinkedBoardId } from "../utils/columnValueBuilder";
import { getGroups } from "../../lib/api";
import { Group } from "../../lib/models";

const CONFIGURABLE_TYPES = new Set([
  "text",
  "long_text",
  "numbers",
  "color",
  "status",
  "dropdown",
  "board_relation",
  "date",
  "boolean",
  "email",
  "phone",
  "link",
  "rating",
  "people",
  "multiple-person",
]);

// Column types to exclude entirely — handled elsewhere or not user-configurable
const EXCLUDED_TYPES = new Set(["name", "subtasks", "pulse-id"]);

export default function ConfigureQuickAddColumns() {
  const { quickAddBoardId } = getPreferenceValues<Preferences>();
  const boardId = +quickAddBoardId;

  const { isLoading, columns, savedConfig, error } =
    useColumnConfigEditor(boardId);
  const [enabledMap, setEnabledMap] = useState<Record<string, boolean>>({});
  const [linkedItemsMap, setLinkedItemsMap] = useState<
    Record<string, LinkedItem[]>
  >({});
  const [groups, setGroups] = useState<Group[]>([]);

  useEffect(() => {
    getGroups(boardId).then((g) =>
      setGroups(
        g
          .slice()
          .sort((a, b) => parseFloat(a.position) - parseFloat(b.position))
      )
    );
  }, [boardId]);

  // Pre-fetch linked board items for any board_relation columns
  useEffect(() => {
    const boardRelationCols = columns.filter(
      (c) => c.type === "board_relation"
    );
    if (boardRelationCols.length === 0) return;

    Promise.all(
      boardRelationCols.map(async (col) => {
        const linkedBoardId = parseLinkedBoardId(col.settings_str);
        if (!linkedBoardId) return null;
        const items = await getLinkedBoardItems(linkedBoardId);
        return { colId: col.id, items };
      })
    ).then((results) => {
      const map: Record<string, LinkedItem[]> = {};
      for (const r of results) {
        if (r) map[r.colId] = r.items;
      }
      setLinkedItemsMap(map);
    });
  }, [columns.map((c) => c.id).join(",")]);

  useEffect(() => {
    if (savedConfig) {
      const map: Record<string, boolean> = {};
      for (const col of savedConfig.columns) {
        map[col.columnId] = col.enabled;
      }
      setEnabledMap(map);
    }
  }, [savedConfig?.savedAt]);

  function savedDefaultFor(col: BoardColumn): string | undefined {
    return savedConfig?.columns.find((c) => c.columnId === col.id)
      ?.defaultValue;
  }

  async function handleSubmit(values: Record<string, Form.Value>) {
    const configColumns: ColumnConfig[] = columns
      .filter((col) => !EXCLUDED_TYPES.has(col.type))
      .map((col) => {
        const enabled = enabledMap[col.id] ?? false;
        const rawDefault = enabled ? values[`default_${col.id}`] : undefined;
        return {
          columnId: col.id,
          columnTitle: col.title,
          columnType: col.type,
          settingsStr: col.settings_str,
          enabled,
          defaultValue:
            rawDefault !== undefined ? serializeDefaultValue(rawDefault) : "",
        };
      });

    const defaultGroupId = values["defaultGroupId"] as string | undefined;

    const config: QuickAddColumnConfig = {
      boardId,
      columns: configColumns,
      defaultGroupId: defaultGroupId || undefined,
      savedAt: new Date().toISOString(),
    };

    try {
      await saveColumnConfig(config);
      await showToast({
        style: Toast.Style.Success,
        title: "Column defaults saved",
      });
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Failed to save: ${err}`,
      });
    }
  }

  async function handleClear() {
    const confirmed = await confirmAlert({
      title: "Clear column configuration?",
      message: "Quick-add will revert to title-only mode.",
      primaryAction: { title: "Clear", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    try {
      await clearColumnConfig(boardId);
      setEnabledMap({});
      await showToast({
        style: Toast.Style.Success,
        title: "Configuration cleared",
      });
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Failed to clear: ${err}`,
      });
    }
  }

  if (error) {
    return <ErrorView error={`Failed to load board columns.\n${error}`} />;
  }

  const columnFields = columns
    .filter((col) => !EXCLUDED_TYPES.has(col.type))
    .flatMap((col) => {
      const isEnabled = enabledMap[col.id] ?? false;
      const savedDefault = savedDefaultFor(col);

      const fields: React.ReactNode[] = [
        <Form.Separator key={`sep_${col.id}`} />,
        <Form.Checkbox
          key={`enable_${col.id}`}
          id={`enable_${col.id}`}
          title={col.title}
          label="Include in Quick-add"
          value={isEnabled}
          onChange={(checked) =>
            setEnabledMap((prev) => ({ ...prev, [col.id]: checked }))
          }
        />,
      ];

      if (isEnabled) {
        if (CONFIGURABLE_TYPES.has(col.type)) {
          fields.push(
            <ColumnFormField
              key={`default_${col.id}`}
              column={{
                columnId: col.id,
                columnTitle: "Default value",
                columnType: col.type,
                settingsStr: col.settings_str,
                enabled: true,
                defaultValue: savedDefault ?? "",
              }}
              id={`default_${col.id}`}
              defaultValue={savedDefault}
              linkedItems={linkedItemsMap[col.id]}
            />
          );
        } else {
          fields.push(
            <Form.Description
              key={`unsupported_${col.id}`}
              title="Default value"
              text={`Column type "${col.type}" cannot be configured here yet.`}
            />
          );
        }
      }

      return fields;
    });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Configuration"
            icon={Icon.CheckCircle}
            onSubmit={handleSubmit}
          />
          <Action
            title="Clear Configuration"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={handleClear}
          />
        </ActionPanel>
      }
      navigationTitle="Configure Quick-add Columns"
    >
      <Form.Description
        title="Column Defaults"
        text="Choose which columns appear when Quick-adding an item and set their default values. Defaults are pre-filled but can be overridden each time."
      />
      <Form.Dropdown
        id="defaultGroupId"
        title="Default Group"
        defaultValue={savedConfig?.defaultGroupId ?? ""}
      >
        <Form.Dropdown.Item value="" title="— No default —" />
        {groups.map((group) => (
          <Form.Dropdown.Item
            key={group.id}
            value={group.id}
            title={group.title}
            icon={{ source: Icon.Dot, tintColor: group.color }}
          />
        ))}
      </Form.Dropdown>
      <Form.Separator />
      {columnFields}
    </Form>
  );
}
