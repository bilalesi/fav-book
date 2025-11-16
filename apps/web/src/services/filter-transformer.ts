/**
 * Filter Transformer Service
 *
 * This service transforms ReUI filter conditions into the backend API format.
 * It handles various filter operators and field types, converting them to
 * the appropriate BookmarkFilters structure expected by the API.
 */

import type { BookmarkFilters, Platform } from "@favy/shared";
import type { FilterCondition } from "../types/filters";

/**
 * Extended BookmarkFilters type with additional filter fields
 */
export type ExtendedBookmarkFilters = BookmarkFilters & {
  platforms?: Platform[];
  authorUsernameContains?: string;
  createdAtFrom?: Date;
  createdAtTo?: Date;
  excludeCategoryIds?: string[];
  contentSearch?: string;
};

/**
 * Transforms filter conditions from the UI into API-compatible format
 */
export class BookmarkFilterTransformer {
  /**
   * Transform an array of filter conditions into BookmarkFilters format
   *
   * @param filters - Array of filter conditions from the UI
   * @returns BookmarkFilters object ready for API consumption
   */
  transform(filters: FilterCondition[]): ExtendedBookmarkFilters {
    const apiFilters: ExtendedBookmarkFilters = {};

    for (const filter of filters) {
      switch (filter.field) {
        case "platform":
          this.handlePlatformFilter(filter, apiFilters);
          break;

        case "authorUsername":
          this.handleAuthorUsernameFilter(filter, apiFilters);
          break;

        case "savedAt":
          this.handleDateFilter(filter, apiFilters, "savedAt");
          break;

        case "createdAt":
          this.handleDateFilter(filter, apiFilters, "createdAt");
          break;

        case "categoryIds":
          this.handleCategoryFilter(filter, apiFilters);
          break;

        case "content":
          this.handleContentFilter(filter, apiFilters);
          break;
      }
    }

    return apiFilters;
  }

  /**
   * Handle platform filter transformations
   */
  private handlePlatformFilter(
    filter: FilterCondition,
    apiFilters: ExtendedBookmarkFilters
  ): void {
    if (filter.operator === "equals") {
      apiFilters.platform = filter.value as Platform;
    } else if (filter.operator === "in") {
      apiFilters.platforms = filter.value as Platform[];
    }
  }

  /**
   * Handle author username filter transformations
   */
  private handleAuthorUsernameFilter(
    filter: FilterCondition,
    apiFilters: ExtendedBookmarkFilters
  ): void {
    if (filter.operator === "equals") {
      apiFilters.authorUsername = filter.value as string;
    } else if (filter.operator === "contains") {
      apiFilters.authorUsernameContains = filter.value as string;
    }
  }

  /**
   * Handle date filter transformations for savedAt and createdAt fields
   *
   * @param filter - The filter condition
   * @param apiFilters - The API filters object to populate
   * @param field - The date field being filtered (savedAt or createdAt)
   */
  private handleDateFilter(
    filter: FilterCondition,
    apiFilters: ExtendedBookmarkFilters,
    field: "savedAt" | "createdAt"
  ): void {
    const dateFromKey = field === "savedAt" ? "dateFrom" : "createdAtFrom";
    const dateToKey = field === "savedAt" ? "dateTo" : "createdAtTo";

    switch (filter.operator) {
      case "equals":
        // For equals, set both from and to to the same date
        apiFilters[dateFromKey] = filter.value as Date;
        apiFilters[dateToKey] = filter.value as Date;
        break;

      case "greaterThan":
        // For greater than, only set the from date
        apiFilters[dateFromKey] = filter.value as Date;
        break;

      case "lessThan":
        // For less than, only set the to date
        apiFilters[dateToKey] = filter.value as Date;
        break;

      case "between":
        // For between, set both from and to dates
        const range = filter.value as { from: Date; to: Date };
        apiFilters[dateFromKey] = range.from;
        apiFilters[dateToKey] = range.to;
        break;
    }
  }

  /**
   * Handle category filter transformations
   */
  private handleCategoryFilter(
    filter: FilterCondition,
    apiFilters: ExtendedBookmarkFilters
  ): void {
    if (filter.operator === "in") {
      apiFilters.categoryIds = filter.value as string[];
    } else if (filter.operator === "notIn") {
      apiFilters.excludeCategoryIds = filter.value as string[];
    }
  }

  /**
   * Handle content search filter transformations
   */
  private handleContentFilter(
    filter: FilterCondition,
    apiFilters: ExtendedBookmarkFilters
  ): void {
    if (filter.operator === "contains") {
      apiFilters.contentSearch = filter.value as string;
    }
  }
}
