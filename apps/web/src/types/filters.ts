/**
 * Filter type definitions for bookmark filtering
 *
 * This module defines the types used for advanced filtering in the bookmark view.
 * It supports multiple filter operators and field types for flexible querying.
 */

/**
 * Represents a single filter condition
 */
export interface FilterCondition {
  field: FilterField;
  operator: FilterOperator;
  value: FilterValue;
}

/**
 * Available fields that can be filtered
 */
export type FilterField =
  | "platform"
  | "authorUsername"
  | "savedAt"
  | "createdAt"
  | "categoryIds"
  | "content";

/**
 * Available filter operators
 */
export type FilterOperator =
  | "equals"
  | "notEquals"
  | "contains"
  | "notContains"
  | "in"
  | "notIn"
  | "greaterThan"
  | "lessThan"
  | "between";

/**
 * Possible filter values
 * - string: for text fields
 * - string[]: for multi-select fields (in/notIn operators)
 * - Date: for date fields
 * - { from: Date; to: Date }: for date range (between operator)
 */
export type FilterValue = string | string[] | Date | { from: Date; to: Date };

/**
 * Error class for filter validation failures
 */
export class FilterValidationError extends Error {
  constructor(
    public field: FilterField,
    public operator: FilterOperator,
    public value: FilterValue,
    message: string
  ) {
    super(message);
    this.name = "FilterValidationError";
  }
}
