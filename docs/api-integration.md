# API Integration

This document provides detailed information about the API integration in SwiftSale, focusing on the API client implementation, request/response handling, and error management.

## API Client Overview

SwiftSale uses a custom API client located at `src/lib/apiClient.ts` to handle all communication with the backend RESTful API. The API client provides a centralized, type-safe interface for making API requests.

### API Base URL

The API base URL is configured in the API client:

```typescript
const API_BASE_URL = 'https://orca-app-k6zka.ondigitalocean.app/api/v2';
```

In a production environment, this should be configured via environment variables:

```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.swiftsale.com/api/v2';
```

## Core API Client Function

The core of the API client is the `fetchAPI` function, which handles request formatting, authentication, and error handling:

```typescript
async function fetchAPI<T>(endpoint: string, options?: RequestInit, expectJson = true): Promise<T> {
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      // 'Authorization': `Bearer ${getToken()}`, // Placeholder for auth
    },
  };
  const mergedOptions = { ...defaultOptions, ...options, headers: {...defaultOptions.headers, ...options?.headers} };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, mergedOptions);

  if (!response.ok) {
    let errorMessage = `API request failed: ${response.status} ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData && errorData.message) {
        errorMessage = errorData.message;
      } else if (errorData && errorData.error) {
        errorMessage = errorData.error;
      } else if (errorData && Array.isArray(errorData) && errorData.length > 0 && errorData[0].message) {
        errorMessage = errorData.map((err: any) => err.message || `${err.field}: ${err.defaultMessage}`).join(', ');
      } else if (errorData && errorData.detail) { // For Spring Boot validation errors
        errorMessage = errorData.detail;
      }
    } catch (e) {
      // Ignore if parsing errorData itself fails, stick with statusText
    }
    throw new Error(errorMessage);
  }
  if (!expectJson || response.status === 204) { // 204 No Content
    return undefined as T;
  }
  return response.json() as Promise<T>;
}
```

## API Interfaces

The API client defines TypeScript interfaces for all API requests and responses, ensuring type safety throughout the application:

### Common Interfaces

```typescript
// Generic page interface for paginated responses
export interface Page<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number; // current page number
  first: boolean;
  last: boolean;
  empty: boolean;
}

// Address interfaces used across multiple entity types
export interface AddressDto {
  id: string;
  line1?: string | null;
  line2?: string | null;
  city: string;
  state: string;
  stateCode: string;
  country?: string | null;
  postalCode?: string | null;
  type?: 'SHIPPING' | 'BILLING' | string | null;
  isDefault: boolean;
  contactName?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
}

export interface AddressCreateDto {
  // Fields for creating a new address
  // ...
}
```

### Entity-Specific Interfaces

The API client defines interfaces for each entity type in the system:

- User Management: `UserDto`, `CreateUserRequest`, `UpdateUserRequest`
- Business Profiles: `BusinessProfileDto`, `CreateBusinessProfileRequest`
- Products: `ProductDto`, `ProductVariantDto`, `CreateProductRequest`
- Orders: `OrderDto`, `CreateOrderRequest`, `OrderItemRequest`
- And more...

## API Functions

The API client provides functions for interacting with each entity type:

### User Management

```typescript
export async function fetchUsers(params?: { search?: string; page?: number; size?: number }): Promise<Page<UserDto>> {
  // Implementation
}

export async function fetchUserById(userId: string): Promise<UserDto> {
  // Implementation
}

export async function createUser(userData: CreateUserRequest): Promise<UserDto> {
  // Implementation
}

// Additional user management functions...
```

### Product Management

```typescript
export async function fetchProducts(params?: { page?: number; size?: number; search?: string}): Promise<Page<ProductDto>> {
  // Implementation
}

export async function createProduct(productData: CreateProductRequest): Promise<ProductDto> {
  // Implementation
}

// Additional product management functions...
```

### Order Management

```typescript
export async function createOrder(orderData: CreateOrderRequest): Promise<OrderDto> {
  // Implementation
}

// Additional order management functions...
```

## Error Handling

The API client implements comprehensive error handling:

1. HTTP errors are caught and processed
2. Error messages are extracted from the response body when available
3. Specific error handling for different error formats (message, error, array of errors, Spring Boot validation errors)
4. Errors are thrown as JavaScript Error objects with descriptive messages

## Authentication

The API client supports token-based authentication:

```typescript
// Placeholder for authentication implementation
// 'Authorization': `Bearer ${getToken()}`,
```

In a complete implementation, this would include:

1. Token storage (localStorage, cookies, or memory)
2. Token refresh logic
3. Authentication state management
4. Login/logout functionality

## Usage Examples

### Fetching Data

```typescript
import { fetchProducts } from '@/lib/apiClient';

// In a React component
const [products, setProducts] = useState<ProductDto[]>([]);
const [isLoading, setIsLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  const loadProducts = async () => {
    try {
      setIsLoading(true);
      const result = await fetchProducts({ page: 0, size: 10 });
      setProducts(result.content);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  loadProducts();
}, []);
```

### Creating Data

```typescript
import { createProduct } from '@/lib/apiClient';

// In a form submit handler
const handleSubmit = async (data: CreateProductRequest) => {
  try {
    const newProduct = await createProduct(data);
    // Handle success
  } catch (err: any) {
    // Handle error
  }
};
```

## Best Practices

1. **Error Handling**: Always wrap API calls in try/catch blocks
2. **Loading States**: Implement loading states for better UX
3. **Type Safety**: Use the provided TypeScript interfaces
4. **Pagination**: Handle pagination for list endpoints
5. **Caching**: Consider implementing caching for frequently accessed data
6. **Debouncing**: Debounce search inputs to reduce API calls