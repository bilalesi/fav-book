/**
 * Filter field configuration for bookmark filtering
 *
 * This module defines the configuration for each filterable field including:
 * - Available operators
 * - Input types
 * - Options for select/multiselect fields
 * - Labels and placeholders
 */

import type { FilterField, FilterOperator } from "../types/filters";
import { DictPlatform } from "@favy/shared";

/**
 * Input type for filter fields
 */
export type FilterInputType =
  | "text"
  | "select"
  | "multiselect"
  | "date"
  | "daterange";

/**
 * Option for select/multiselect fields
 */
export interface FilterOption {
  label: string;
  value: string;
}

/**
 * Configuration for a single filter field
 */
export interface FilterFieldConfig {
  label: string;
  type: FilterInputType;
  operators: FilterOperator[];
  placeholder?: string;
  options?: FilterOption[];
  description?: string;
}

/**
 * Complete filter field configuration object
 * Maps each FilterField to its configuration
 */
export const filterFieldConfig: Record<FilterField, FilterFieldConfig> = {
  platform: {
    label: "Platform",
    type: "select",
    operators: ["equals", "in"],
    description: "Filter by social media platform",
    options: [
      { label: "Twitter", value: DictPlatform.TWITTER },
      { label: "LinkedIn", value: DictPlatform.LINKEDIN },
      { label: "URL", value: DictPlatform.GENERIC_URL },
    ],
  },

  authorUsername: {
    label: "Author",
    type: "text",
    operators: ["equals", "contains"],
    placeholder: "@username",
    description: "Filter by author username",
  },

  savedAt: {
    label: "Saved Date",
    type: "date",
    operators: ["equals", "greaterThan", "lessThan", "between"],
    description: "Filter by when the bookmark was saved",
  },

  createdAt: {
    label: "Post Date",
    type: "date",
    operators: ["equals", "greaterThan", "lessThan", "between"],
    description: "Filter by when the post was originally created",
  },

  categoryIds: {
    label: "Categories",
    type: "multiselect",
    operators: ["in", "notIn"],
    description: "Filter by bookmark categories",
    options: [], // Will be populated dynamically from API
  },

  content: {
    label: "Content",
    type: "text",
    operators: ["contains", "notContains"],
    placeholder: "Search in content...",
    description: "Full-text search in bookmark content",
  },
};

/**
 * Get configuration for a specific filter field
 */
export function getFilterFieldConfig(field: FilterField): FilterFieldConfig {
  return filterFieldConfig[field];
}

/**
 * Get all available filter fields
 */
export function getAvailableFilterFields(): FilterField[] {
  return Object.keys(filterFieldConfig) as FilterField[];
}

/**
 * Get available operators for a specific field
 */
export function getAvailableOperators(field: FilterField): FilterOperator[] {
  return filterFieldConfig[field].operators;
}

/**
 * Check if a field supports a specific operator
 */
export function isOperatorSupported(
  field: FilterField,
  operator: FilterOperator
): boolean {
  return filterFieldConfig[field].operators.includes(operator);
}

/**
 * Get human-readable label for an operator
 */
export function getOperatorLabel(operator: FilterOperator): string {
  const operatorLabels: Record<FilterOperator, string> = {
    equals: "equals",
    notEquals: "does not equal",
    contains: "contains",
    notContains: "does not contain",
    in: "is one of",
    notIn: "is not one of",
    greaterThan: "is after",
    lessThan: "is before",
    between: "is between",
  };

  return operatorLabels[operator];
}

/**
 * Get human-readable label for a filter field
 */
export function getFieldLabel(field: FilterField): string {
  return filterFieldConfig[field].label;
}
