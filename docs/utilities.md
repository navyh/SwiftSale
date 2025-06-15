# Utility Functions

This document provides documentation for the utility functions used in the SwiftSale application. These functions provide common functionality that is used throughout the application.

## Core Utilities

### `cn` - Class Name Utility

Located in `src/lib/utils.ts`, this utility function combines multiple class names using `clsx` and `tailwind-merge`. It's used to conditionally apply Tailwind CSS classes.

#### Parameters

- `...inputs`: Any number of class name arguments (strings, objects, arrays, etc.)

#### Returns

- A merged string of class names with Tailwind-specific conflicts resolved

#### Usage

```tsx
import { cn } from "@/lib/utils";

// Combine static classes
<div className={cn("flex items-center", "p-4")}>...</div>

// Conditionally apply classes
<div className={cn("flex items-center", isActive && "bg-primary text-primary-foreground")}>...</div>

// With template literals
<div className={cn(`
  flex items-center 
  ${isActive ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}
`)}>...</div>
```

## Form Utilities

### `debounce` - Debounce Function

A utility function that delays the execution of a function until after a specified delay. This is commonly used for search inputs to prevent excessive API calls.

#### Parameters

- `func`: The function to debounce
- `waitFor`: The delay in milliseconds

#### Returns

- A debounced version of the function

#### Usage

```tsx
import { debounce } from "@/lib/utils";

// In a component
const handleSearchDebounced = React.useCallback(
  debounce((term: string) => {
    setSearchTerm(term);
    fetchSearchResults(term);
  }, 500),
  []
);

// In JSX
<Input
  type="search"
  placeholder="Search..."
  onChange={(e) => handleSearchDebounced(e.target.value)}
/>
```

## Date and Time Utilities

### `formatDate` - Date Formatting

A utility function that formats dates in a consistent way throughout the application.

#### Parameters

- `date`: A Date object or ISO string
- `format` (optional): The format to use (default: "YYYY-MM-DD")

#### Returns

- A formatted date string

#### Usage

```tsx
import { formatDate } from "@/lib/utils";

// Format a date
const formattedDate = formatDate(new Date()); // "2023-06-02"

// Format with custom format
const formattedDateTime = formatDate(new Date(), "DD MMM YYYY, HH:mm"); // "02 Jun 2023, 14:30"
```

### `formatCurrency` - Currency Formatting

A utility function that formats currency values in a consistent way throughout the application.

#### Parameters

- `amount`: The amount to format
- `currency` (optional): The currency code (default: "INR")
- `locale` (optional): The locale to use for formatting (default: "en-IN")

#### Returns

- A formatted currency string

#### Usage

```tsx
import { formatCurrency } from "@/lib/utils";

// Format a currency amount
const formattedAmount = formatCurrency(1000); // "₹1,000.00"

// Format with custom currency and locale
const formattedUSD = formatCurrency(1000, "USD", "en-US"); // "$1,000.00"
```

## Validation Utilities

### `validateGSTIN` - GSTIN Validation

A utility function that validates a Goods and Services Tax Identification Number (GSTIN) for Indian businesses.

#### Parameters

- `gstin`: The GSTIN to validate

#### Returns

- `true` if the GSTIN is valid, `false` otherwise

#### Usage

```tsx
import { validateGSTIN } from "@/lib/utils";

// Validate a GSTIN
const isValid = validateGSTIN("27AAPFU0939F1ZV"); // true or false
```

### `validatePhone` - Phone Number Validation

A utility function that validates phone numbers.

#### Parameters

- `phone`: The phone number to validate

#### Returns

- `true` if the phone number is valid, `false` otherwise

#### Usage

```tsx
import { validatePhone } from "@/lib/utils";

// Validate a phone number
const isValid = validatePhone("1234567890"); // true or false
```

## Array and Object Utilities

### `groupBy` - Group Array Items

A utility function that groups an array of objects by a specified key.

#### Parameters

- `array`: The array to group
- `key`: The key to group by

#### Returns

- An object with keys corresponding to the grouped values

#### Usage

```tsx
import { groupBy } from "@/lib/utils";

const users = [
  { id: 1, role: "admin" },
  { id: 2, role: "user" },
  { id: 3, role: "admin" },
];

const groupedByRole = groupBy(users, "role");
// {
//   admin: [{ id: 1, role: "admin" }, { id: 3, role: "admin" }],
//   user: [{ id: 2, role: "user" }]
// }
```

### `sortBy` - Sort Array Items

A utility function that sorts an array of objects by a specified key.

#### Parameters

- `array`: The array to sort
- `key`: The key to sort by
- `direction` (optional): The sort direction ("asc" or "desc", default: "asc")

#### Returns

- A new sorted array

#### Usage

```tsx
import { sortBy } from "@/lib/utils";

const users = [
  { id: 3, name: "Charlie" },
  { id: 1, name: "Alice" },
  { id: 2, name: "Bob" },
];

const sortedByName = sortBy(users, "name");
// [
//   { id: 1, name: "Alice" },
//   { id: 2, name: "Bob" },
//   { id: 3, name: "Charlie" }
// ]

const sortedByIdDesc = sortBy(users, "id", "desc");
// [
//   { id: 3, name: "Charlie" },
//   { id: 2, name: "Bob" },
//   { id: 1, name: "Alice" }
// ]
```

## GST Calculation Utilities

### `calculateGST` - GST Calculation

A utility function that calculates GST (Goods and Services Tax) for a given amount and rate.

#### Parameters

- `amount`: The pre-tax amount
- `rate`: The GST rate (percentage)
- `stateCode` (optional): The state code for determining IGST vs CGST/SGST split
- `sellerStateCode` (optional): The seller's state code (default: "04")

#### Returns

- An object containing the GST breakdown

#### Usage

```tsx
import { calculateGST } from "@/lib/utils";

// Calculate GST for intra-state transaction (same state)
const intraStateGST = calculateGST(1000, 18, "04", "04");
// {
//   gstAmount: 180,
//   igstAmount: 0,
//   cgstAmount: 90,
//   sgstAmount: 90,
//   igstRate: 0,
//   cgstRate: 9,
//   sgstRate: 9,
//   totalAmount: 1180
// }

// Calculate GST for inter-state transaction (different states)
const interStateGST = calculateGST(1000, 18, "27", "04");
// {
//   gstAmount: 180,
//   igstAmount: 180,
//   cgstAmount: 0,
//   sgstAmount: 0,
//   igstRate: 18,
//   cgstRate: 0,
//   sgstRate: 0,
//   totalAmount: 1180
// }
```

### `calculateTaxableAmount` - Taxable Amount Calculation

A utility function that calculates the taxable amount after applying a discount.

#### Parameters

- `unitPrice`: The pre-tax unit price
- `quantity`: The quantity
- `discountRate`: The discount rate (percentage)

#### Returns

- The taxable amount

#### Usage

```tsx
import { calculateTaxableAmount } from "@/lib/utils";

// Calculate taxable amount
const taxableAmount = calculateTaxableAmount(100, 2, 10); // 180
```

## String Utilities

### `truncate` - Truncate String

A utility function that truncates a string to a specified length and adds an ellipsis.

#### Parameters

- `str`: The string to truncate
- `length` (optional): The maximum length (default: 50)
- `ellipsis` (optional): The ellipsis string (default: "...")

#### Returns

- The truncated string

#### Usage

```tsx
import { truncate } from "@/lib/utils";

// Truncate a string
const truncated = truncate("This is a very long string that needs to be truncated", 20); // "This is a very long..."
```

### `slugify` - Create URL Slug

A utility function that converts a string to a URL-friendly slug.

#### Parameters

- `str`: The string to slugify

#### Returns

- The slugified string

#### Usage

```tsx
import { slugify } from "@/lib/utils";

// Create a slug
const slug = slugify("This is a Product Name!"); // "this-is-a-product-name"
```

## Error Handling Utilities

### `handleApiError` - API Error Handler

A utility function that handles API errors in a consistent way.

#### Parameters

- `error`: The error object
- `toast` (optional): The toast function for displaying errors

#### Returns

- A standardized error message

#### Usage

```tsx
import { handleApiError } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

// In a component
const { toast } = useToast();

try {
  // API call
} catch (error) {
  const errorMessage = handleApiError(error, toast);
  console.error(errorMessage);
}
```

## Browser Utilities

### `downloadFile` - File Download

A utility function that triggers a file download from a URL or Blob.

#### Parameters

- `data`: The URL or Blob to download
- `filename`: The name to give the downloaded file
- `mimeType` (optional): The MIME type of the file

#### Returns

- `void`

#### Usage

```tsx
import { downloadFile } from "@/lib/utils";

// Download from URL
downloadFile("https://example.com/file.pdf", "document.pdf");

// Download from Blob
const blob = new Blob(["Hello, world!"], { type: "text/plain" });
downloadFile(blob, "hello.txt", "text/plain");
```

### `copyToClipboard` - Copy to Clipboard

A utility function that copies text to the clipboard.

#### Parameters

- `text`: The text to copy

#### Returns

- A Promise that resolves when the text is copied

#### Usage

```tsx
import { copyToClipboard } from "@/lib/utils";

// Copy text to clipboard
const handleCopy = async () => {
  try {
    await copyToClipboard("Text to copy");
    toast({ title: "Copied to clipboard" });
  } catch (error) {
    toast({ title: "Failed to copy", variant: "destructive" });
  }
};
```

## Best Practices

### Using Utility Functions

- Import utility functions directly from their source file
- Use TypeScript for type safety
- Document any complex utility functions with JSDoc comments
- Write unit tests for utility functions
- Keep utility functions pure and focused on a single responsibility

### Creating New Utility Functions

When creating new utility functions:

1. Place them in the appropriate file based on their purpose
2. Use TypeScript for type safety
3. Write unit tests for the function
4. Document the function with JSDoc comments
5. Keep the function pure and focused on a single responsibility

Example:

```typescript
/**
 * Calculates the discount amount based on the original price and discount rate.
 * 
 * @param {number} price - The original price
 * @param {number} discountRate - The discount rate as a percentage
 * @returns {number} The discount amount
 */
export function calculateDiscount(price: number, discountRate: number): number {
  return (price * discountRate) / 100;
}
```