
// src/lib/apiClient.ts
"use client"; // To be used in client components

const API_BASE_URL = 'https://orca-app-k6zka.ondigitalocean.app/api/v2';

export interface Category {
  id: number;
  name: string;
  description?: string | null;
  parentId?: number | null;
  children?: Category[]; // For tree structure
  createdAt?: string;
  updatedAt?: string;
}

// For /meta/product/categories/tree
export interface ProductCategoryNode {
  id: number;
  name: string;
  description?: string | null;
  parentId?: number | null;
  children?: ProductCategoryNode[];
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

export interface MetaItem { // Used for Sizes, Units, (and as base for others)
  id: number;
  name: string;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface MetaColorItem extends MetaItem {
  hexCode?: string | null;
}

export interface ProductUnit extends MetaItem {}

export interface OrderStatus extends MetaItem {}

export interface PaymentType extends MetaItem {}

export interface InventoryAdjustmentReason extends MetaItem {}

export interface UserRole extends MetaItem {
  permissions?: string[]; // Example, adjust based on actual API
}

export interface NotificationTemplate {
  id: number;
  name: string;
  subject: string;
  body: string;
  type: string; // e.g., 'EMAIL', 'SMS'
  createdAt?: string;
  updatedAt?: string;
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
  
  categoryId?: number | null;
  brandId?: number | null;
  supplierId?: number | null;
  unitId?: number | null; // Assuming product might have a unit

  category?: Category | null;
  brand?: Brand | null;
  supplier?: Supplier | null;
  unit?: ProductUnit | null;
  
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
  unitId?: number | null;
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
        errorMessage = errorData.map((err: any) => err.message || `${err.field}: ${err.defaultMessage}`).join(', ');
      }
    } catch (e) {
      // Ignore
    }
    throw new Error(errorMessage);
  }
  if (response.status === 204) {
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
    method: 'PUT', // Or PATCH if API supports partial updates
    body: JSON.stringify(productData),
  });
}

export async function deleteProduct(id: number): Promise<void> {
  return fetchAPI<void>(`/products/${id}`, {
    method: 'DELETE',
  });
}

// V2 Meta endpoints
export async function fetchProductBrands(): Promise<Brand[]> {
  return fetchAPI<Brand[]>('/meta/product/brands');
}
export async function createProductBrand(data: Omit<Brand, 'id' | 'createdAt' | 'updatedAt'>): Promise<Brand> {
  return fetchAPI<Brand>('/meta/product/brands', { method: 'POST', body: JSON.stringify(data) });
}
export async function updateProductBrand(id: number, data: Partial<Omit<Brand, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Brand> {
  return fetchAPI<Brand>(`/meta/product/brands/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}
export async function deleteProductBrand(id: number): Promise<void> {
  return fetchAPI<void>(`/meta/product/brands/${id}`, { method: 'DELETE' });
}

export async function fetchProductCategoriesTree(): Promise<ProductCategoryNode[]> {
  return fetchAPI<ProductCategoryNode[]>('/meta/product/categories/tree');
}
// Assuming flat CRUD endpoints for categories for management in settings
export async function fetchProductCategoriesFlat(): Promise<Category[]> { // For settings page if needed
  return fetchAPI<Category[]>('/meta/product/categories');
}
export async function createProductCategory(data: Omit<Category, 'id' | 'children' | 'createdAt' | 'updatedAt'>): Promise<Category> {
  return fetchAPI<Category>('/meta/product/categories', { method: 'POST', body: JSON.stringify(data) });
}
export async function updateProductCategory(id: number, data: Partial<Omit<Category, 'id' | 'children' | 'createdAt' | 'updatedAt'>>): Promise<Category> {
  return fetchAPI<Category>(`/meta/product/categories/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}
export async function deleteProductCategory(id: number): Promise<void> {
  return fetchAPI<void>(`/meta/product/categories/${id}`, { method: 'DELETE' });
}


export async function fetchProductUnits(): Promise<ProductUnit[]> {
  return fetchAPI<ProductUnit[]>('/meta/product/units');
}
export async function createProductUnit(data: Omit<ProductUnit, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProductUnit> {
  return fetchAPI<ProductUnit>('/meta/product/units', { method: 'POST', body: JSON.stringify(data) });
}
export async function updateProductUnit(id: number, data: Partial<Omit<ProductUnit, 'id' | 'createdAt' | 'updatedAt'>>): Promise<ProductUnit> {
  return fetchAPI<ProductUnit>(`/meta/product/units/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}
export async function deleteProductUnit(id: number): Promise<void> {
  return fetchAPI<void>(`/meta/product/units/${id}`, { method: 'DELETE' });
}


export async function fetchOrderStatuses(): Promise<OrderStatus[]> {
  return fetchAPI<OrderStatus[]>('/meta/order/statuses');
}

export async function fetchPaymentTypes(): Promise<PaymentType[]> {
  return fetchAPI<PaymentType[]>('/meta/order/payment-types');
}

export async function fetchInventoryAdjustmentReasons(): Promise<InventoryAdjustmentReason[]> {
  return fetchAPI<InventoryAdjustmentReason[]>('/meta/inventory/adjustment-reasons');
}

export async function fetchUserRoles(): Promise<UserRole[]> {
  return fetchAPI<UserRole[]>('/meta/user/roles');
}

export async function fetchNotificationTemplates(): Promise<NotificationTemplate[]> {
  return fetchAPI<NotificationTemplate[]>('/meta/notification/templates');
}
export async function createNotificationTemplate(data: Omit<NotificationTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<NotificationTemplate> {
  return fetchAPI<NotificationTemplate>('/meta/notification/templates', { method: 'POST', body: JSON.stringify(data) });
}
export async function updateNotificationTemplate(id: number, data: Partial<Omit<NotificationTemplate, 'id' | 'createdAt' | 'updatedAt'>>): Promise<NotificationTemplate> {
  return fetchAPI<NotificationTemplate>(`/meta/notification/templates/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}
export async function deleteNotificationTemplate(id: number): Promise<void> {
  return fetchAPI<void>(`/meta/notification/templates/${id}`, { method: 'DELETE' });
}


// Legacy Meta endpoints (Sizes, Colors, Suppliers - kept if not in V2 meta list)
export async function fetchSuppliers(): Promise<Supplier[]> {
  return fetchAPI<Supplier[]>('/meta/suppliers');
}

export async function fetchProductStatuses(): Promise<string[]> {
  const response = await fetchAPI<{ name: string }[]>('/meta/product-statuses'); // Assuming this path is still v1/v2 compatible or a specific product status endpoint for v2
  return response.map(status => status.name);
}

export async function fetchSizes(): Promise<MetaItem[]> {
  return fetchAPI<MetaItem[]>('/meta/sizes');
}

export async function fetchColors(): Promise<MetaColorItem[]> {
  return fetchAPI<MetaColorItem[]>('/meta/colors');
}

// Generic Meta CRUD (still used by Sizes, Colors, Suppliers on settings page)
type GenericMetaType = 'sizes' | 'colors' | 'suppliers'; // Limited to those not having specific CRUD above

export async function createGenericMetaItem(metaType: GenericMetaType, data: Partial<MetaItem & MetaColorItem>): Promise<MetaItem | MetaColorItem> {
  return fetchAPI<MetaItem | MetaColorItem>(`/meta/${metaType}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateGenericMetaItem(metaType: GenericMetaType, id: number, data: Partial<MetaItem & MetaColorItem>): Promise<MetaItem | MetaColorItem> {
  return fetchAPI<MetaItem | MetaColorItem>(`/meta/${metaType}/${id}`, {
    method: 'PUT', // Or PATCH
    body: JSON.stringify(data),
  });
}

export async function deleteGenericMetaItem(metaType: GenericMetaType, id: number): Promise<void> {
  return fetchAPI<void>(`/meta/${metaType}/${id}`, {
    method: 'DELETE',
  });
}


// --- Functions to be removed or refactored if their specific counterparts are now used everywhere ---
// The old fetchCategories and fetchBrands are effectively replaced by fetchProductBrands and fetchProductCategoriesTree/Flat
// export async function fetchCategories(): Promise<Category[]> {
// return fetchAPI<Category[]>('/meta/categories');
// }
// export async function fetchBrands(): Promise<Brand[]> {
// return fetchAPI<Brand[]>('/meta/brands');
// }
// The generic createMetaItem, updateMetaItem, deleteMetaItem are now createGenericMetaItem, etc.
// And specific ones like createProductBrand are added.

// Placeholder for Order related API calls
export interface Order {
  id: string;
  customer: string; 
  date: string;
  total: string; 
  status: string;
  items: number;
}
export async function fetchOrders(): Promise<Order[]> {
  console.warn("fetchOrders is using mock data. Implement API call.");
  return Promise.resolve([
    { id: "ORD001", customer: "Alice Wonderland", date: "2024-07-20", total: "$125.50", status: "Processing", items: 3 },
  ]);
}

// Placeholder for Procurement related API calls
export interface Procurement {
 id: string;
 vendor: string;
 date: string;
 totalAmount: string;
 status: string;
 items: number;
 invoice: string | null;
}
export async function fetchProcurements(): Promise<Procurement[]> {
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
  console.warn("fetchUsers is using mock data. Implement API call.");
  return Promise.resolve([
    { id: "USR001", name: "John Admin", email: "john.admin@example.com", role: "Admin", status: "Active", avatar: "https://placehold.co/40x40.png?text=JA" },
  ]);
}

    