// CUSTOM: Renders the appropriate Raycast form field for a given Monday.com column type
import { Form } from "@raycast/api";
import { ColumnConfig } from "../models/columnConfig";
import {
  parseStatusOptions,
  parseDropdownOptions,
} from "../utils/columnValueBuilder";
import { User } from "../../lib/models";
import { LinkedItem } from "../api/boardColumnsApi";

const SUPPORTED_TYPES = new Set([
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

interface ColumnFormFieldProps {
  column: ColumnConfig;
  id: string;
  /** Initial value to pre-fill — must match the field's expected type */
  defaultValue?: string;
  /** Required for multiple-person/people columns */
  teamUsers?: User[];
  /** Required for board_relation columns */
  linkedItems?: LinkedItem[];
}

export function ColumnFormField({
  column,
  id,
  defaultValue,
  teamUsers,
  linkedItems,
}: ColumnFormFieldProps) {
  if (!SUPPORTED_TYPES.has(column.columnType)) {
    return (
      <Form.Description
        key={id}
        title={column.columnTitle}
        text={`Column type "${column.columnType}" is not yet supported in Quick-add.`}
      />
    );
  }

  switch (column.columnType) {
    case "text":
      return (
        <Form.TextField
          id={id}
          title={column.columnTitle}
          defaultValue={defaultValue ?? ""}
          placeholder="Enter text"
        />
      );

    case "long_text":
      return (
        <Form.TextArea
          id={id}
          title={column.columnTitle}
          defaultValue={defaultValue ?? ""}
          placeholder="Enter text"
        />
      );

    case "numbers":
      return (
        <Form.TextField
          id={id}
          title={column.columnTitle}
          defaultValue={defaultValue ?? ""}
          placeholder="0"
        />
      );

    case "color": // older API name
    case "status": {
      // newer API name — both use the same settings_str format and column_values format
      const options = parseStatusOptions(column.settingsStr);
      return (
        <Form.Dropdown
          id={id}
          title={column.columnTitle}
          defaultValue={defaultValue}
        >
          <Form.Dropdown.Item value="" title="— None —" />
          {options.map((opt) => (
            <Form.Dropdown.Item
              key={opt.index}
              value={String(opt.index)}
              title={opt.label}
            />
          ))}
        </Form.Dropdown>
      );
    }

    case "dropdown": {
      const options = parseDropdownOptions(column.settingsStr);
      return (
        <Form.Dropdown
          id={id}
          title={column.columnTitle}
          defaultValue={defaultValue}
        >
          <Form.Dropdown.Item value="" title="— None —" />
          {options.map((opt) => (
            <Form.Dropdown.Item
              key={opt.id}
              value={String(opt.id)}
              title={opt.name}
            />
          ))}
        </Form.Dropdown>
      );
    }

    case "board_relation": {
      const items = linkedItems ?? [];
      return (
        <Form.Dropdown
          id={id}
          title={column.columnTitle}
          defaultValue={defaultValue}
        >
          <Form.Dropdown.Item value="" title="— None —" />
          {items.map((item) => (
            <Form.Dropdown.Item
              key={item.id}
              value={item.id}
              title={item.name}
            />
          ))}
        </Form.Dropdown>
      );
    }

    case "date": {
      const defaultDate = defaultValue ? new Date(defaultValue) : undefined;
      return (
        <Form.DatePicker
          id={id}
          title={column.columnTitle}
          defaultValue={defaultDate}
        />
      );
    }

    case "boolean":
      return (
        <Form.Checkbox
          id={id}
          title={column.columnTitle}
          label="Checked"
          defaultValue={defaultValue === "true"}
        />
      );

    case "email":
      return (
        <Form.TextField
          id={id}
          title={column.columnTitle}
          defaultValue={defaultValue ?? ""}
          placeholder="name@example.com"
        />
      );

    case "phone":
      return (
        <Form.TextField
          id={id}
          title={column.columnTitle}
          defaultValue={defaultValue ?? ""}
          placeholder="+1 555 000 0000 (country defaults to US)"
        />
      );

    case "link":
      return (
        <Form.TextField
          id={id}
          title={column.columnTitle}
          defaultValue={defaultValue ?? ""}
          placeholder="https://"
        />
      );

    case "rating": {
      const ratings = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];
      return (
        <Form.Dropdown
          id={id}
          title={column.columnTitle}
          defaultValue={defaultValue}
        >
          <Form.Dropdown.Item value="" title="— None —" />
          {ratings.map((r) => (
            <Form.Dropdown.Item key={r} value={r} title={r} />
          ))}
        </Form.Dropdown>
      );
    }

    case "people": // Monday.com's actual type string
    case "multiple-person": {
      const users = teamUsers ?? [];
      const defaultIds = defaultValue
        ? defaultValue.split(",").filter(Boolean)
        : [];
      return (
        <Form.TagPicker
          id={id}
          title={column.columnTitle}
          defaultValue={defaultIds}
        >
          {users.map((user) => (
            <Form.TagPicker.Item
              key={user.id}
              value={String(user.id)}
              title={user.name}
            />
          ))}
        </Form.TagPicker>
      );
    }

    default:
      return null;
  }
}
