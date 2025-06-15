# Getting Started with SwiftSale

This guide will help you set up your development environment and get started with the SwiftSale application.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: Version 18.x or higher
- **npm** or **yarn**: Latest stable version
- **Git**: For version control

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/SwiftSale.git
cd SwiftSale
```

### 2. Install Dependencies

```bash
# Using npm
npm install

# Using yarn
yarn install
```

### 3. Environment Setup

Create a `.env.local` file in the root directory with the following variables:

```
NEXT_PUBLIC_API_BASE_URL=https://orca-app-k6zka.ondigitalocean.app/api/v2
```

For local development with a mock API, you can use:

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api/v2
```

### 4. Start the Development Server

```bash
# Using npm
npm run dev

# Using yarn
yarn dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

## Project Structure

Understanding the project structure will help you navigate the codebase:

```
SwiftSale/
├── docs/                  # Documentation files
├── public/                # Static assets
├── src/                   # Source code
│   ├── ai/                # AI integration components
│   ├── app/               # Next.js App Router pages
│   │   ├── products/      # Product management pages
│   │   ├── orders/        # Order management pages
│   │   ├── procurements/  # Procurement management pages
│   │   ├── users/         # User management pages
│   │   ├── settings/      # Settings pages
│   │   └── ...
│   ├── components/        # Reusable UI components
│   │   ├── ui/            # Base UI components
│   │   └── layout/        # Layout components
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utility functions and API client
│   └── ...
├── .env.local             # Environment variables (create this file)
├── next.config.ts         # Next.js configuration
├── package.json           # Project dependencies
├── tailwind.config.ts     # Tailwind CSS configuration
└── tsconfig.json          # TypeScript configuration
```

## Key Files and Directories

- **src/app/**: Contains all the pages of the application using Next.js App Router
- **src/components/**: Contains all the reusable UI components
- **src/lib/apiClient.ts**: Central API client for all backend communication
- **src/hooks/**: Custom React hooks for reusable logic
- **tailwind.config.ts**: Tailwind CSS configuration for styling

## Development Workflow

### Code Style and Formatting

SwiftSale uses ESLint and Prettier for code style and formatting:

```bash
# Check for linting issues
npm run lint

# Fix linting issues
npm run lint:fix

# Format code with Prettier
npm run format
```

### TypeScript

SwiftSale is built with TypeScript. Make sure to define proper types for all variables, functions, and components:

```typescript
// Example of a properly typed function
function calculateTotal(items: OrderItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}
```

### Component Development

When creating new components:

1. Place them in the appropriate directory based on their purpose
2. Use TypeScript for type safety
3. Follow the established patterns for state management, data fetching, etc.
4. Include proper documentation with JSDoc comments

Example:

```tsx
/**
 * ProductCard component displays a product with its basic information.
 * 
 * @param {ProductCardProps} props - The component props
 * @returns {JSX.Element} The rendered component
 */
export function ProductCard({ product, onSelect }: ProductCardProps) {
  // Component implementation
}
```

### Page Development

When creating new pages:

1. Create a new directory in `src/app/` following the Next.js App Router conventions
2. Use the "use client" directive at the top of client components
3. Follow the established patterns for data fetching, error handling, etc.

Example:

```tsx
// src/app/products/[id]/page.tsx
"use client";

import { useParams } from "next/navigation";
import { fetchProductById } from "@/lib/apiClient";

export default function ProductDetailPage() {
  const params = useParams();
  const productId = params.id as string;
  
  // Page implementation
}
```

## API Integration

SwiftSale communicates with a RESTful API backend. The API client is located at `src/lib/apiClient.ts`.

### Making API Requests

```typescript
import { fetchProducts, createProduct } from "@/lib/apiClient";

// Fetching data
const products = await fetchProducts({ page: 0, size: 10 });

// Creating data
const newProduct = await createProduct({
  name: "Product Name",
  brand: "Brand Name",
  category: "Category",
  // Other required fields
});
```

### Error Handling

Always wrap API calls in try/catch blocks:

```typescript
try {
  const result = await someApiFunction();
  // Handle success
} catch (error) {
  // Handle error
  console.error("API error:", error);
  toast({
    title: "Error",
    description: error.message || "An error occurred",
    variant: "destructive",
  });
}
```

## State Management

SwiftSale uses React's built-in state management with hooks:

- **useState**: For component-local state
- **useContext**: For shared state across components
- **useReducer**: For complex state logic

### Form State Management

SwiftSale uses react-hook-form for form state management:

```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Define schema
const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  // Other fields
});

type FormValues = z.infer<typeof formSchema>;

// Use in component
const form = useForm<FormValues>({
  resolver: zodResolver(formSchema),
  defaultValues: {
    name: "",
    // Other default values
  },
});
```

## Testing

SwiftSale uses Jest and React Testing Library for testing:

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch
```

### Writing Tests

When writing tests:

1. Place test files next to the files they test with a `.test.tsx` extension
2. Use React Testing Library for component testing
3. Use Jest for unit testing

Example:

```tsx
// Button.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button', () => {
  it('renders correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const onClick = jest.fn();
    render(<Button onClick={onClick}>Click me</Button>);
    await userEvent.click(screen.getByRole('button', { name: /click me/i }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
```

## Deployment

SwiftSale can be deployed to various platforms:

### Building for Production

```bash
# Using npm
npm run build

# Using yarn
yarn build
```

This will create a production build in the `.next` directory.

### Running in Production

```bash
# Using npm
npm start

# Using yarn
yarn start
```

## Troubleshooting

### Common Issues

1. **API Connection Issues**:
   - Check that your `.env.local` file has the correct API URL
   - Ensure the API server is running
   - Check for CORS issues in the browser console

2. **Build Errors**:
   - Check for TypeScript errors
   - Ensure all dependencies are installed
   - Clear the `.next` directory and node_modules, then reinstall dependencies

3. **Runtime Errors**:
   - Check the browser console for errors
   - Check the server logs for errors
   - Ensure all required environment variables are set

### Getting Help

If you encounter issues not covered in this guide:

1. Check the existing documentation
2. Search for similar issues in the project's issue tracker
3. Ask for help from other team members

## Next Steps

Now that you have the development environment set up, you can:

1. Explore the codebase to understand the application structure
2. Review the [Architecture Overview](./architecture.md) for a high-level understanding
3. Check the [API Integration](./api-integration.md) documentation for details on the API client
4. Review the [Business Logic](./business-logic.md) documentation for domain-specific details
5. Start working on your assigned tasks or features