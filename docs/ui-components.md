# UI Component Library

This document provides documentation for the reusable UI components in the SwiftSale application. The application uses a combination of custom components and components from the shadcn/ui library, which is built on top of Radix UI and styled with Tailwind CSS.

## Base UI Components

These components are located in `src/components/ui/` and form the foundation of the UI.

### Button

A versatile button component with various styles and sizes.

#### Props

```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  asChild?: boolean;
}
```

#### Usage

```tsx
import { Button } from "@/components/ui/button";

// Default button
<Button>Click me</Button>

// Destructive button
<Button variant="destructive">Delete</Button>

// Outline button
<Button variant="outline">Cancel</Button>

// Small button
<Button size="sm">Small Button</Button>

// Icon button
<Button size="icon">
  <PlusIcon className="h-4 w-4" />
</Button>

// As link
<Button asChild>
  <Link href="/somewhere">Go somewhere</Link>
</Button>
```

### Card

A container component for grouping related content.

#### Components

- `Card`: The main container
- `CardHeader`: The header section of the card
- `CardTitle`: The title of the card
- `CardDescription`: A description or subtitle for the card
- `CardContent`: The main content area of the card
- `CardFooter`: The footer section of the card

#### Usage

```tsx
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card Description</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Card Content</p>
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>
```

### Dialog

A modal dialog component for displaying content that requires user interaction.

#### Components

- `Dialog`: The main container
- `DialogTrigger`: The element that triggers the dialog
- `DialogContent`: The content of the dialog
- `DialogHeader`: The header section of the dialog
- `DialogTitle`: The title of the dialog
- `DialogDescription`: A description or subtitle for the dialog
- `DialogFooter`: The footer section of the dialog
- `DialogClose`: A button to close the dialog

#### Usage

```tsx
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

<Dialog>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Dialog Title</DialogTitle>
      <DialogDescription>Dialog Description</DialogDescription>
    </DialogHeader>
    <div>Dialog Content</div>
    <DialogFooter>
      <DialogClose asChild>
        <Button variant="outline">Cancel</Button>
      </DialogClose>
      <Button>Save</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Input

A text input component.

#### Props

```typescript
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}
```

#### Usage

```tsx
import { Input } from "@/components/ui/input";

// Basic input
<Input placeholder="Enter your name" />

// Disabled input
<Input disabled placeholder="Disabled" />

// With label
<div className="space-y-2">
  <Label htmlFor="name">Name</Label>
  <Input id="name" placeholder="Enter your name" />
</div>
```

### Select

A dropdown selection component.

#### Components

- `Select`: The main container
- `SelectTrigger`: The button that opens the select
- `SelectValue`: The display value of the select
- `SelectContent`: The content of the select dropdown
- `SelectItem`: An item in the select dropdown
- `SelectGroup`: A group of select items
- `SelectLabel`: A label for a group of select items
- `SelectSeparator`: A separator between select items

#### Usage

```tsx
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

<Select>
  <SelectTrigger>
    <SelectValue placeholder="Select an option" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
    <SelectItem value="option2">Option 2</SelectItem>
    <SelectItem value="option3">Option 3</SelectItem>
  </SelectContent>
</Select>
```

### Table

A table component for displaying tabular data.

#### Components

- `Table`: The main container
- `TableHeader`: The header section of the table
- `TableBody`: The body section of the table
- `TableFooter`: The footer section of the table
- `TableRow`: A row in the table
- `TableHead`: A header cell in the table
- `TableCell`: A cell in the table
- `TableCaption`: A caption for the table

#### Usage

```tsx
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from "@/components/ui/table";

<Table>
  <TableCaption>A list of users</TableCaption>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Email</TableHead>
      <TableHead>Role</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>John Doe</TableCell>
      <TableCell>john.doe@example.com</TableCell>
      <TableCell>Admin</TableCell>
    </TableRow>
    <TableRow>
      <TableCell>Jane Smith</TableCell>
      <TableCell>jane.smith@example.com</TableCell>
      <TableCell>User</TableCell>
    </TableRow>
  </TableBody>
  <TableFooter>
    <TableRow>
      <TableCell colSpan={3}>Total: 2 users</TableCell>
    </TableRow>
  </TableFooter>
</Table>
```

### Toast

A notification component for displaying messages to the user.

#### Components

- `Toaster`: The container for all toasts
- `Toast`: An individual toast notification
- `ToastTitle`: The title of a toast
- `ToastDescription`: The description of a toast
- `ToastAction`: An action button for a toast
- `ToastClose`: A button to close a toast

#### Usage

```tsx
// In your layout component
import { Toaster } from "@/components/ui/toaster";

<Toaster />

// In your component
import { useToast } from "@/hooks/use-toast";

const { toast } = useToast();

// Show a toast
toast({
  title: "Success",
  description: "Your changes have been saved.",
});

// Show a destructive toast
toast({
  title: "Error",
  description: "Something went wrong.",
  variant: "destructive",
});

// Show a toast with an action
toast({
  title: "Info",
  description: "Your session will expire soon.",
  action: <ToastAction altText="Renew">Renew</ToastAction>,
});
```

### Sidebar

A sidebar navigation component.

#### Components

- `SidebarProvider`: The provider for sidebar state
- `Sidebar`: The main sidebar container
- `SidebarHeader`: The header section of the sidebar
- `SidebarContent`: The content section of the sidebar
- `SidebarFooter`: The footer section of the sidebar
- `SidebarTrigger`: A button to toggle the sidebar
- `SidebarMenu`: A menu in the sidebar
- `SidebarMenuItem`: An item in the sidebar menu
- `SidebarMenuButton`: A button in the sidebar menu

#### Usage

```tsx
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";

<SidebarProvider>
  <Sidebar>
    <SidebarHeader>
      <h1>SwiftSale</h1>
    </SidebarHeader>
    <SidebarContent>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton asChild>
            <Link href="/">Dashboard</Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton asChild>
            <Link href="/products">Products</Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarContent>
    <SidebarFooter>
      <p>Footer content</p>
    </SidebarFooter>
  </Sidebar>
</SidebarProvider>
```

## Form Components

### Label

A label component for form fields.

#### Props

```typescript
interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}
```

#### Usage

```tsx
import { Label } from "@/components/ui/label";

<Label htmlFor="email">Email</Label>
<Input id="email" type="email" />
```

### Textarea

A multi-line text input component.

#### Props

```typescript
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}
```

#### Usage

```tsx
import { Textarea } from "@/components/ui/textarea";

<Textarea placeholder="Enter your message" />
```

### Checkbox

A checkbox component.

#### Props

```typescript
interface CheckboxProps extends React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> {}
```

#### Usage

```tsx
import { Checkbox } from "@/components/ui/checkbox";

<div className="flex items-center space-x-2">
  <Checkbox id="terms" />
  <Label htmlFor="terms">Accept terms and conditions</Label>
</div>
```

### RadioGroup

A radio button group component.

#### Components

- `RadioGroup`: The container for radio buttons
- `RadioGroupItem`: An individual radio button

#### Usage

```tsx
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

<RadioGroup defaultValue="option1">
  <div className="flex items-center space-x-2">
    <RadioGroupItem value="option1" id="option1" />
    <Label htmlFor="option1">Option 1</Label>
  </div>
  <div className="flex items-center space-x-2">
    <RadioGroupItem value="option2" id="option2" />
    <Label htmlFor="option2">Option 2</Label>
  </div>
</RadioGroup>
```

## Data Display Components

### Avatar

A component for displaying user avatars.

#### Components

- `Avatar`: The main container
- `AvatarImage`: The image of the avatar
- `AvatarFallback`: The fallback content when the image fails to load

#### Usage

```tsx
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

<Avatar>
  <AvatarImage src="https://example.com/avatar.jpg" alt="User Avatar" />
  <AvatarFallback>JD</AvatarFallback>
</Avatar>
```

### Badge

A component for displaying small badges or tags.

#### Props

```typescript
interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline";
}
```

#### Usage

```tsx
import { Badge } from "@/components/ui/badge";

<Badge>New</Badge>
<Badge variant="secondary">Featured</Badge>
<Badge variant="destructive">Sold Out</Badge>
<Badge variant="outline">Tag</Badge>
```

### Skeleton

A component for displaying loading states.

#### Props

```typescript
interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}
```

#### Usage

```tsx
import { Skeleton } from "@/components/ui/skeleton";

<Skeleton className="h-12 w-12 rounded-full" />
<Skeleton className="h-4 w-[250px]" />
<Skeleton className="h-4 w-[200px]" />
```

## Layout Components

### ScrollArea

A custom scrollable area component.

#### Props

```typescript
interface ScrollAreaProps extends React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root> {}
```

#### Usage

```tsx
import { ScrollArea } from "@/components/ui/scroll-area";

<ScrollArea className="h-[200px]">
  <div className="p-4">
    {/* Content that might overflow */}
    <p>Lorem ipsum dolor sit amet...</p>
    {/* More content */}
  </div>
</ScrollArea>
```

### Separator

A visual separator between content.

#### Props

```typescript
interface SeparatorProps extends React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root> {}
```

#### Usage

```tsx
import { Separator } from "@/components/ui/separator";

<div>
  <h2>Section 1</h2>
  <p>Content for section 1</p>
  <Separator className="my-4" />
  <h2>Section 2</h2>
  <p>Content for section 2</p>
</div>
```

## Feedback Components

### Alert

A component for displaying important messages.

#### Components

- `Alert`: The main container
- `AlertTitle`: The title of the alert
- `AlertDescription`: The description of the alert

#### Usage

```tsx
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";

<Alert>
  <InfoIcon className="h-4 w-4" />
  <AlertTitle>Information</AlertTitle>
  <AlertDescription>
    This is an informational message.
  </AlertDescription>
</Alert>
```

### AlertDialog

A dialog for confirming destructive actions.

#### Components

- `AlertDialog`: The main container
- `AlertDialogTrigger`: The element that triggers the dialog
- `AlertDialogContent`: The content of the dialog
- `AlertDialogHeader`: The header section of the dialog
- `AlertDialogTitle`: The title of the dialog
- `AlertDialogDescription`: The description of the dialog
- `AlertDialogFooter`: The footer section of the dialog
- `AlertDialogAction`: A button for the primary action
- `AlertDialogCancel`: A button to cancel the action

#### Usage

```tsx
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="destructive">Delete</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
      <AlertDialogDescription>
        This action cannot be undone. This will permanently delete the item.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction>Delete</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

## Navigation Components

### Breadcrumb

A component for showing the current location in a hierarchy.

#### Components

- `Breadcrumb`: The main container
- `BreadcrumbList`: The list of breadcrumb items
- `BreadcrumbItem`: An item in the breadcrumb
- `BreadcrumbLink`: A link in the breadcrumb
- `BreadcrumbSeparator`: The separator between breadcrumb items
- `BreadcrumbPage`: The current page in the breadcrumb

#### Usage

```tsx
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";

<Breadcrumb>
  <BreadcrumbList>
    <BreadcrumbItem>
      <BreadcrumbLink href="/">Home</BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbLink href="/products">Products</BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbPage>Product Details</BreadcrumbPage>
    </BreadcrumbItem>
  </BreadcrumbList>
</Breadcrumb>
```

### Dropdown Menu

A dropdown menu component.

#### Components

- `DropdownMenu`: The main container
- `DropdownMenuTrigger`: The element that triggers the dropdown
- `DropdownMenuContent`: The content of the dropdown
- `DropdownMenuItem`: An item in the dropdown
- `DropdownMenuCheckboxItem`: A checkbox item in the dropdown
- `DropdownMenuRadioItem`: A radio item in the dropdown
- `DropdownMenuLabel`: A label in the dropdown
- `DropdownMenuSeparator`: A separator between dropdown items
- `DropdownMenuShortcut`: A keyboard shortcut for a dropdown item
- `DropdownMenuGroup`: A group of dropdown items
- `DropdownMenuSub`: A sub-menu in the dropdown
- `DropdownMenuSubTrigger`: The element that triggers a sub-menu
- `DropdownMenuSubContent`: The content of a sub-menu
- `DropdownMenuRadioGroup`: A group of radio items in the dropdown

#### Usage

```tsx
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button>Open Menu</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuLabel>My Account</DropdownMenuLabel>
    <DropdownMenuSeparator />
    <DropdownMenuItem>Profile</DropdownMenuItem>
    <DropdownMenuItem>Settings</DropdownMenuItem>
    <DropdownMenuItem>Logout</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

## Best Practices

### Component Composition

- Use component composition to build complex UIs from simple components
- Keep components small and focused on a single responsibility
- Use props to customize component behavior and appearance

### Accessibility

- Use semantic HTML elements
- Provide proper labels for form fields
- Ensure sufficient color contrast
- Support keyboard navigation
- Use ARIA attributes where appropriate

### Responsive Design

- Use Tailwind's responsive utilities for different screen sizes
- Test components on various devices and screen sizes
- Use mobile-first approach for responsive design

### Performance

- Memoize expensive components with React.memo
- Use useCallback for event handlers passed as props
- Avoid unnecessary re-renders
- Optimize images and assets