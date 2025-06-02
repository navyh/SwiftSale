# Component Structure

This document outlines the UI component organization and usage patterns in the SwiftSale application.

## Component Architecture

SwiftSale follows a component-based architecture using React and Next.js. The component structure is organized to maximize reusability, maintainability, and consistency across the application.

### Component Hierarchy

The component hierarchy follows this general pattern:

1. **Page Components**: Top-level components that represent entire pages
2. **Layout Components**: Components that define the structure of pages
3. **Feature Components**: Components specific to a particular feature or domain
4. **UI Components**: Reusable UI elements used across the application

## UI Component Library

SwiftSale uses a combination of custom components and components from the shadcn/ui library, which is built on top of Radix UI and styled with Tailwind CSS.

### Base UI Components

Located in `src/components/ui/`, these are the foundational UI components:

- **Button**: Various button styles (primary, secondary, ghost, etc.)
- **Card**: Container component with header, content, and footer sections
- **Dialog**: Modal dialogs for forms and confirmations
- **Input**: Text input fields
- **Select**: Dropdown selection components
- **Table**: Data table components
- **Toast**: Notification components
- **Sidebar**: Navigation sidebar components

### Layout Components

Located in `src/components/layout/`, these components define the application structure:

- **AppLayout**: The main application layout with sidebar and header
- **SiteHeader**: The top navigation bar
- **Nav**: The navigation menu component
- **Sidebar**: The sidebar navigation component

## Page Structure

Each page in the application follows a consistent structure:

```tsx
// src/app/[feature]/page.tsx
"use client";

import * as React from "react";
import { useToast } from "@/hooks/use-toast";
import { SomeApiFunction } from "@/lib/apiClient";
import { SomeComponent } from "@/components/ui/some-component";

export default function FeaturePage() {
  // State management
  const [data, setData] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const { toast } = useToast();

  // Data fetching
  React.useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const result = await SomeApiFunction();
        setData(result);
      } catch (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  // Render
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Feature Title</h1>
        <Button>Action</Button>
      </div>

      {/* Main content */}
      <Card>
        <CardHeader>
          <CardTitle>Section Title</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Content goes here */}
        </CardContent>
      </Card>
    </div>
  );
}
```

## Feature-Specific Components

### Product Management Components

- **ProductList**: Displays a list of products with filtering and pagination
- **ProductForm**: Form for creating and editing products
- **VariantManager**: Interface for managing product variants
- **ProductCard**: Card component for displaying product information

### Order Management Components

- **OrderList**: Displays a list of orders with filtering and pagination
- **OrderForm**: Multi-step form for creating orders
- **CustomerSelector**: Component for selecting or creating customers
- **ProductSelector**: Component for selecting products and variants
- **OrderSummary**: Component for displaying order totals and tax breakdown

### User Management Components

- **UserList**: Displays a list of users with filtering and pagination
- **UserForm**: Form for creating and editing users
- **BusinessProfileForm**: Form for creating and editing business profiles
- **AddressForm**: Form for managing addresses

## Component Patterns

### Form Patterns

SwiftSale uses react-hook-form for form management:

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Define schema
const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
});

type FormValues = z.infer<typeof formSchema>;

export function ExampleForm() {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
    },
  });

  const onSubmit = async (data: FormValues) => {
    // Handle form submission
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* Form fields */}
    </form>
  );
}
```

### Data Fetching Pattern

SwiftSale uses a consistent pattern for data fetching:

```tsx
const [data, setData] = React.useState<DataType[]>([]);
const [isLoading, setIsLoading] = React.useState(true);
const [error, setError] = React.useState<string | null>(null);

React.useEffect(() => {
  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await fetchSomeData();
      setData(result);
    } catch (err: any) {
      setError(err.message || "An error occurred");
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  fetchData();
}, [dependencies]);
```

### Loading State Pattern

SwiftSale uses skeleton components for loading states:

```tsx
{isLoading ? (
  <TableRow>
    <TableCell><Skeleton className="h-10 w-full" /></TableCell>
    <TableCell><Skeleton className="h-10 w-full" /></TableCell>
    {/* Additional skeleton cells */}
  </TableRow>
) : (
  // Actual data rendering
)}
```

### Error Handling Pattern

SwiftSale uses toast notifications for error handling:

```tsx
try {
  // Some operation
} catch (err: any) {
  toast({
    title: "Error",
    description: err.message || "An error occurred",
    variant: "destructive",
  });
}
```

## Responsive Design

SwiftSale follows a mobile-first approach to responsive design using Tailwind CSS:

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  {/* Content that adapts to screen size */}
</div>
```

Common responsive patterns include:

- Using `flex-col md:flex-row` to stack elements vertically on mobile and horizontally on larger screens
- Using `hidden md:block` to hide elements on mobile
- Using `w-full md:w-auto` to make elements full-width on mobile and auto-width on larger screens

## Accessibility Considerations

SwiftSale implements accessibility best practices:

- Using semantic HTML elements
- Providing proper labels for form fields
- Ensuring sufficient color contrast
- Supporting keyboard navigation
- Using ARIA attributes where appropriate

## Component Documentation

Each component should include:

- Clear prop definitions with TypeScript
- Default values for optional props
- Usage examples
- Accessibility considerations

Example:

```tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  isLoading?: boolean;
}

/**
 * Button component with various styles and sizes.
 * 
 * @example
 * <Button variant="default" size="default">Click me</Button>
 */
export function Button({
  variant = "default",
  size = "default",
  isLoading = false,
  children,
  ...props
}: ButtonProps) {
  // Component implementation
}
```