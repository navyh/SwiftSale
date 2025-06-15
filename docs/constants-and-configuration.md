# Constants and Configuration

This document provides documentation for the constants and configuration values used in the SwiftSale application. Understanding these values is essential for developers working on the application, as they define many of the application's behaviors and appearance.

## Core Constants

### Navigation Items

Located in `src/lib/constants.ts`, the navigation items define the main navigation structure of the application.

```typescript
export const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    label: 'Products',
    href: '/products',
    icon: Package,
  },
  {
    label: 'Orders',
    href: '/orders',
    icon: ShoppingCart,
  },
  {
    label: 'Procurements',
    href: '/procurements',
    icon: Truck,
  },
  {
    label: 'Users',
    href: '/users',
    icon: UsersRound,
  },
  {
    label: 'Business Profiles',
    href: '/business-profiles',
    icon: Building2,
  },
  {
    label: 'Staff',
    href: '/staff',
    icon: Briefcase,
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: Settings2,
  },
];
```

### Indian States

A comprehensive list of Indian states and union territories with their GST state codes, used for GST calculations and address validation.

```typescript
export const indianStates: IndianState[] = [
  { name: "ANDAMAN AND NICOBAR ISLANDS", code: "35", type: "UT" },
  { name: "ANDHRA PRADESH", code: "37", type: "STATE" },
  // ... other states
  { name: "WEST BENGAL", code: "19", type: "STATE" }
];
```

### User Roles

Defines the available user roles in the system.

```typescript
export const USER_ROLES_OPTIONS = ["ADMIN", "MANAGER", "POS_USER", "SALES_PERSON"] as const;
export const CUSTOMER_ROLE_VALUE = "CUSTOMER_NO_ROLE";
```

## GST Configuration

### Seller State Code

The default state code for the seller, used in GST calculations.

```typescript
const SELLER_STATE_CODE = "04"; // Chandigarh
```

### Standard GST Rates

The standard GST rates available for selection.

```typescript
const STANDARD_GST_RATES = [0, 5, 12, 18, 28];
```

### Default GST Rate

The default GST rate used for quick product creation.

```typescript
const DEFAULT_GST_FOR_QUICK_CREATE = 18;
```

## API Configuration

### API Base URL

The base URL for API requests.

```typescript
const API_BASE_URL = 'https://orca-app-k6zka.ondigitalocean.app/api/v2';
```

### API Request Timeout

The default timeout for API requests.

```typescript
const API_REQUEST_TIMEOUT = 30000; // 30 seconds
```

## UI Configuration

### Sidebar Configuration

Constants related to the sidebar component.

```typescript
const SIDEBAR_COOKIE_NAME = "sidebar_state";
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days
const SIDEBAR_WIDTH = "16rem";
const SIDEBAR_WIDTH_MOBILE = "18rem";
const SIDEBAR_WIDTH_ICON = "3rem";
const SIDEBAR_KEYBOARD_SHORTCUT = "b";
```

### Mobile Breakpoint

The breakpoint for mobile devices.

```typescript
const MOBILE_BREAKPOINT = 768;
```

### Toast Configuration

Constants for toast notifications.

```typescript
const TOAST_LIMIT = 1;
const TOAST_REMOVE_DELAY = 1000000;
```

## Pagination Configuration

### Default Page Size

The default number of items per page.

```typescript
const DEFAULT_PAGE_SIZE = 10;
```

### Maximum Page Size

The maximum number of items that can be requested per page.

```typescript
const MAX_PAGE_SIZE = 100;
```

## Order Management Constants

### Order Status Options

The available order status options.

```typescript
const ORDER_STATUS_OPTIONS = [
  "PENDING",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "RETURNED"
];
```

### Payment Method Options

The available payment method options.

```typescript
const PAYMENT_METHOD_OPTIONS = [
  "CASH",
  "CREDIT_CARD",
  "DEBIT_CARD",
  "UPI",
  "BANK_TRANSFER",
  "CHEQUE",
  "PENDING"
];
```

## Product Management Constants

### Product Status Options

The available product status options.

```typescript
const PRODUCT_STATUS_OPTIONS = [
  "ACTIVE",
  "DRAFT",
  "ARCHIVED",
  "OUT_OF_STOCK"
];
```

## Using Constants

### Best Practices

1. **Centralize Constants**: Keep related constants in the same file or module.
2. **Use TypeScript**: Define types for constants to ensure type safety.
3. **Use Enums or as const**: Use TypeScript enums or `as const` to create type-safe constants.
4. **Document Constants**: Add comments to explain the purpose and usage of constants.
5. **Use Meaningful Names**: Choose descriptive names that clearly indicate the purpose of the constant.

### Example: Using Navigation Items

```tsx
import { navItems } from "@/lib/constants";

function Sidebar() {
  return (
    <nav>
      <ul>
        {navItems.map((item) => (
          <li key={item.href}>
            <Link href={item.href}>
              <item.icon />
              <span>{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
```

### Example: Using GST State Codes

```tsx
import { indianStates } from "@/lib/constants";

function StateSelector({ value, onChange }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder="Select a state" />
      </SelectTrigger>
      <SelectContent>
        {indianStates.map((state) => (
          <SelectItem key={state.code} value={state.code}>
            {state.name} ({state.code})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

## Environment Variables

### Available Environment Variables

The application uses the following environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_BASE_URL` | The base URL for API requests | https://orca-app-k6zka.ondigitalocean.app/api/v2 |
| `NEXT_PUBLIC_ENVIRONMENT` | The current environment (development, staging, production) | development |
| `NEXT_PUBLIC_DEBUG` | Enable debug mode | false |

### Setting Environment Variables

Environment variables can be set in a `.env.local` file in the root of the project:

```
NEXT_PUBLIC_API_BASE_URL=https://your-api-url.com/api/v2
NEXT_PUBLIC_ENVIRONMENT=development
NEXT_PUBLIC_DEBUG=true
```

### Accessing Environment Variables

Environment variables can be accessed in the application using `process.env`:

```typescript
const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
const isDebug = process.env.NEXT_PUBLIC_DEBUG === 'true';
```

## Configuration Files

### Next.js Configuration

The Next.js configuration is defined in `next.config.js`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['placehold.co', 'example.com'],
  },
  // other configuration options
};

module.exports = nextConfig;
```

### Tailwind CSS Configuration

The Tailwind CSS configuration is defined in `tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        // other color definitions
      },
      // other theme extensions
    },
  },
  plugins: [require("tailwindcss-animate")],
}
```

## Extending Configuration

### Adding New Constants

When adding new constants to the application:

1. Identify the appropriate file or module for the constant
2. Define the constant with a descriptive name
3. Add TypeScript types if applicable
4. Document the constant with comments
5. Update this documentation if the constant is significant

### Example: Adding a New Constant

```typescript
/**
 * The maximum number of items that can be added to an order.
 * This is used to prevent performance issues with large orders.
 */
export const MAX_ORDER_ITEMS = 100;
```

### Modifying Existing Constants

When modifying existing constants:

1. Consider the impact on existing code
2. Update all references to the constant
3. Update tests that rely on the constant
4. Update documentation to reflect the changes

## Conclusion

Constants and configuration values play a crucial role in the SwiftSale application. They define the behavior and appearance of the application and provide a centralized way to manage these values. Understanding these constants is essential for developers working on the application.