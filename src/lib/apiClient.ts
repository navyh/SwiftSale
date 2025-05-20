
// src/lib/apiClient.ts
"use client"; // To be used in client components

const API_BASE_URL = 'https://orca-app-k6zka.ondigitalocean.app/api/v2'; // Updated to v2

export interface Category {
  id: number;
  name: string;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Brand {
  id: number;
  name: string;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Supplier {
  id: number;
  name: string;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface MetaItem {
  id: number;
  name: string;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface MetaColorItem extends MetaItem {
  hexCode?: string | null;
}

export interface Product {
  id: number;
  name: string;
  description?: string | null;
  sku?: string | null;
  barcode?: string | null;
  quantity: number;
  unitPrice: number;
  costPrice?: number | null;
  category?: Category | null;
  brand?: Brand | null;
  supplier?: Supplier | null;
  imageUrls?: string[] | null;
  tags?: string[] | null;
  status?: 'ACTIVE' | 'DRAFT' | 'ARCHIVED' | 'OUT_OF_STOCK' | null;
  weight?: number | null;
  dimensions?: string | null;
  isFeatured?: boolean | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  createdAt: string;
  updatedAt: string;
  // productAttributes - not handled in this iteration for simplicity
}

export interface CreateProductRequest {
  name: string;
  description?: string | null;
  sku?: string | null;
  barcode?: string | null;
  quantity: number;
  unitPrice: number;
  costPrice?: number | null;
  categoryId?: number | null;
  brandId?: number | null;
  supplierId?: number | null;
  imageUrls?: string[] | null;
  tags?: string[] | null;
  status?: 'ACTIVE' | 'DRAFT' | 'ARCHIVED' | 'OUT_OF_STOCK' | null;
  weight?: number | null;
  dimensions?: string | null;
  isFeatured?: boolean | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
}

// Helper function for API calls
async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      // Add Authorization header if/when auth is implemented
      // 'Authorization': `Bearer ${getToken()}`, 
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
        // Handle validation errors which might be an array
        errorMessage = errorData.map((err: any) => err.message || `${err.field}: ${err.defaultMessage}`).join(', ');
      }
    } catch (e) {
      // Ignore if error response is not JSON or doesn't fit expected structures
    }
    throw new Error(errorMessage);
  }
  if (response.status === 204) { // No Content
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

// Product endpoints
export async function fetchProducts(): Promise<Product[]> {
  return fetchAPI<Product[]>('/products');
}

export async function fetchProductById(id: number): Promise<Product> {
  return fetchAPI<Product>(`/products/${id}`);
}

export async function createProduct(productData: CreateProductRequest): Promise<Product> {
  return fetchAPI<Product>('/products', {
    method: 'POST',
    body: JSON.stringify(productData),
  });
}

export async function updateProduct(id: number, productData: Partial<CreateProductRequest>): Promise<Product> {
  return fetchAPI<Product>(`/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(productData),
  });
}

export async function deleteProduct(id: number): Promise<void> {
  return fetchAPI<void>(`/products/${id}`, {
    method: 'DELETE',
  });
}

// Meta endpoints
export async function fetchCategories(): Promise<Category[]> {
  return fetchAPI<Category[]>('/meta/categories');
}

export async function fetchBrands(): Promise<Brand[]> {
  return fetchAPI<Brand[]>('/meta/brands');
}

export async function fetchSuppliers(): Promise<Supplier[]> {
  return fetchAPI<Supplier[]>('/meta/suppliers');
}

export async function fetchProductStatuses(): Promise<string[]> {
  const response = await fetchAPI<{ name: string }[]>('/meta/product-statuses');
  return response.map(status => status.name);
}

export async function fetchSizes(): Promise<MetaItem[]> {
  return fetchAPI<MetaItem[]>('/meta/sizes');
}

export async function fetchUnits(): Promise<MetaItem[]> {
  return fetchAPI<MetaItem[]>('/meta/units');
}

export async function fetchColors(): Promise<MetaColorItem[]> {
  return fetchAPI<MetaColorItem[]>('/meta/colors');
}


// Placeholder for Order related API calls
export interface Order {
  id: string; // Assuming string based on mock, confirm from API
  customer: string; // This might be a customer object or ID
  date: string;
  total: string; // This should ideally be a number
  status: string;
  items: number;
}
export async function fetchOrders(): Promise<Order[]> {
  // TODO: Replace with actual API call: return fetchAPI<Order[]>('/orders');
  console.warn("fetchOrders is using mock data. Implement API call.");
  return Promise.resolve([
    { id: "ORD001", customer: "Alice Wonderland", date: "2024-07-20", total: "$125.50", status: "Processing", items: 3 },
    { id: "ORD002", customer: "Bob The Builder", date: "2024-07-19", total: "$89.99", status: "Shipped", items: 2 },
  ]);
}

// Placeholder for Procurement related API calls
export interface Procurement {
 id: string;
 vendor: string;
 date: string;
 totalAmount: string; // Ideally number
 status: string;
 items: number;
 invoice: string | null;
}
export async function fetchProcurements(): Promise<Procurement[]> {
  // TODO: Replace with actual API call: return fetchAPI<Procurement[]>('/procurements');
  console.warn("fetchProcurements is using mock data. Implement API call.");
  return Promise.resolve([
    { id: "PROC001", vendor: "Tech Supplies Inc.", date: "2024-07-15", totalAmount: "$1,500.00", status: "Paid", items: 10, invoice: "INV-TS001.pdf" },
  ]);
}

// Placeholder for User/Staff related API calls
export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  avatar?: string;
}
export async function fetchUsers(): Promise<User[]> {
 // TODO: Replace with actual API call: return fetchAPI<User[]>('/users'); // Or /staff
  console.warn("fetchUsers is using mock data. Implement API call.");
  return Promise.resolve([
    { id: "USR001", name: "John Admin", email: "john.admin@example.com", role: "Admin", status: "Active", avatar: "https://placehold.co/40x40.png?text=JA" },
  ]);
}

// Generic function to create Meta items (Brands, Categories, etc.)
export async function createMetaItem(metaType: 'brands' | 'categories' | 'suppliers' | 'sizes' | 'units' | 'colors', data: { name: string; description?: string; hexCode?: string }): Promise<MetaItem | MetaColorItem> {
  return fetchAPI<MetaItem | MetaColorItem>(`/meta/${metaType}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// Generic function to update Meta items
export async function updateMetaItem(metaType: 'brands' | 'categories' | 'suppliers' | 'sizes' | 'units' | 'colors', id: number, data: { name: string; description?: string; hexCode?: string }): Promise<MetaItem | MetaColorItem> {
  return fetchAPI<MetaItem | MetaColorItem>(`/meta/${metaType}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// Generic function to delete Meta items
export async function deleteMetaItem(metaType: 'brands' | 'categories' | 'suppliers' | 'sizes' | 'units' | 'colors', id: number): Promise<void> {
  return fetchAPI<void>(`/meta/${metaType}/${id}`, {
    method: 'DELETE',
  });
}

