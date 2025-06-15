# API Endpoints Reference

This document provides a comprehensive reference for all API endpoints used in the SwiftSale application. It includes endpoint URLs, request/response formats, and usage examples.

## Base URL

All API endpoints are relative to the base URL:

```
https://orca-app-k6zka.ondigitalocean.app/api/v2
```

In development environments, this can be configured via the `NEXT_PUBLIC_API_BASE_URL` environment variable.

## Authentication

Most endpoints require authentication. Authentication is handled via token-based authentication, with the token included in the `Authorization` header:

```
Authorization: Bearer <token>
```

## Common Response Formats

### Success Response

```json
{
  "data": { ... },  // Response data
  "message": "Operation successful"  // Optional success message
}
```

### Error Response

```json
{
  "error": "Error message",
  "details": { ... }  // Optional error details
}
```

### Paginated Response

```json
{
  "content": [ ... ],  // Array of items
  "totalPages": 10,    // Total number of pages
  "totalElements": 100, // Total number of items
  "size": 10,          // Items per page
  "number": 0,         // Current page number (0-based)
  "first": true,       // Whether this is the first page
  "last": false,       // Whether this is the last page
  "empty": false       // Whether the result is empty
}
```

## User Management

### Get Users

Retrieves a paginated list of users.

- **URL**: `/users`
- **Method**: `GET`
- **Query Parameters**:
  - `search` (optional): Search term for filtering users
  - `page` (optional): Page number (default: 0)
  - `size` (optional): Page size (default: 10)
- **Response**: Paginated list of `UserDto` objects

Example Request:
```
GET /users?search=john&page=0&size=10
```

Example Response:
```json
{
  "content": [
    {
      "id": "682dc27db7299d4a5a8d55a6",
      "name": "John Doe",
      "phone": "1234567890",
      "email": "john.doe@example.com",
      "addresses": [ ... ],
      "role": "CUSTOMER",
      "status": "ACTIVE",
      "businessMemberships": [ ... ],
      "createdAt": "2023-01-01T00:00:00Z",
      "updatedAt": "2023-01-01T00:00:00Z"
    },
    ...
  ],
  "totalPages": 5,
  "totalElements": 45,
  "size": 10,
  "number": 0,
  "first": true,
  "last": false,
  "empty": false
}
```

### Get User by ID

Retrieves a specific user by ID.

- **URL**: `/users/{userId}`
- **Method**: `GET`
- **Path Parameters**:
  - `userId`: The ID of the user to retrieve
- **Response**: `UserDto` object

Example Request:
```
GET /users/682dc27db7299d4a5a8d55a6
```

Example Response:
```json
{
  "id": "682dc27db7299d4a5a8d55a6",
  "name": "John Doe",
  "phone": "1234567890",
  "email": "john.doe@example.com",
  "addresses": [
    {
      "id": "682dc27db7299d4a5a8d55a7",
      "line1": "123 Main St",
      "line2": "Apt 4B",
      "city": "New York",
      "state": "New York",
      "stateCode": "36",
      "country": "USA",
      "postalCode": "10001",
      "type": "BILLING",
      "isDefault": true,
      "contactName": "John Doe",
      "contactPhone": "1234567890",
      "contactEmail": "john.doe@example.com"
    }
  ],
  "role": "CUSTOMER",
  "status": "ACTIVE",
  "businessMemberships": [ ... ],
  "createdAt": "2023-01-01T00:00:00Z",
  "updatedAt": "2023-01-01T00:00:00Z"
}
```

### Create User

Creates a new user.

- **URL**: `/users`
- **Method**: `POST`
- **Request Body**: `CreateUserRequest` object
- **Response**: Created `UserDto` object

Example Request:
```json
POST /users
{
  "name": "Jane Smith",
  "phone": "9876543210",
  "email": "jane.smith@example.com",
  "role": "CUSTOMER",
  "status": "ACTIVE",
  "addresses": [
    {
      "line1": "456 Oak St",
      "city": "Chicago",
      "state": "Illinois",
      "stateCode": "17",
      "country": "USA",
      "postalCode": "60601",
      "type": "BILLING",
      "isDefault": true
    }
  ]
}
```

Example Response:
```json
{
  "id": "682dc27db7299d4a5a8d55a8",
  "name": "Jane Smith",
  "phone": "9876543210",
  "email": "jane.smith@example.com",
  "addresses": [ ... ],
  "role": "CUSTOMER",
  "status": "ACTIVE",
  "createdAt": "2023-01-01T00:00:00Z",
  "updatedAt": "2023-01-01T00:00:00Z"
}
```

### Update User

Updates an existing user.

- **URL**: `/users/{userId}`
- **Method**: `PATCH`
- **Path Parameters**:
  - `userId`: The ID of the user to update
- **Request Body**: `UpdateUserRequest` object
- **Response**: Updated `UserDto` object

Example Request:
```json
PATCH /users/682dc27db7299d4a5a8d55a8
{
  "name": "Jane Smith-Johnson",
  "email": "jane.smith-johnson@example.com"
}
```

Example Response:
```json
{
  "id": "682dc27db7299d4a5a8d55a8",
  "name": "Jane Smith-Johnson",
  "phone": "9876543210",
  "email": "jane.smith-johnson@example.com",
  "addresses": [ ... ],
  "role": "CUSTOMER",
  "status": "ACTIVE",
  "createdAt": "2023-01-01T00:00:00Z",
  "updatedAt": "2023-01-02T00:00:00Z"
}
```

### Delete User

Deletes a user.

- **URL**: `/users/{userId}`
- **Method**: `DELETE`
- **Path Parameters**:
  - `userId`: The ID of the user to delete
- **Response**: No content (204)

Example Request:
```
DELETE /users/682dc27db7299d4a5a8d55a8
```

## Business Profile Management

### Get Business Profiles

Retrieves a paginated list of business profiles.

- **URL**: `/business-profiles`
- **Method**: `GET`
- **Query Parameters**:
  - `search` (optional): Search term for filtering business profiles
  - `status` (optional): Filter by status (ACTIVE, INACTIVE)
  - `page` (optional): Page number (default: 0)
  - `size` (optional): Page size (default: 10)
- **Response**: Paginated list of `BusinessProfileDto` objects

Example Request:
```
GET /business-profiles?search=acme&status=ACTIVE&page=0&size=10
```

### Get Business Profile by ID

Retrieves a specific business profile by ID.

- **URL**: `/business-profiles/{profileId}`
- **Method**: `GET`
- **Path Parameters**:
  - `profileId`: The ID of the business profile to retrieve
- **Response**: `BusinessProfileDto` object

### Create Business Profile

Creates a new business profile.

- **URL**: `/business-profiles`
- **Method**: `POST`
- **Query Parameters**:
  - `creatorUserId`: The ID of the user creating the business profile
- **Request Body**: `CreateBusinessProfileRequest` object
- **Response**: Created `BusinessProfileDto` object

### Update Business Profile

Updates an existing business profile.

- **URL**: `/business-profiles/{profileId}`
- **Method**: `PATCH`
- **Path Parameters**:
  - `profileId`: The ID of the business profile to update
- **Request Body**: `UpdateBusinessProfileRequest` object
- **Response**: Updated `BusinessProfileDto` object

### Delete Business Profile

Deletes a business profile.

- **URL**: `/business-profiles/{profileId}`
- **Method**: `DELETE`
- **Path Parameters**:
  - `profileId`: The ID of the business profile to delete
- **Response**: No content (204)

## Product Management

### Get Products

Retrieves a paginated list of products.

- **URL**: `/products`
- **Method**: `GET`
- **Query Parameters**:
  - `search` (optional): Search term for filtering products
  - `page` (optional): Page number (default: 0)
  - `size` (optional): Page size (default: 10)
- **Response**: Paginated list of `ProductDto` objects

### Get Product by ID

Retrieves a specific product by ID.

- **URL**: `/products/{id}`
- **Method**: `GET`
- **Path Parameters**:
  - `id`: The ID of the product to retrieve
- **Response**: `ProductDto` object

### Create Product

Creates a new product.

- **URL**: `/products`
- **Method**: `POST`
- **Request Body**: `CreateProductRequest` object
- **Response**: Created `ProductDto` object

Example Request:
```json
POST /products
{
  "name": "Wireless Mouse",
  "brand": "TechBrand",
  "hsnCode": "8471.60.00",
  "description": "High-performance wireless mouse",
  "gstTaxRate": 18,
  "category": "Electronics",
  "subCategory": "Computer Accessories",
  "colorVariant": ["Black", "White"],
  "sizeVariant": ["Standard"],
  "tags": ["wireless", "mouse", "computer"],
  "status": "ACTIVE"
}
```

### Update Product

Updates an existing product.

- **URL**: `/products/{id}`
- **Method**: `PUT`
- **Path Parameters**:
  - `id`: The ID of the product to update
- **Request Body**: `UpdateProductRequest` object
- **Response**: Updated `ProductDto` object

### Delete Product

Deletes a product.

- **URL**: `/products/{id}`
- **Method**: `DELETE`
- **Path Parameters**:
  - `id`: The ID of the product to delete
- **Response**: No content (204)

### Add Product Variants

Adds multiple variants to a product.

- **URL**: `/products/{productId}/variants`
- **Method**: `POST`
- **Path Parameters**:
  - `productId`: The ID of the product to add variants to
- **Request Body**: `AddProductVariantsRequest` object
- **Response**: Updated `ProductDto` object with new variants

### Update Product Variant

Updates a specific product variant.

- **URL**: `/products/{productId}/variants/{variantId}`
- **Method**: `PUT`
- **Path Parameters**:
  - `productId`: The ID of the product
  - `variantId`: The ID of the variant to update
- **Request Body**: `UpdateVariantRequest` object
- **Response**: Updated `ProductVariantDto` object

### Delete Product Variant

Deletes a specific product variant.

- **URL**: `/products/{productId}/variants/{variantId}`
- **Method**: `DELETE`
- **Path Parameters**:
  - `productId`: The ID of the product
  - `variantId`: The ID of the variant to delete
- **Response**: No content (204)

## Order Management

### Create Order

Creates a new order.

- **URL**: `/orders`
- **Method**: `POST`
- **Request Body**: `CreateOrderRequest` object
- **Response**: Created `OrderDto` object

Example Request:
```json
POST /orders
{
  "placedByUserId": "682dc27db7299d4a5a8d55a6",
  "customerDetails": {
    "userId": "682dc27db7299d4a5a8d55a6",
    "name": "John Doe",
    "phone": "1234567890",
    "email": "john.doe@example.com",
    "billingAddress": {
      "line1": "123 Main St",
      "city": "New York",
      "state": "New York",
      "stateCode": "36",
      "country": "USA",
      "postalCode": "10001",
      "type": "BILLING",
      "isDefault": true
    },
    "shippingAddress": {
      "line1": "123 Main St",
      "city": "New York",
      "state": "New York",
      "stateCode": "36",
      "country": "USA",
      "postalCode": "10001",
      "type": "SHIPPING",
      "isDefault": true
    },
    "stateCode": "36"
  },
  "items": [
    {
      "productId": "682dc27db7299d4a5a8d55a9",
      "variantId": "682dc27db7299d4a5a8d55aa",
      "size": "Standard",
      "color": "Black",
      "quantity": 2,
      "unitPrice": 1000.00,
      "discountRate": 10,
      "discountAmount": 200.00,
      "taxableAmount": 1800.00,
      "gstTaxRate": 18,
      "gst": {
        "iGstRate": 18,
        "iGstAmount": 324.00,
        "cGstRate": 0,
        "cGstAmount": 0,
        "sGstRate": 0,
        "sGstAmount": 0
      },
      "totalAmount": 2124.00
    }
  ],
  "paymentMethod": "PENDING",
  "status": "PENDING",
  "notes": "Please deliver during business hours"
}
```

### Generate Invoice

Generates an invoice for an order.

- **URL**: `/invoices/generate`
- **Method**: `POST`
- **Request Body**: `GenerateInvoiceRequest` object
- **Response**: `InvoiceDto` object

Example Request:
```json
POST /invoices/generate
{
  "orderId": "682dc27db7299d4a5a8d55ab"
}
```

### Download Invoice PDF

Downloads the PDF invoice for an order.

- **URL**: `/invoices/by-order/{orderId}/pdf`
- **Method**: `GET`
- **Path Parameters**:
  - `orderId`: The ID of the order
- **Response**: PDF file

## Meta Endpoints

### Get Product Brands

Retrieves all product brands.

- **URL**: `/meta/product/brands`
- **Method**: `GET`
- **Response**: Array of `Brand` objects

### Create Product Brand

Creates a new product brand.

- **URL**: `/meta/product/brands`
- **Method**: `POST`
- **Request Body**: Brand object without ID
- **Response**: Created `Brand` object

### Get Product Categories Tree

Retrieves the product category hierarchy.

- **URL**: `/meta/product/categories/tree`
- **Method**: `GET`
- **Response**: Array of `ProductCategoryNode` objects with nested children

### Get Product Categories Flat

Retrieves all product categories as a flat list.

- **URL**: `/meta/product/categories`
- **Method**: `GET`
- **Response**: Array of `Category` objects

### Create Product Category

Creates a new product category.

- **URL**: `/meta/product/categories`
- **Method**: `POST`
- **Request Body**: `CreateCategoryRequest` object
- **Response**: Created `Category` object

### Get Order Statuses

Retrieves all available order statuses.

- **URL**: `/meta/order/statuses`
- **Method**: `GET`
- **Response**: Array of status strings

### Get Payment Types

Retrieves all available payment types.

- **URL**: `/meta/order/payment-types`
- **Method**: `GET`
- **Response**: Array of payment type strings

## Error Codes

| Status Code | Description |
|-------------|-------------|
| 400 | Bad Request - The request was malformed or contains invalid parameters |
| 401 | Unauthorized - Authentication is required or failed |
| 403 | Forbidden - The authenticated user does not have permission to access the resource |
| 404 | Not Found - The requested resource was not found |
| 409 | Conflict - The request conflicts with the current state of the resource |
| 422 | Unprocessable Entity - The request was well-formed but contains semantic errors |
| 500 | Internal Server Error - An unexpected error occurred on the server |

## Rate Limiting

The API implements rate limiting to prevent abuse. The current limits are:

- 100 requests per minute per IP address
- 1000 requests per hour per IP address

When a rate limit is exceeded, the API will return a 429 Too Many Requests response.