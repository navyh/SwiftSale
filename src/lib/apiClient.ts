
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
  
  // Fields as IDs (common in list responses)
  categoryId?: number | null;
  brandId?: number | null;
  supplierId?: number | null;
  unitId?: number | null; 

  // Fields as nested objects (common in single item responses or detailed views)
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
      // Ignore if parsing errorData itself fails
    }
    throw new Error(errorMessage);
  }
  if (response.status === 204) { // No Content
    return undefined as T; // Return undefined for 204, let caller handle it
  }
  return response.json() as Promise<T>;
}

// Product endpoints
export async function fetchProducts(): Promise<Product[]> {
  // Ensure that even if fetchAPI returns undefined (e.g., from a 204 response) or non-array,
  // this function always resolves to an array.
  const productsData = await fetchAPI<Product[] | undefined>('/products');
  return Array.isArray(productsData) ? productsData : [];
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
  const data = await fetchAPI<Brand[] | undefined>('/meta/product/brands');
  return Array.isArray(data) ? data : [];
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
  const data = await fetchAPI<ProductCategoryNode[] | undefined>('/meta/product/categories/tree');
  return Array.isArray(data) ? data : [];
}
export async function fetchProductCategoriesFlat(): Promise<Category[]> { 
  const data = await fetchAPI<Category[] | undefined>('/meta/product/categories');
  return Array.isArray(data) ? data : [];
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
  const data = await fetchAPI<ProductUnit[] | undefined>('/meta/product/units');
  return Array.isArray(data) ? data : [];
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
  const data = await fetchAPI<OrderStatus[] | undefined>('/meta/order/statuses');
  return Array.isArray(data) ? data : [];
}

export async function fetchPaymentTypes(): Promise<PaymentType[]> {
  const data = await fetchAPI<PaymentType[] | undefined>('/meta/order/payment-types');
  return Array.isArray(data) ? data : [];
}

export async function fetchInventoryAdjustmentReasons(): Promise<InventoryAdjustmentReason[]> {
  const data = await fetchAPI<InventoryAdjustmentReason[] | undefined>('/meta/inventory/adjustment-reasons');
  return Array.isArray(data) ? data : [];
}

export async function fetchUserRoles(): Promise<UserRole[]> {
  const data = await fetchAPI<UserRole[] | undefined>('/meta/user/roles');
  return Array.isArray(data) ? data : [];
}

export async function fetchNotificationTemplates(): Promise<NotificationTemplate[]> {
  const data = await fetchAPI<NotificationTemplate[] | undefined>('/meta/notification/templates');
  return Array.isArray(data) ? data : [];
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
  const data = await fetchAPI<Supplier[] | undefined>('/meta/suppliers'); // Assuming this is still a v1/v2 path or needs update
  return Array.isArray(data) ? data : [];
}

export async function fetchProductStatuses(): Promise<string[]> {
  // Assuming this endpoint returns an array of objects like { name: "ACTIVE" }
  // If it returns an array of strings directly, this map is not needed.
  // The API docs (https://orca-app-k6zka.ondigitalocean.app/api-docs -> /meta/product-statuses)
  // suggest it returns ListOfStringResponse, which implies string[].
  // However, if it's like other meta items (object with name), the map would be needed.
  // For now, assuming it returns string[] directly as per ListOfStringResponse.
  const response = await fetchAPI<string[] | undefined>('/meta/product-statuses');
  return Array.isArray(response) ? response : [];
}


export async function fetchSizes(): Promise<MetaItem[]> {
  const data = await fetchAPI<MetaItem[] | undefined>('/meta/sizes');
  return Array.isArray(data) ? data : [];
}

export async function fetchColors(): Promise<MetaColorItem[]> {
  const data = await fetchAPI<MetaColorItem[] | undefined>('/meta/colors');
  return Array.isArray(data) ? data : [];
}

// Generic Meta CRUD (still used by Sizes, Colors, Suppliers on settings page)
type GenericMetaType = 'sizes' | 'colors' | 'suppliers'; // Limited to those not having specific CRUD above

export async function createGenericMetaItem(metaType: GenericMetaType, data: Partial<MetaItem & MetaColorItem>): Promise<MetaItem | MetaColorItem> {
  return fetchAPI<MetaItem | MetaColorItem>(`/meta/${metaType}`, { // Assuming generic path structure
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateGenericMetaItem(metaType: GenericMetaType, id: number, data: Partial<MetaItem & MetaColorItem>): Promise<MetaItem | MetaColorItem> {
  return fetchAPI<MetaItem | MetaColorItem>(`/meta/${metaType}/${id}`, { // Assuming generic path structure
    method: 'PATCH', // Using PATCH for partial updates
    body: JSON.stringify(data),
  });
}

export async function deleteGenericMetaItem(metaType: GenericMetaType, id: number): Promise<void> {
  return fetchAPI<void>(`/meta/${metaType}/${id}`, { // Assuming generic path structure
    method: 'DELETE',
  });
}


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
  // Example of ensuring array return for future implementation:
  // const data = await fetchAPI<Order[] | undefined>('/orders');
  // return Array.isArray(data) ? data : [];
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
  // const data = await fetchAPI<Procurement[] | undefined>('/procurements');
  // return Array.isArray(data) ? data : [];
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
  // const data = await fetchAPI<User[] | undefined>('/users');
  // return Array.isArray(data) ? data : [];
  return Promise.resolve([
    { id: "USR001", name: "John Admin", email: "john.admin@example.com", role: "Admin", status: "Active", avatar: "https://placehold.co/40x40.png?text=JA" },
  ]);
}

    
