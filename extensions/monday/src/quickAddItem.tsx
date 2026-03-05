import { Form, getPreferenceValues } from "@raycast/api";
import { getBoardAndUser } from "./lib/api";
import { ErrorView } from "./lib/helpers";
import { useCachedPromise } from "@raycast/utils";
// CUSTOM: Use column-aware quick-add form
import QuickAddItemWithColumns from "./custom/commands/quickAddItemWithColumns";

export default function QuickAddItem() {
  const { data: board, error } = useCachedPromise(async () => {
    // CUSTOM: quickAddBoardId moved to global preferences
    const boardId = getPreferenceValues<Preferences>().quickAddBoardId;
    const response = await getBoardAndUser(+boardId);
    if (!response.boards.length) throw "Board not found";
    return response.boards[0];
  }, []);

  if (error) {
    return (
      <ErrorView
        error={`Sorry but we failed accessing the defined board. \n Inner error: ${error}`}
      />
    );
  } else if (board) {
    // CUSTOM: Delegate to column-aware form instead of plain AddItem
    return <QuickAddItemWithColumns board={board} />;
  } else {
    return <Form isLoading={true}></Form>;
  }
}
