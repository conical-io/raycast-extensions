// CUSTOM: Enhanced Quick-add Item form with configurable column defaults
import {
  Form,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  useNavigation,
  Clipboard,
  showHUD,
} from "@raycast/api";
import { useState, useEffect, useRef } from "react";
import { usePromise, FormValidation, useForm } from "@raycast/utils";
import { Board, Group, User } from "../../lib/models";
import { getGroups, getTeam } from "../../lib/api";
import {
  addItemWithColumns,
  createUpdate,
  getLinkedBoardItems,
  LinkedItem,
} from "../api/boardColumnsApi";
import { addItem } from "../../lib/api";
import { getCachedUser } from "../../lib/persistence";
import { ErrorView } from "../../lib/helpers";
import { useEnabledColumns } from "../hooks/useEnabledColumns";
import { ColumnFormField } from "../components/ColumnFormField";
import {
  buildColumnValues,
  parseLinkedBoardId,
} from "../utils/columnValueBuilder";
import ConfigureQuickAddColumns from "./configureQuickAddColumns";

type FormValues = {
  name: string;
  group: string;
  update: string;
  [key: string]: string;
};

export default function QuickAddItemWithColumns({ board }: { board: Board }) {
  const { pop, push } = useNavigation();

  const [state, setState] = useState<{
    isLoading: boolean;
    groups: Group[];
    error?: string;
  }>({ isLoading: false, groups: [] });

  const { enabledColumns, defaultGroupId } = useEnabledColumns(board.id);

  const hasPeopleColumn = enabledColumns.some(
    (c) => c.columnType === "multiple-person" || c.columnType === "people"
  );

  const [teamUsers, setTeamUsers] = useState<User[]>([]);
  const [linkedItemsMap, setLinkedItemsMap] = useState<
    Record<string, LinkedItem[]>
  >({});

  // Fetch linked board items for any board_relation columns
  useEffect(() => {
    const boardRelationCols = enabledColumns.filter(
      (c) => c.columnType === "board_relation"
    );
    if (boardRelationCols.length === 0) return;

    Promise.all(
      boardRelationCols.map(async (col) => {
        const linkedBoardId = parseLinkedBoardId(col.settingsStr);
        if (!linkedBoardId) return null;
        const items = await getLinkedBoardItems(linkedBoardId);
        return { colId: col.columnId, items };
      })
    ).then((results) => {
      const map: Record<string, LinkedItem[]> = {};
      for (const r of results) {
        if (r) map[r.colId] = r.items;
      }
      setLinkedItemsMap(map);
    });
  }, [enabledColumns.map((c) => c.columnId).join(",")]);

  usePromise(async () => await getGroups(board.id), [], {
    onWillExecute() {
      setState((prev) => ({ ...prev, isLoading: true }));
    },
    onData(groups) {
      setState((prev) => ({ ...prev, groups, isLoading: false }));
    },
    onError(err) {
      setState((prev) => ({ ...prev, error: String(err), isLoading: false }));
    },
  });

  // Only fetch team when there are people columns
  usePromise(
    async (needsPeople: boolean) => (needsPeople ? getTeam() : ([] as User[])),
    [hasPeopleColumn] as [boolean],
    {
      onData(users) {
        setTeamUsers(users);
      },
    }
  );

  const sortedGroups = state.groups
    .slice()
    .sort((g1, g2) =>
      parseFloat(g1.position) < parseFloat(g2.position) ? -1 : 1
    );

  const { itemProps, handleSubmit, reset } = useForm<FormValues>({
    onSubmit(values) {
      storeItem(board.id, values);
    },
    validation: {
      name: FormValidation.Required,
      group: FormValidation.Required,
    },
  });

  // Pre-select the configured default group once both groups and config have loaded
  const defaultGroupApplied = useRef(false);
  useEffect(() => {
    if (defaultGroupApplied.current) return;
    if (!defaultGroupId || state.groups.length === 0) return;
    const exists = state.groups.some((g) => g.id === defaultGroupId);
    if (exists) {
      reset({ group: defaultGroupId });
      defaultGroupApplied.current = true;
    }
  }, [defaultGroupId, state.groups.length]);

  if (state.error) {
    return <ErrorView error={state.error} />;
  }

  return (
    <Form
      isLoading={state.isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Add Item"
            icon={Icon.Plus}
            onSubmit={handleSubmit}
          />
          <Action.Push
            title="Configure Column Defaults"
            icon={Icon.Gear}
            target={<ConfigureQuickAddColumns />}
          />
        </ActionPanel>
      }
      navigationTitle={`Add a new item to ${board.name}`}
    >
      <Form.Description
        title="Add a new item"
        text={`You can use this form to add a new item directly to a specific group in "${board.name}"`}
      />

      <Form.TextField
        {...itemProps.name}
        title="Item name"
        placeholder="New item's name"
      />

      <Form.Dropdown {...itemProps.group} title="Group">
        {sortedGroups.map((group) => (
          <Form.Dropdown.Item
            value={group.id}
            key={group.id}
            title={group.title}
            icon={{ source: Icon.Dot, tintColor: group.color }}
          />
        ))}
      </Form.Dropdown>

      {enabledColumns.length > 0 && (
        <>
          <Form.Separator />
          {enabledColumns.map((col) => (
            <ColumnFormField
              key={col.columnId}
              column={col}
              id={col.columnId}
              defaultValue={col.defaultValue || undefined}
              teamUsers={teamUsers}
              linkedItems={linkedItemsMap[col.columnId]}
            />
          ))}
        </>
      )}

      <Form.Separator />
      <Form.TextArea id="update" title="Update / Note" placeholder="Optional note to add to the item after creation" />
    </Form>
  );

  async function storeItem(
    boardId: number,
    formValues: FormValues
  ): Promise<void> {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Adding new item",
    });

    try {
      setState((prev) => ({ ...prev, isLoading: true }));

      const { name, group: groupId, update: updateText, ...rest } = formValues;
      let itemId: number;

      if (enabledColumns.length > 0) {
        let columnValues = "{}";
        try {
          columnValues = buildColumnValues(
            enabledColumns,
            rest as Record<string, Form.Value>
          );
        } catch (err) {
          console.error(
            "Failed to build column values, submitting without them:",
            err
          );
        }
        itemId = await addItemWithColumns(boardId, groupId, name, columnValues);
      } else {
        itemId = await addItem(boardId, groupId, name);
      }

      if (updateText && updateText.trim()) {
        await createUpdate(itemId, updateText.trim());
      }

      const itemLink = await generateItemLink(boardId, itemId);
      if (itemLink) {
        await Clipboard.copy(itemLink);
      }

      setState((prev) => ({ ...prev, isLoading: false }));
      toast.style = Toast.Style.Success;
      toast.title = `Successfully added ${name} to ${board.name}`;
      showHUD("🔗 Copied item link to clipboard");
      pop();
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = `Could not add new item due to ${err}`;
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }

  async function generateItemLink(
    boardId: number,
    itemId: number
  ): Promise<string | undefined> {
    const cachedUser = await getCachedUser();
    if (cachedUser) {
      return `https://${cachedUser.account.slug}.monday.com/boards/${boardId}/pulses/${itemId}`;
    }
  }
}
