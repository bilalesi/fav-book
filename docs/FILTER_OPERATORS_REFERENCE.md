# Filter Operators Quick Reference

This document provides a quick reference for all available filter operators in the bookmark filtering system.

## Operator Overview

| Operator     | Symbol      | Description                           | Supported Fields                             | Example                                     |
| ------------ | ----------- | ------------------------------------- | -------------------------------------------- | ------------------------------------------- |
| equals       | `eq`        | Exact match                           | platform, authorUsername, savedAt, createdAt | `platform equals TWITTER`                   |
| not equals   | `neq`       | Does not match                        | platform, authorUsername                     | `platform not equals TWITTER`               |
| contains     | `contains`  | Partial text match (case-insensitive) | authorUsername, content                      | `author contains "john"`                    |
| not contains | `ncontains` | Does not contain text                 | content                                      | `content not contains "sponsored"`          |
| in           | `in`        | Matches any value in array            | platform, categoryIds                        | `platform in [TWITTER, LINKEDIN]`           |
| not in       | `nin`       | Does not match any value in array     | categoryIds                                  | `categories not in [Personal]`              |
| greater than | `gt`        | After date or larger value            | savedAt, createdAt                           | `savedAt greater than 2024-01-01`           |
| less than    | `lt`        | Before date or smaller value          | savedAt, createdAt                           | `savedAt less than 2024-12-31`              |
| between      | `between`   | Within range (inclusive)              | savedAt, createdAt                           | `savedAt between 2024-01-01 and 2024-12-31` |

## Field-Specific Operators

### Platform Field

**Available Operators:** `equals`, `in`

**Values:**

- `TWITTER` - X (Twitter) posts
- `LINKEDIN` - LinkedIn posts
- `GENERIC_URL` - Web page bookmarks

**Examples:**

```
platform equals TWITTER
platform in [TWITTER, LINKEDIN]
```

### Author Username Field

**Available Operators:** `equals`, `contains`

**Values:** Text string (username or name)

**Examples:**

```
authorUsername equals @elonmusk
authorUsername contains john
```

### Date Fields (savedAt, createdAt)

**Available Operators:** `equals`, `greaterThan`, `lessThan`, `between`

**Values:** Date in YYYY-MM-DD format

**Examples:**

```
savedAt equals 2024-11-15
savedAt greaterThan 2024-01-01
savedAt lessThan 2024-12-31
savedAt between 2024-01-01 and 2024-12-31
createdAt greaterThan 2024-06-01
```

### Category IDs Field

**Available Operators:** `in`, `notIn`

**Values:** Array of category IDs

**Examples:**

```
categoryIds in [tech-id, dev-id]
categoryIds notIn [personal-id]
```

### Content Field

**Available Operators:** `contains`, `notContains`

**Values:** Text string (searches title, description, and content)

**Examples:**

```
content contains "react hooks"
content contains "machine learning"
content notContains "sponsored"
```

## Operator Behavior

### Case Sensitivity

- **Case-insensitive:** `contains`, `notContains`, `authorUsername` (with contains)
- **Case-sensitive:** `equals` (for exact matches)

### Partial Matching

- **Partial match:** `contains`, `notContains`
- **Exact match:** `equals`, `notEquals`

### Array Operators

- **`in`** - Matches if ANY value in the array matches
- **`notIn`** - Matches if NONE of the values in the array match

### Date Operators

- **`equals`** - Exact date match (ignores time)
- **`greaterThan`** - After the specified date (inclusive)
- **`lessThan`** - Before the specified date (inclusive)
- **`between`** - Within the date range (inclusive on both ends)

## Combining Operators

Multiple filter conditions are combined with **AND logic**:

```
platform equals TWITTER
AND authorUsername contains "tech"
AND savedAt greaterThan 2024-11-01
```

All conditions must be true for a bookmark to appear in results.

## URL Encoding

When filters are encoded in URLs, operators use abbreviated forms:

| Operator     | URL Abbreviation |
| ------------ | ---------------- |
| equals       | `eq`             |
| not equals   | `neq`            |
| contains     | `contains`       |
| not contains | `ncontains`      |
| in           | `in`             |
| not in       | `nin`            |
| greater than | `gt`             |
| less than    | `lt`             |
| between      | `between`        |

**Example URL:**

```
?filters=platform:eq:TWITTER,authorUsername:contains:john,savedAt:gt:2024-11-01
```

## API Format

When transformed to API format, operators map to Prisma query operators:

| UI Operator | Prisma Operator                       | Example                                                         |
| ----------- | ------------------------------------- | --------------------------------------------------------------- |
| equals      | `=` or exact match                    | `{ platform: 'TWITTER' }`                                       |
| contains    | `contains` with `mode: 'insensitive'` | `{ authorUsername: { contains: 'john', mode: 'insensitive' } }` |
| in          | `in`                                  | `{ platform: { in: ['TWITTER', 'LINKEDIN'] } }`                 |
| notIn       | `notIn`                               | `{ categoryIds: { notIn: ['personal-id'] } }`                   |
| greaterThan | `gte`                                 | `{ savedAt: { gte: date } }`                                    |
| lessThan    | `lte`                                 | `{ savedAt: { lte: date } }`                                    |
| between     | `gte` and `lte`                       | `{ savedAt: { gte: fromDate, lte: toDate } }`                   |

## Validation Rules

### Required Values

All operators require a non-empty value:

- Text operators: non-empty string
- Array operators: non-empty array
- Date operators: valid date

### Date Validation

- Dates must be in valid format (YYYY-MM-DD or ISO 8601)
- For `between` operator: start date must be before or equal to end date
- Future dates are allowed

### Array Validation

- Arrays must contain at least one value
- Values must be valid for the field type

### Text Validation

- Text values are trimmed of whitespace
- Empty strings after trimming are invalid

## Performance Considerations

### Indexed Operators

These operators use database indexes for fast queries:

- `equals` on platform, authorUsername
- `greaterThan`, `lessThan`, `between` on savedAt, createdAt
- `in` on categoryIds

### Non-Indexed Operators

These operators may be slower on large datasets:

- `contains` on authorUsername (partial match)
- `contains` on content (full-text search)

### Optimization Tips

1. Use `equals` instead of `contains` when possible
2. Combine indexed filters first (platform, dates)
3. Limit date ranges for better performance
4. Use specific category filters to narrow results

## Common Patterns

### Find Recent Posts from Specific Platform

```
platform equals TWITTER
savedAt greaterThan 2024-11-01
```

### Search Across Multiple Platforms

```
platform in [TWITTER, LINKEDIN]
content contains "AI"
```

### Exclude Specific Categories

```
categoryIds notIn [personal-id, draft-id]
```

### Date Range with Content Search

```
savedAt between 2024-01-01 and 2024-12-31
content contains "react"
```

### Author Search with Platform Filter

```
platform equals LINKEDIN
authorUsername contains "tech"
```

## Error Messages

Common validation error messages:

- **"Invalid filter value"** - Value is empty or wrong type
- **"Start date must be before end date"** - Invalid date range
- **"Must select at least one value"** - Empty array for `in`/`notIn`
- **"Invalid date format"** - Date string cannot be parsed
- **"Operator not supported for this field"** - Wrong operator for field type

## See Also

- [BOOKMARK_FILTERING.md](./BOOKMARK_FILTERING.md) - User guide for filtering
- [DEVELOPER_GUIDE_FILTERING.md](./DEVELOPER_GUIDE_FILTERING.md) - Developer documentation
- [USER_GUIDE.md](./USER_GUIDE.md) - Complete user guide
