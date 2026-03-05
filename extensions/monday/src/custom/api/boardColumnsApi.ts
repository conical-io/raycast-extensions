// CUSTOM: API functions for board columns and column-aware item creation
import { runGraphQLQuery } from "../../lib/api";
import { BoardColumn } from "../models/columnConfig";

export async function getBoardColumns(boardId: number): Promise<BoardColumn[]> {
  const result = await runGraphQLQuery(`
    {
      boards(ids: [${boardId}]) {
        columns {
          id
          title
          type
          settings_str
        }
      }
    }
  `);

  const data = result as Record<string, unknown>;
  const board = (data.boards as any)[0];
  return (board as Record<string, unknown>).columns as BoardColumn[];
}

export type LinkedItem = { id: string; name: string };

export async function getLinkedBoardItems(
  boardId: number
): Promise<LinkedItem[]> {
  const result = await runGraphQLQuery(`
    {
      boards(ids: [${boardId}], limit: 1) {
        items_page(limit: 200) {
          items {
            id
            name
          }
        }
      }
    }
  `);

  const data = result as Record<string, unknown>;
  const board = (data.boards as any)[0];
  return (board as Record<string, unknown>).items_page
    ? ((board as any).items_page.items as LinkedItem[])
    : [];
}

export async function createUpdate(
  itemId: number,
  body: string
): Promise<void> {
  const escapedBody = body.replace(/"/g, '\\"');
  await runGraphQLQuery(`
    mutation {
      create_update(
        item_id: ${itemId},
        body: "${escapedBody}"
      ) {
        id
      }
    }
  `);
}

export async function addItemWithColumns(
  boardId: number,
  groupId: string,
  name: string,
  columnValues: string
): Promise<number> {
  const escapedName = name.replace(/"/g, '\\"');
  const escapedColumnValues = columnValues.replace(/"/g, '\\"');
  const result = await runGraphQLQuery(`
    mutation {
      create_item(
        board_id: ${boardId},
        group_id: "${groupId}",
        item_name: "${escapedName}",
        column_values: "${escapedColumnValues}"
      ) {
        id
      }
    }
  `);
  return result.create_item.id;
}
