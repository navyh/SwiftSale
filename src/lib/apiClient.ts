// src/lib/apiClient.ts
"use client"; // To be used in client components

const API_BASE_URL = 'https://orca-app-k6zka.ondigitalocean.app/api/v2';

// Helper function for API calls
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

// === GENERIC INTERFACES ===
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

export interface AddressDto {
  id: number;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  type?: 'SHIPPING' | 'BILLING' | string | null;
  isDefault: boolean;
}

export interface AddressCreateDto {
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  type?: 'SHIPPING' | 'BILLING' | string | null;
  isDefault?: boolean | null;
}

// === USER MANAGEMENT ===
export interface UserDto {
  id: number;
  name: string;
  phone: string;
  email?: string | null;
  type: 'B2C' | 'B2B' | string;
  gstin?: string | null;
  addresses?: AddressDto[] | null;
  status?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateUserRequest {
  name: string;
  phone: string;
  email?: string | null;
  password?: string | null; // Should be handled securely
  type: 'B2C' | 'B2B' | string;
  gstin?: string | null; // Required if type is B2B
  addresses?: AddressCreateDto[] | null;
}

export interface UpdateUserRequest {
  name?: string;
  phone?: string;
  email?: string | null;
  type?: 'B2C' | 'B2B' | string;
  gstin?: string | null;
  addresses?: (AddressCreateDto | AddressDto)[] | null; // Can send full AddressDto for updates if API supports it or only AddressCreateDto
  status?: string | null;
}

export async function fetchUsers(params?: { type?: string; search?: string; page?: number; size?: number }): Promise<Page<UserDto>> {
  const queryParams = new URLSearchParams();
  if (params?.type) queryParams.append('type', params.type);
  if (params?.search) queryParams.append('search', params.search); // Assuming backend supports generic search
  if (params?.page !== undefined) queryParams.append('page', params.page.toString());
  if (params?.size !== undefined) queryParams.append('size', params.size.toString());
  
  const queryString = queryParams.toString();
  return fetchAPI<Page<UserDto>>(`/users${queryString ? `?${queryString}` : ''}`);
}

export async function fetchUserById(userId: number): Promise<UserDto> {
  return fetchAPI<UserDto>(`/users/${userId}`);
}

export async function createUser(userData: CreateUserRequest): Promise<UserDto> {
  return fetchAPI<UserDto>('/users', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
}

export async function updateUser(userId: number, userData: UpdateUserRequest): Promise<UserDto> {
  return fetchAPI<UserDto>(`/users/${userId}`, {
    method: 'PUT', // As per spec
    body: JSON.stringify(userData),
  });
}

export async function deleteUser(userId: number): Promise<void> {
  return fetchAPI<void>(`/users/${userId}`, {
    method: 'DELETE',
  }, false);
}


// === BUSINESS PROFILE MANAGEMENT ===
export interface BusinessProfileDto {
  id: number;
  name: string;
  gstin: string;
  status: 'ACTIVE' | 'INACTIVE' | string;
  paymentTerms?: string | null;
  addresses?: AddressDto[] | null;
  userIds?: number[] | null; // Array of User IDs
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateBusinessProfileRequest {
  name: string;
  gstin: string;
  addresses?: AddressCreateDto[] | null;
  paymentTerms?: string | null;
  userIds?: number[] | null;
}

export interface UpdateBusinessProfileRequest {
  name?: string;
  gstin?: string;
  status?: 'ACTIVE' | 'INACTIVE' | string;
  addresses?: (AddressCreateDto | AddressDto)[] | null;
  paymentTerms?: string | null;
  userIds?: number[] | null;
}

export async function fetchBusinessProfiles(params?: { search?: string; status?: string; page?: number; size?: number }): Promise<Page<BusinessProfileDto>> {
  const queryParams = new URLSearchParams();
  if (params?.search) queryParams.append('search', params.search); // Assuming backend supports name search
  if (params?.status) queryParams.append('status', params.status);
  if (params?.page !== undefined) queryParams.append('page', params.page.toString());
  if (params?.size !== undefined) queryParams.append('size', params.size.toString());
  
  const queryString = queryParams.toString();
  return fetchAPI<Page<BusinessProfileDto>>(`/business-profiles${queryString ? `?${queryString}` : ''}`);
}

export async function fetchBusinessProfileById(profileId: number): Promise<BusinessProfileDto> {
  return fetchAPI<BusinessProfileDto>(`/business-profiles/${profileId}`);
}

export async function createBusinessProfile(profileData: CreateBusinessProfileRequest): Promise<BusinessProfileDto> {
  return fetchAPI<BusinessProfileDto>('/business-profiles', {
    method: 'POST',
    body: JSON.stringify(profileData),
  });
}

export async function updateBusinessProfile(profileId: number, profileData: UpdateBusinessProfileRequest): Promise<BusinessProfileDto> {
  return fetchAPI<BusinessProfileDto>(`/business-profiles/${profileId}`, {
    method: 'PUT',
    body: JSON.stringify(profileData),
  });
}

export async function deleteBusinessProfile(profileId: number): Promise<void> {
  return fetchAPI<void>(`/business-profiles/${profileId}`, {
    method: 'DELETE',
  }, false);
}

// === STAFF MANAGEMENT ===
export interface StaffDto {
  id: number;
  userId: number; // Refers to UserDto.id
  user?: UserDto; // Optional: to hold fetched user details
  roles: string[];
  permissions?: string[] | null;
  status: 'ACTIVE' | 'INACTIVE' | string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateStaffRequest {
  userId: number;
  roles: string[];
  permissions?: string[] | null;
}

export interface UpdateStaffRequest {
  roles?: string[];
  permissions?: string[] | null;
  status?: 'ACTIVE' | 'INACTIVE' | string;
}

export async function fetchStaff(params?: { role?: string; status?: string; page?: number; size?: number }): Promise<Page<StaffDto>> {
  const queryParams = new URLSearchParams();
  if (params?.role) queryParams.append('role', params.role);
  if (params?.status) queryParams.append('status', params.status);
  if (params?.page !== undefined) queryParams.append('page', params.page.toString());
  if (params?.size !== undefined) queryParams.append('size', params.size.toString());

  const queryString = queryParams.toString();
  return fetchAPI<Page<StaffDto>>(`/staff${queryString ? `?${queryString}` : ''}`);
}

export async function fetchStaffById(staffId: number): Promise<StaffDto> {
  return fetchAPI<StaffDto>(`/staff/${staffId}`);
}

// POST /api/v2/users/{userId}/staff
export async function createStaffMember(userId: number, staffData: CreateStaffRequest): Promise<StaffDto> {
  // Ensure staffData itself doesn't also contain userId if API expects it only in path
  const payload = { roles: staffData.roles, permissions: staffData.permissions };
  return fetchAPI<StaffDto>(`/users/${userId}/staff`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// PUT /api/v2/staff/{id}
export async function updateStaffMember(staffId: number, staffData: UpdateStaffRequest): Promise<StaffDto> {
  return fetchAPI<StaffDto>(`/staff/${staffId}`, {
    method: 'PUT',
    body: JSON.stringify(staffData),
  });
}

export async function deleteStaffMember(staffId: number): Promise<void> {
  return fetchAPI<void>(`/staff/${staffId}`, {
    method: 'DELETE',
  }, false);
}


// === PRODUCT MANAGEMENT (existing, ensure up-to-date) ===
export interface Category {
  id: number;
  name: string;
  description?: string | null;
  parentId?: number | null;
  children?: Category[];
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
export interface UserRole extends MetaItem { // This is a generic meta item, StaffDto.roles is string[]
  permissions?: string[];
}

export interface NotificationTemplate {
  id: number;
  name: string;
  subject: string;
  body: string;
  type: string; // e.g., EMAIL, SMS
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
  createdAt?: string;
  updatedAt?: string;
}
export interface VariantDefinitionDTO { // For older variant creation, may not be used if using colorVariant/sizeVariant string arrays
  color: string;
  size: string;
  sku?: string;
  price?: number;
  quantity?: number;
}
export interface Product {
  id: number;
  name:string;
  description?: string | null;
  sku?: string | null;
  barcode?: string | null;
  quantity?: number; // If no variants, this is used. API docs suggest variants handle inventory primarily.
  unitPrice?: number; // Base price if no variants.
  costPrice?: number | null;

  categoryId?: number | null;
  brandId?: number | null;
  supplierId?: number | null; // Note: Supplier meta endpoint not listed in V2, may need separate handling
  unitId?: number | null;

  // Expanded objects for GET /products/{id}
  category?: Category | null;
  brand?: Brand | null;
  // supplier?: Supplier | null; // Supplier DTO not fully defined from new spec
  unit?: ProductUnit | null;

  hsnCode?: string | null;
  gstTaxRate?: number | null;
  subCategory?: string | null;

  imageUrls?: string[] | null;
  tags?: string[] | null;
  status?: 'ACTIVE' | 'DRAFT' | 'ARCHIVED' | 'OUT_OF_STOCK' | string | null;
  weight?: number | null;
  dimensions?: string | null;
  isFeatured?: boolean | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  variants?: ProductVariant[] | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateProductRequest {
  name: string;
  brand: string; // Name of the brand
  hsnCode?: string | null;
  description?: string | null;
  gstTaxRate?: number | null;
  category: string; // Name of the category
  subCategory?: string | null;
  colorVariant?: string[] | null; // Array of color names for variant generation
  sizeVariant?: string[] | null;  // Array of size names for variant generation
  tags?: string[] | null;
  status?: 'ACTIVE' | 'DRAFT' | 'ARCHIVED' | 'OUT_OF_STOCK' | string | null;
  
  // Optional base product details (if no variants or as defaults)
  sku?: string | null;
  barcode?: string | null;
  quantity?: number; 
  unitPrice?: number; 
  costPrice?: number | null;
  imageUrls?: string[] | null;
  weight?: number | null;
  dimensions?: string | null;
  isFeatured?: boolean | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
}

export interface UpdateProductRequest {
  name?: string;
  brand?: string;
  hsnCode?: string | null;
  description?: string | null;
  gstTaxRate?: number | null;
  category?: string;
  subCategory?: string | null;
  colorVariant?: string[] | null; // For generating NEW variants
  sizeVariant?: string[] | null;  // For generating NEW variants
  tags?: string[] | null;
  status?: 'ACTIVE' | 'DRAFT' | 'ARCHIVED' | 'OUT_OF_STOCK' | string | null;

  sku?: string | null;
  barcode?: string | null;
  quantity?: number;
  unitPrice?: number;
  costPrice?: number | null;
  imageUrls?: string[] | null;
  weight?: number | null;
  dimensions?: string | null;
  isFeatured?: boolean | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
}


export interface AddVariantRequest { // For POST /products/{productId}/variants
  sku: string; // This seems to be the primary identifier for a new variant rather than color/size values
  price?: number | null;
  compareAtPrice?: number | null;
  costPrice?: number | null;
  quantity: number;
  barcode?: string | null;
  // If API auto-assigns color/size based on SKU pattern or if they are separate:
  colorValue?: string | null; // Assuming these can be part of add specific variant
  sizeValue?: string | null;
  imageUrls?: string[] | null;
}

export interface UpdateVariantRequest { // For PATCH /products/{productId}/variants/{variantId}
  sku?: string | null; // Usually SKU is not updatable, but API might allow
  price?: number | null;
  compareAtPrice?: number | null;
  costPrice?: number | null;
  quantity?: number;
  barcode?: string | null;
  imageUrls?: string[] | null;
  // colorValue and sizeValue might not be updatable directly on existing variant if they form part of its identity
}


export async function fetchProducts(params?: { page?: number; size?: number; search?: string}): Promise<Page<Product>> {
  const queryParams = new URLSearchParams();
  if (params?.page !== undefined) queryParams.append('page', params.page.toString());
  if (params?.size !== undefined) queryParams.append('size', params.size.toString());
  if (params?.search) queryParams.append('search', params.search);
  const queryString = queryParams.toString();
  const data = await fetchAPI<Page<Product> | undefined>(`/products${queryString ? `?${queryString}` : ''}`);
  return data ?? { content: [], totalPages: 0, totalElements: 0, size: params?.size ?? 20, number: params?.page ?? 0, first: true, last: true, empty: true };
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
    method: 'PATCH', // Or PUT if API spec implies full replacement
    body: JSON.stringify(productData),
  });
}

export async function deleteProduct(id: number): Promise<void> {
  return fetchAPI<void>(`/products/${id}`, {
    method: 'DELETE',
  }, false);
}

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
  }, false);
}

// V2 Meta endpoints (as per new instructions)
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
  return fetchAPI<void>(`/meta/product/brands/${id}`, { method: 'DELETE' }, false);
}

export async function fetchProductCategoriesTree(): Promise<ProductCategoryNode[]> {
  const data = await fetchAPI<ProductCategoryNode[] | undefined>('/meta/product/categories/tree');
  return Array.isArray(data) ? data : [];
}
export async function fetchProductCategoriesFlat(): Promise<Category[]> { // For simple list displays
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
  return fetchAPI<void>(`/meta/product/categories/${id}`, { method: 'DELETE' }, false);
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
  return fetchAPI<void>(`/meta/product/units/${id}`, { method: 'DELETE' }, false);
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

export async function fetchUserRolesMeta(): Promise<UserRole[]> { // Renamed to avoid conflict if a User DTO has 'roles'
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
  return fetchAPI<void>(`/meta/notification/templates/${id}`, { method: 'DELETE' }, false);
}


// FOR SETTINGS PAGE - Generic Meta for items not covered by new V2 spec (Sizes, Colors, Suppliers)
// These might be deprecated or replaced if V2 provides specific endpoints later.
export interface Supplier extends MetaItem { // Explicitly defining Supplier if used generically
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
}
export async function fetchSuppliers(): Promise<Supplier[]> { // Path assumed based on previous context
  const data = await fetchAPI<Supplier[] | undefined>('/meta/suppliers');
  return Array.isArray(data) ? data : [];
}
export async function fetchProductStatuses(): Promise<string[]> { // Path assumed based on previous context
  const response = await fetchAPI<string[] | undefined>('/meta/product-statuses'); // Assuming this returns array of strings
  return Array.isArray(response) ? response : [];
}
export async function fetchSizes(): Promise<MetaItem[]> { // Path assumed based on previous context
  const data = await fetchAPI<MetaItem[] | undefined>('/meta/sizes');
  return Array.isArray(data) ? data : [];
}
export async function fetchColors(): Promise<MetaColorItem[]> { // Path assumed based on previous context
  const data = await fetchAPI<MetaColorItem[] | undefined>('/meta/colors');
  return Array.isArray(data) ? data : [];
}
type GenericMetaType = 'sizes' | 'colors' | 'suppliers'; // Keep for settings page that might use these paths

export async function createGenericMetaItem(metaType: GenericMetaType, data: Partial<MetaItem & MetaColorItem & Supplier>): Promise<MetaItem | MetaColorItem | Supplier> {
  return fetchAPI<MetaItem | MetaColorItem | Supplier>(`/meta/${metaType}`, { // Path assumed
    method: 'POST',
    body: JSON.stringify(data),
  });
}
export async function updateGenericMetaItem(metaType: GenericMetaType, id: number, data: Partial<MetaItem & MetaColorItem & Supplier>): Promise<MetaItem | MetaColorItem | Supplier> {
  return fetchAPI<MetaItem | MetaColorItem | Supplier>(`/meta/${metaType}/${id}`, { // Path assumed
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}
export async function deleteGenericMetaItem(metaType: GenericMetaType, id: number): Promise<void> {
  return fetchAPI<void>(`/meta/${metaType}/${id}`, { // Path assumed
    method: 'DELETE',
  }, false);
}

// Placeholder for CurrentUser related API calls (if /users/me is different from UserDto)
export interface CurrentUserDto extends UserDto { // Assuming it's similar to UserDto
  // any specific fields for /users/me
}
export async function fetchCurrentUser(): Promise<CurrentUserDto> {
  return fetchAPI<CurrentUserDto>('/users/me'); // Assuming /users/me endpoint
}
export async function updateCurrentUser(data: UpdateUserRequest): Promise<CurrentUserDto> {
  return fetchAPI<CurrentUserDto>('/users/me', { // Assuming /users/me endpoint
    method: 'PATCH', // Or PUT
    body: JSON.stringify(data),
  });
}
// (End of apiClient.ts)