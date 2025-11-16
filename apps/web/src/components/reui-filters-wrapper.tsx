/**
 * ReUI Filters Wrapper Component
 *
 * This component provides an advanced filtering interface for bookmarks.
 * It integrates with the Zustand store for state management and supports
 * multiple filter conditions with various operators.
 */

import { useMemo, useCallback } from "react";
import {
  Filters,
  type Filter,
  type FilterFieldConfig,
} from "@/components/ui/filters";
import { useCategoriesList } from "@/hooks/use-categories";
import { useBookmarkViewStore } from "@/stores/bookmark-view-store";
import { filterFieldConfig } from "@/config/filter-fields";
import type {
  FilterCondition,
  FilterField,
  FilterOperator,
} from "@/types/filters";
import { DictPlatform } from "@favy/shared";

/**
 * Props for the ReUIFiltersWrapper component
 */
interface ReUIFiltersWrapperProps {
  className?: string;
}

/**
 * Map our FilterCondition to ReUI Filter format
 */
function mapToReuiFilter(
  condition: FilterCondition,
  index: number
): Filter<string> {
  let values: string[] = [];

  // Convert FilterValue to string array for ReUI
  if (Array.isArray(condition.value)) {
    values = condition.value;
  } else if (condition.value instanceof Date) {
    // Validate date before converting
    if (!isNaN(condition.value.getTime())) {
      values = [condition.value.toISOString().split("T")[0]];
    } else {
      values = [];
    }
  } else if (typeof condition.value === "object" && "from" in condition.value) {
    // Date range - validate both dates
    const fromValid =
      condition.value.from instanceof Date &&
      !isNaN(condition.value.from.getTime());
    const toValid =
      condition.value.to instanceof Date &&
      !isNaN(condition.value.to.getTime());

    if (fromValid && toValid) {
      values = [
        condition.value.from.toISOString().split("T")[0],
        condition.value.to.toISOString().split("T")[0],
      ];
    } else {
      values = [];
    }
  } else {
    values = [String(condition.value)];
  }

  return {
    id: `filter-${index}`,
    field: condition.field,
    operator: mapOperatorToReui(condition.operator),
    values,
  };
}

/**
 * Map our operator format to ReUI operator format
 */
function mapOperatorToReui(operator: string): string {
  const operatorMap: Record<string, string> = {
    equals: "is",
    notEquals: "is_not",
    contains: "contains",
    notContains: "not_contains",
    in: "is_any_of",
    notIn: "is_not_any_of",
    greaterThan: "after",
    lessThan: "before",
    between: "between",
  };

  return operatorMap[operator] || operator;
}

/**
 * Map ReUI operator back to our format
 */
function mapOperatorFromReui(operator: string): string {
  const operatorMap: Record<string, string> = {
    is: "equals",
    is_not: "notEquals",
    contains: "contains",
    not_contains: "notContains",
    is_any_of: "in",
    is_not_any_of: "notIn",
    after: "greaterThan",
    before: "lessThan",
    between: "between",
  };

  return operatorMap[operator] || operator;
}

/**
 * Map ReUI Filter back to our FilterCondition format
 */
function mapFromReuiFilter(
  filter: Filter<string>,
  fieldConfig: typeof filterFieldConfig
): FilterCondition {
  const field = filter.field as FilterField;
  const config = fieldConfig[field];
  const operator = mapOperatorFromReui(filter.operator) as FilterOperator;

  let value: FilterCondition["value"];

  // Convert string array back to appropriate type
  if (operator === "between" && config.type === "date") {
    value = {
      from: new Date(filter.values[0] || ""),
      to: new Date(filter.values[1] || ""),
    };
  } else if (config.type === "date") {
    value = new Date(filter.values[0] || "");
  } else if (operator === "in" || operator === "notIn") {
    value = filter.values;
  } else {
    value = filter.values[0] || "";
  }

  return {
    field,
    operator,
    value,
  };
}

/**
 * ReUI Filters Wrapper Component
 *
 * Provides a comprehensive filtering interface with support for:
 * - Multiple filter conditions
 * - Various operators per field type
 * - Dynamic category loading
 * - URL synchronization via Zustand store
 */
export function ReUIFiltersWrapper({ className }: ReUIFiltersWrapperProps) {
  const { filters, setFilters } = useBookmarkViewStore();
  const { data: categoriesData } = useCategoriesList();
  const categories = categoriesData || [];

  // Convert our filters to ReUI format
  const reuiFilters = useMemo(() => filters.map(mapToReuiFilter), [filters]);

  // Build field configuration for ReUI
  const reuiFields = useMemo<FilterFieldConfig<string>[]>(() => {
    const fields: FilterFieldConfig<string>[] = [];

    // Platform field
    fields.push({
      key: "platform",
      label: "Platform",
      type: "select",
      options: [
        { value: DictPlatform.TWITTER, label: "Twitter" },
        { value: DictPlatform.LINKEDIN, label: "LinkedIn" },
        { value: DictPlatform.GENERIC_URL, label: "URL" },
      ],
    });

    // Author username field
    fields.push({
      key: "authorUsername",
      label: "Author",
      type: "text",
      placeholder: "@username",
    });

    // Saved date field
    fields.push({
      key: "savedAt",
      label: "Saved Date",
      type: "date",
    });

    // Created date field
    fields.push({
      key: "createdAt",
      label: "Post Date",
      type: "date",
    });

    // Categories field (dynamic options from API)
    if (categories.length > 0) {
      fields.push({
        key: "categoryIds",
        label: "Categories",
        type: "multiselect",
        options: categories.map((cat) => ({
          value: cat.id,
          label: cat.name,
        })),
      });
    }

    // Content search field
    fields.push({
      key: "content",
      label: "Content",
      type: "text",
      placeholder: "Search in content...",
    });

    return fields;
  }, [categories]);

  // Handle filter changes from ReUI
  const handleFiltersChange = useCallback(
    (newReuiFilters: Filter<string>[]) => {
      const newFilters = newReuiFilters.map((f) =>
        mapFromReuiFilter(f, filterFieldConfig)
      );
      setFilters(newFilters);
    },
    [setFilters]
  );

  return (
    <div className={className}>
      <Filters<string>
        filters={reuiFilters}
        fields={reuiFields}
        onChange={handleFiltersChange}
        variant="outline"
        size="md"
        showAddButton={true}
        allowMultiple={true}
      />
    </div>
  );
}
