
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
  id: string; // Changed to string
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
  id: string; // Changed to string
  name: string;
  phone: string;
  email?: string | null;
  // type field removed
  // gstin field removed
  addresses?: AddressDto[] | null;
  status?: 'ACTIVE' | 'INACTIVE' | string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateUserRequest {
  name: string;
  phone: string;
  email?: string | null;
  // type field removed
  // gstin field removed
  addresses?: AddressCreateDto[] | null;
  status?: 'ACTIVE' | 'INACTIVE';
}

export interface UpdateUserRequest {
  name?: string;
  email?: string | null;
  // type field removed
  // gstin field removed
  addresses?: (AddressCreateDto | AddressDto)[] | null; 
  status?: 'ACTIVE' | 'INACTIVE';
}


export async function fetchUsers(params?: { search?: string; page?: number; size?: number }): Promise<Page<UserDto>> {
  const queryParams = new URLSearchParams();
  // Removed type filter
  if (params?.search) queryParams.append('search', params.search);
  if (params?.page !== undefined) queryParams.append('page', params.page.toString());
  if (params?.size !== undefined) queryParams.append('size', params.size.toString());

  const queryString = queryParams.toString();
  const data = await fetchAPI<Page<UserDto> | undefined>(`/users${queryString ? `?${queryString}` : ''}`);
  return data ?? { content: [], totalPages: 0, totalElements: 0, size: params?.size ?? 10, number: params?.page ?? 0, first: true, last: true, empty: true };
}

export async function fetchAllUsers(): Promise<UserDto[]> {
  // Defaulting to a large size to fetch all users; consider pagination if user list is very large
  const data = await fetchAPI<Page<UserDto> | undefined>(`/users?size=1000`); 
  return data?.content ?? [];
}


export async function fetchUserById(userId: string): Promise<UserDto> { // Changed userId to string
  return fetchAPI<UserDto>(`/users/${userId}`);
}

export async function createUser(userData: CreateUserRequest): Promise<UserDto> {
  return fetchAPI<UserDto>('/users', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
}

export async function updateUser(userId: string, userData: UpdateUserRequest): Promise<UserDto> { // Changed userId to string
  return fetchAPI<UserDto>(`/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(userData),
  });
}

export async function deleteUser(userId: string): Promise<void> { // Changed userId to string
  return fetchAPI<void>(`/users/${userId}`, {
    method: 'DELETE',
  }, false);
}


// === BUSINESS PROFILE MANAGEMENT ===
export interface BusinessProfileDto {
  id: string; // Changed to string
  name: string;
  gstin: string;
  status: 'ACTIVE' | 'INACTIVE' | string;
  paymentTerms?: string | null;
  addresses?: AddressDto[] | null;
  userIds?: string[] | null; // Changed to string array
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateBusinessProfileRequest {
  name: string;
  gstin: string;
  addresses?: AddressCreateDto[] | null;
  paymentTerms?: string | null;
  userIds?: string[] | null; // Changed to string array
  status?: 'ACTIVE' | 'INACTIVE';
}

export interface UpdateBusinessProfileRequest {
  name?: string;
  gstin?: string;
  status?: 'ACTIVE' | 'INACTIVE' | undefined;
  addresses?: (AddressCreateDto | AddressDto)[] | null;
  paymentTerms?: string | null;
  userIds?: string[] | null; // Changed to string array
}


export async function fetchBusinessProfiles(params?: { search?: string; status?: string; page?: number; size?: number }): Promise<Page<BusinessProfileDto>> {
  const queryParams = new URLSearchParams();
  if (params?.search) queryParams.append('search', params.search);
  if (params?.status) queryParams.append('status', params.status);
  if (params?.page !== undefined) queryParams.append('page', params.page.toString());
  if (params?.size !== undefined) queryParams.append('size', params.size.toString());

  const queryString = queryParams.toString();
  const data = await fetchAPI<Page<BusinessProfileDto> | undefined>(`/business-profiles${queryString ? `?${queryString}` : ''}`);
  return data ?? { content: [], totalPages: 0, totalElements: 0, size: params?.size ?? 10, number: params?.page ?? 0, first: true, last: true, empty: true };
}

export async function fetchBusinessProfileById(profileId: string): Promise<BusinessProfileDto> { // Changed profileId to string
  return fetchAPI<BusinessProfileDto>(`/business-profiles/${profileId}`);
}

export async function createBusinessProfile(profileData: CreateBusinessProfileRequest): Promise<BusinessProfileDto> {
  return fetchAPI<BusinessProfileDto>('/business-profiles', {
    method: 'POST',
    body: JSON.stringify(profileData),
  });
}

export async function updateBusinessProfile(profileId: string, profileData: UpdateBusinessProfileRequest): Promise<BusinessProfileDto> { // Changed profileId to string
  return fetchAPI<BusinessProfileDto>(`/business-profiles/${profileId}`, {
    method: 'PUT',
    body: JSON.stringify(profileData),
  });
}

export async function deleteBusinessProfile(profileId: string): Promise<void> { // Changed profileId to string
  return fetchAPI<void>(`/business-profiles/${profileId}`, {
    method: 'DELETE',
  }, false);
}

// === STAFF MANAGEMENT ===
export interface StaffDto {
  id: string; // Changed to string
  userId: string; // Changed to string
  user?: UserDto; 
  roles: string[];
  permissions?: string[] | null;
  status: 'ACTIVE' | 'INACTIVE' | string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateStaffRequest {
  roles: string[];
  permissions?: string[] | null;
  status?: 'ACTIVE' | 'INACTIVE';
}

export interface UpdateStaffRequest {
  roles?: string[];
  permissions?: string[] | null;
  status?: 'ACTIVE' | 'INACTIVE';
}


export async function fetchStaff(params?: { role?: string; status?: string; page?: number; size?: number; search?: string }): Promise<Page<StaffDto>> {
  const queryParams = new URLSearchParams();
  if (params?.search) queryParams.append('search', params.search);
  if (params?.role) queryParams.append('role', params.role);
  if (params?.status) queryParams.append('status', params.status);
  if (params?.page !== undefined) queryParams.append('page', params.page.toString());
  if (params?.size !== undefined) queryParams.append('size', params.size.toString());
  const queryString = queryParams.toString();
  const data = await fetchAPI<Page<StaffDto> | undefined>(`/users/staff${queryString ? `?${queryString}` : ''}`);
  return data ?? { content: [], totalPages: 0, totalElements: 0, size: params?.size ?? 10, number: params?.page ?? 0, first: true, last: true, empty: true };
}

export async function fetchStaffById(staffId: string): Promise<StaffDto> { // Changed staffId to string
  return fetchAPI<StaffDto>(`/staff/${staffId}`);
}

export async function createStaffMember(userId: string, staffData: CreateStaffRequest): Promise<StaffDto> { // Changed userId to string
  return fetchAPI<StaffDto>(`/users/${userId}/staff`, {
    method: 'POST',
    body: JSON.stringify(staffData),
  });
}

export async function updateStaffMember(staffId: string, staffData: UpdateStaffRequest): Promise<StaffDto> { // Changed staffId to string
  return fetchAPI<StaffDto>(`/staff/${staffId}`, {
    method: 'PUT',
    body: JSON.stringify(staffData),
  });
}

export async function updateStaffRoles(userId: string, roles: string[]): Promise<StaffDto> { // Changed userId to string
  return fetchAPI<StaffDto>(`/users/${userId}/staff-roles`, {
    method: 'PUT',
    body: JSON.stringify({ roles }),
  });
}

export async function deleteStaffMember(staffId: string): Promise<void> { // Changed staffId to string
  return fetchAPI<void>(`/staff/${staffId}`, {
    method: 'DELETE',
  }, false);
}


// === PRODUCT MANAGEMENT ===
export interface MetaItem {
  id: string; // Changed to string
  name: string;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Brand extends MetaItem {}

export interface Category extends MetaItem {
  parentId?: string | null; // Changed to string
}
export interface ProductCategoryNode extends Category {
  children?: ProductCategoryNode[] | null;
  displayName?: string; 
  depth?: number; 
}

export interface ProductUnit extends MetaItem {}


export interface ProductVariant {
  id: string; // Changed to string
  productId?: string; // Changed to string
  sku?: string | null;
  price?: number | null;
  compareAtPrice?: number | null;
  costPrice?: number | null;
  quantity: number;
  barcode?: string | null;
  color?: string | null; 
  size?: string | null;  
  imageUrls?: string[] | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Product {
  id: string; // Changed to string
  name:string;
  brand?: Brand | null; 
  brandId?: string | null; // Changed to string
  category?: Category | null; 
  categoryId?: string | null; // Changed to string
  subCategory?: string | null;
  hsnCode?: string | null;
  gstTaxRate?: number | null;
  description?: string | null;
  status?: 'ACTIVE' | 'DRAFT' | 'ARCHIVED' | 'OUT_OF_STOCK' | string | null;
  
  sku?: string | null; 
  barcode?: string | null; 
  quantity?: number; 
  unitPrice?: number; 
  costPrice?: number | null; 

  unitId?: string | null; // Changed to string
  unit?: ProductUnit | null;

  imageUrls?: string[] | null;
  tags?: string[] | null;
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
  brand: string; 
  hsnCode?: string | null;
  description?: string | null;
  gstTaxRate?: number | null;
  category: string; 
  subCategory?: string | null;
  colorVariant?: string[] | null; 
  sizeVariant?: string[] | null;  
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


export interface UpdateProductRequest {
  name?: string;
  brand?: string; 
  category?: string; 
  subCategory?: string | null;
  hsnCode?: string | null;
  gstTaxRate?: number | null;
  description?: string | null;
  colorVariant?: string[] | null; 
  sizeVariant?: string[] | null;   
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


export interface AddVariantRequest {
  sku: string;
  price?: number | null;
  compareAtPrice?: number | null;
  costPrice?: number | null;
  quantity: number;
  barcode?: string | null;
  color?: string | null;
  size?: string | null;
  imageUrls?: string[] | null;
}

export interface UpdateVariantRequest {
  sku?: string | null;
  price?: number | null;
  compareAtPrice?: number | null;
  costPrice?: number | null;
  quantity?: number;
  barcode?: string | null;
  color?: string | null;
  size?: string | null;
  imageUrls?: string[] | null;
}


export async function fetchProducts(params?: { page?: number; size?: number; search?: string}): Promise<Page<Product>> {
  const queryParams = new URLSearchParams();
  if (params?.page !== undefined) queryParams.append('page', params.page.toString());
  if (params?.size !== undefined) queryParams.append('size', params.size.toString());
  if (params?.search) queryParams.append('search', params.search);
  const queryString = queryParams.toString();
  const data = await fetchAPI<Page<Product> | undefined>(`/products${queryString ? `?${queryString}` : ''}`);
  return data ?? { content: [], totalPages: 0, totalElements: 0, size: params?.size ?? 10, number: params?.page ?? 0, first: true, last: true, empty: true };
}

export async function fetchProductById(id: string): Promise<Product> { // Changed id to string
  return fetchAPI<Product>(`/products/${id}`);
}

export async function createProduct(productData: CreateProductRequest): Promise<Product> {
  return fetchAPI<Product>('/products', {
    method: 'POST',
    body: JSON.stringify(productData),
  });
}

export async function updateProduct(id: string, productData: UpdateProductRequest): Promise<Product> { // Changed id to string
  return fetchAPI<Product>(`/products/${id}`, {
    method: 'PATCH', 
    body: JSON.stringify(productData),
  });
}

export async function deleteProduct(id: string): Promise<void> { // Changed id to string
  return fetchAPI<void>(`/products/${id}`, {
    method: 'DELETE',
  }, false);
}

export async function addProductVariant(productId: string, variantData: AddVariantRequest): Promise<ProductVariant> { // Changed productId to string
  return fetchAPI<ProductVariant>(`/products/${productId}/variants`, {
    method: 'POST',
    body: JSON.stringify(variantData),
  });
}

export async function updateProductVariant(productId: string, variantId: string, variantData: UpdateVariantRequest): Promise<ProductVariant> { // Changed productId and variantId to string
  return fetchAPI<ProductVariant>(`/products/${productId}/variants/${variantId}`, {
    method: 'PATCH',
    body: JSON.stringify(variantData),
  });
}

export async function deleteProductVariant(productId: string, variantId: string): Promise<void> { // Changed productId and variantId to string
  return fetchAPI<void>(`/products/${productId}/variants/${variantId}`, {
    method: 'DELETE',
  }, false);
}

// === V2 META ENDPOINTS ===
export async function fetchProductBrands(): Promise<Brand[]> {
  const data = await fetchAPI<Brand[] | undefined>('/meta/product/brands');
  return Array.isArray(data) ? data : [];
}
export async function createProductBrand(data: Omit<Brand, 'id' | 'createdAt' | 'updatedAt'>): Promise<Brand> {
  return fetchAPI<Brand>('/meta/product/brands', { method: 'POST', body: JSON.stringify(data) });
}
export async function updateProductBrand(id: string, data: Partial<Omit<Brand, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Brand> { // Changed id to string
  return fetchAPI<Brand>(`/meta/product/brands/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}
export async function deleteProductBrand(id: string): Promise<void> { // Changed id to string
  return fetchAPI<void>(`/meta/product/brands/${id}`, { method: 'DELETE' }, false);
}

export async function fetchProductCategoriesTree(): Promise<ProductCategoryNode[]> {
  const data = await fetchAPI<ProductCategoryNode[] | undefined>('/meta/product/categories/tree');
  return Array.isArray(data) ? data : [];
}
export async function fetchProductCategoriesFlat(): Promise<Category[]> {
  const data = await fetchAPI<Category[] | undefined>('/meta/product/categories');
  return Array.isArray(data) ? data : [];
}
export async function createProductCategory(data: Omit<Category, 'id' | 'createdAt' | 'updatedAt' | 'parentId'> & { parentId?: string | null }): Promise<Category> { // Changed parentId to string
  return fetchAPI<Category>('/meta/product/categories', { method: 'POST', body: JSON.stringify(data) });
}
export async function updateProductCategory(id: string, data: Partial<Omit<Category, 'id' | 'createdAt' | 'updatedAt' | 'parentId'> & { parentId?: string | null }>): Promise<Category> { // Changed id and parentId to string
  return fetchAPI<Category>(`/meta/product/categories/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}
export async function deleteProductCategory(id: string): Promise<void> { // Changed id to string
  return fetchAPI<void>(`/meta/product/categories/${id}`, { method: 'DELETE' }, false);
}

export async function fetchProductUnits(): Promise<ProductUnit[]> {
  const data = await fetchAPI<ProductUnit[] | undefined>('/meta/product/units');
  return Array.isArray(data) ? data : [];
}
export async function createProductUnit(data: Omit<ProductUnit, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProductUnit> {
  return fetchAPI<ProductUnit>('/meta/product/units', { method: 'POST', body: JSON.stringify(data) });
}
export async function updateProductUnit(id: string, data: Partial<Omit<ProductUnit, 'id' | 'createdAt' | 'updatedAt'>>): Promise<ProductUnit> { // Changed id to string
  return fetchAPI<ProductUnit>(`/meta/product/units/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}
export async function deleteProductUnit(id: string): Promise<void> { // Changed id to string
  return fetchAPI<void>(`/meta/product/units/${id}`, { method: 'DELETE' }, false);
}

export type OrderStatus = string;
export async function fetchOrderStatuses(): Promise<OrderStatus[]> {
  const data = await fetchAPI<string[] | undefined>('/meta/order/statuses');
  return Array.isArray(data) ? data : [];
}

export type PaymentType = string;
export async function fetchPaymentTypes(): Promise<PaymentType[]> {
  const data = await fetchAPI<string[] | undefined>('/meta/order/payment-types');
  return Array.isArray(data) ? data : [];
}

export interface InventoryAdjustmentReason extends MetaItem {}
export async function fetchInventoryAdjustmentReasons(): Promise<InventoryAdjustmentReason[]> {
  const data = await fetchAPI<InventoryAdjustmentReason[] | undefined>('/meta/inventory/adjustment-reasons');
  return Array.isArray(data) ? data : [];
}

export type UserRoleMeta = string;
export async function fetchUserRolesMeta(): Promise<UserRoleMeta[]> {
  const data = await fetchAPI<UserRoleMeta[] | undefined>('/meta/user/roles');
  return Array.isArray(data) ? data : [];
}

export interface NotificationTemplate {
  id: string; // Changed to string
  name: string;
  subject: string;
  body: string;
  type: string; // e.g., EMAIL, SMS
  createdAt?: string;
  updatedAt?: string;
}
export async function fetchNotificationTemplates(): Promise<NotificationTemplate[]> {
  const data = await fetchAPI<NotificationTemplate[] | undefined>('/meta/notification/templates');
  return Array.isArray(data) ? data : [];
}
export async function createNotificationTemplate(data: Omit<NotificationTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<NotificationTemplate> {
  return fetchAPI<NotificationTemplate>('/meta/notification/templates', { method: 'POST', body: JSON.stringify(data) });
}
export async function updateNotificationTemplate(id: string, data: Partial<Omit<NotificationTemplate, 'id' | 'createdAt' | 'updatedAt'>>): Promise<NotificationTemplate> { // Changed id to string
  return fetchAPI<NotificationTemplate>(`/meta/notification/templates/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}
export async function deleteNotificationTemplate(id: string): Promise<void> { // Changed id to string
  return fetchAPI<void>(`/meta/notification/templates/${id}`, { method: 'DELETE' }, false);
}


// === OTHER API FUNCTIONS ===
export interface CurrentUserDto extends UserDto {
  // any additional fields specific to current user context
}
export async function fetchCurrentUser(): Promise<CurrentUserDto> {
  return fetchAPI<CurrentUserDto>('/users/me');
}
export async function updateCurrentUser(data: UpdateUserRequest): Promise<CurrentUserDto> {
  return fetchAPI<CurrentUserDto>('/users/me', {
    method: 'PATCH', 
    body: JSON.stringify(data),
  });
}
