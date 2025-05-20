
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

export interface ProductUnit extends MetaItem {}
export interface OrderStatus extends MetaItem {}
export interface PaymentType extends MetaItem {}
export interface InventoryAdjustmentReason extends MetaItem {}
export interface UserRole extends MetaItem {
  permissions?: string[];
}

export interface NotificationTemplate {
  id: number;
  name: string;
  subject: string;
  body: string;
  type: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductVariant {
  id: number;
  productId: number;
  sku?: string | null;
  price?: number | null;
  compareAtPrice?: number | null;
  costPrice?: number | null;
  quantity: number;
  barcode?: string | null;
  colorValue?: string | null;
  sizeValue?: string | null;
  imageUrls?: string[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: number;
  name: string;
  description?: string | null;
  sku?: string | null; // Base product SKU
  barcode?: string | null; // Base product barcode
  quantity: number; // Total quantity, might be sum of variants
  unitPrice: number; // Base product unit price (might be deprecated if variants handle all pricing)
  costPrice?: number | null; // Base product cost price

  categoryId?: number | null;
  brandId?: number | null;
  supplierId?: number | null;
  unitId?: number | null;

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
  variants?: ProductVariant[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface VariantDefinitionDTO {
  colorValue: string;
  sizeValue: string;
  // Potentially other defining attributes like SKU, price for initial generation
  sku?: string | null;
  price?: number | null;
  quantity?: number;
}

export interface CreateProductRequest {
  name: string;
  description?: string | null;
  sku?: string | null;
  barcode?: string | null;
  quantity: number; // This might be overall or ignored if variants define it
  unitPrice: number; // This might be overall or ignored if variants define it
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
  variantDefinitions?: VariantDefinitionDTO[] | null; // For generating variants
}

export interface UpdateProductRequest extends Partial<Omit<CreateProductRequest, 'variantDefinitions'>> {
  // variantDefinitions can also be part of update to generate new variants
  variantDefinitions?: VariantDefinitionDTO[] | null;
}


export interface AddVariantRequest { // For POST /products/{productId}/variants
  sku: string;
  price?: number | null;
  compareAtPrice?: number | null;
  costPrice?: number | null;
  quantity: number;
  barcode?: string | null;
  colorValue?: string | null;
  sizeValue?: string | null;
  imageUrls?: string[] | null;
}

export interface UpdateVariantRequest { // For PATCH /products/{productId}/variants/{variantId}
  sku?: string | null;
  price?: number | null;
  compareAtPrice?: number | null;
  costPrice?: number | null;
  quantity?: number;
  barcode?: string | null;
  imageUrls?: string[] | null;
  // colorValue and sizeValue are usually not updatable on an existing variant, but for completeness:
  colorValue?: string | null;
  sizeValue?: string | null;
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
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

// Product endpoints
export async function fetchProducts(): Promise<Product[]> {
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

export async function updateProduct(id: number, productData: UpdateProductRequest): Promise<Product> {
  return fetchAPI<Product>(`/products/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(productData),
  });
}

export async function deleteProduct(id: number): Promise<void> {
  return fetchAPI<void>(`/products/${id}`, {
    method: 'DELETE',
  });
}

// Product Variant Endpoints
export async function addProductVariant(productId: number, variantData: AddVariantRequest): Promise<ProductVariant> {
  return fetchAPI<ProductVariant>(`/products/${productId}/variants`, {
    method: 'POST',
    body: JSON.stringify(variantData),
  });
}

export async function updateProductVariant(productId: number, variantId: number, variantData: UpdateVariantRequest): Promise<ProductVariant> {
  return fetchAPI<ProductVariant>(`/products/${productId}/variants/${variantId}`, {
    method: 'PATCH',
    body: JSON.stringify(variantData),
  });
}

export async function deleteProductVariant(productId: number, variantId: number): Promise<void> {
  return fetchAPI<void>(`/products/${productId}/variants/${variantId}`, {
    method: 'DELETE',
  });
}


// V2 Meta endpoints (Only GET for now as per user instruction to skip meta API usage for CRUD forms)
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

// Meta endpoints that were not in the V2 list, keeping generic handlers for Settings page
export async function fetchSuppliers(): Promise<Supplier[]> { // This was used by product form, but now product form hardcodes. Settings page might still use it.
  const data = await fetchAPI<Supplier[] | undefined>('/meta/suppliers');
  return Array.isArray(data) ? data : [];
}

export async function fetchProductStatuses(): Promise<string[]> { // Used by product form (hardcoded now) and product list page
  const response = await fetchAPI<string[] | undefined>('/meta/product-statuses');
  return Array.isArray(response) ? response : [];
}

export async function fetchSizes(): Promise<MetaItem[]> { // Used by Settings page
  const data = await fetchAPI<MetaItem[] | undefined>('/meta/sizes');
  return Array.isArray(data) ? data : [];
}

export async function fetchColors(): Promise<MetaColorItem[]> { // Used by Settings page
  const data = await fetchAPI<MetaColorItem[] | undefined>('/meta/colors');
  return Array.isArray(data) ? data : [];
}

type GenericMetaType = 'sizes' | 'colors' | 'suppliers';

export async function createGenericMetaItem(metaType: GenericMetaType, data: Partial<MetaItem & MetaColorItem>): Promise<MetaItem | MetaColorItem> {
  return fetchAPI<MetaItem | MetaColorItem>(`/meta/${metaType}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateGenericMetaItem(metaType: GenericMetaType, id: number, data: Partial<MetaItem & MetaColorItem>): Promise<MetaItem | MetaColorItem> {
  return fetchAPI<MetaItem | MetaColorItem>(`/meta/${metaType}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteGenericMetaItem(metaType: GenericMetaType, id: number): Promise<void> {
  return fetchAPI<void>(`/meta/${metaType}/${id}`, {
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

// User Management APIs
export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  role?: string; // Or UserRole object
  status?: string; // e.g. ACTIVE, INACTIVE, PENDING
  createdAt: string;
  updatedAt: string;
  // Potentially other fields like avatarUrl, lastLogin
}

export interface CurrentUser extends User {
  // any specific fields for /users/me
}

export interface UserUpdateRequest {
  firstName?: string;
  lastName?: string;
  email?: string; // Usually not updatable or requires verification
  phone?: string | null;
  // password?: string; // Handle password changes separately
  role?: string;
  status?: string;
}

export interface BusinessProfile {
  id: number;
  name: string;
  registrationNumber?: string | null;
  vatNumber?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  userId: number; // Owner
  createdAt: string;
  updatedAt: string;
}

export interface BusinessProfileCreateRequest {
  name: string;
  registrationNumber?: string | null;
  vatNumber?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
}

export interface BusinessProfileUpdateRequest extends Partial<BusinessProfileCreateRequest> {}


export async function fetchCurrentUser(): Promise<CurrentUser> {
  return fetchAPI<CurrentUser>('/users/me');
}

export async function updateCurrentUser(data: UserUpdateRequest): Promise<CurrentUser> {
  return fetchAPI<CurrentUser>('/users/me', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function fetchUsers(queryParams?: Record<string, string>): Promise<User[]> {
  const queryString = queryParams ? `?${new URLSearchParams(queryParams).toString()}` : '';
  const usersData = await fetchAPI<User[] | undefined>(`/users${queryString}`);
  return Array.isArray(usersData) ? usersData : [];
}

export async function updateUser(userId: number, data: UserUpdateRequest): Promise<User> {
  return fetchAPI<User>(`/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function fetchBusinessProfiles(): Promise<BusinessProfile[]> {
  const profilesData = await fetchAPI<BusinessProfile[] | undefined>('/business-profiles');
  return Array.isArray(profilesData) ? profilesData : [];
}

export async function createBusinessProfile(data: BusinessProfileCreateRequest): Promise<BusinessProfile> {
  return fetchAPI<BusinessProfile>('/business-profiles', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function fetchBusinessProfileById(id: number): Promise<BusinessProfile> {
    return fetchAPI<BusinessProfile>(`/business-profiles/${id}`);
}

export async function updateBusinessProfile(profileId: number, data: BusinessProfileUpdateRequest): Promise<BusinessProfile> {
  return fetchAPI<BusinessProfile>(`/business-profiles/${profileId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteBusinessProfile(profileId: number): Promise<void> {
    return fetchAPI<void>(`/business-profiles/${profileId}`, { method: 'DELETE' });
}
