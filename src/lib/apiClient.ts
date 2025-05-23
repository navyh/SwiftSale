
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
  id: string;
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
  id: string;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  addresses?: AddressDto[] | null;
  status?: 'ACTIVE' | 'INACTIVE' | string | null;
  // type and gstin removed as per last instruction
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface CreateUserRequest {
  name: string;
  phone: string;
  email?: string | null;
  status?: 'ACTIVE' | 'INACTIVE';
  addresses?: AddressCreateDto[] | null;
  // type and gstin removed
}

export interface UpdateUserRequest {
  name?: string;
  email?: string | null;
  status?: 'ACTIVE' | 'INACTIVE';
  addresses?: (AddressCreateDto | AddressDto)[] | null;
  // type and gstin removed
}


export async function fetchUsers(params?: { search?: string; page?: number; size?: number }): Promise<Page<UserDto>> {
  const queryParams = new URLSearchParams();
  if (params?.search) queryParams.append('search', params.search);
  if (params?.page !== undefined) queryParams.append('page', params.page.toString());
  if (params?.size !== undefined) queryParams.append('size', params.size.toString());

  const queryString = queryParams.toString();
  const data = await fetchAPI<Page<UserDto> | undefined>(`/users${queryString ? `?${queryString}` : ''}`);
  return data ?? { content: [], totalPages: 0, totalElements: 0, size: params?.size ?? 10, number: params?.page ?? 0, first: true, last: true, empty: true };
}

export async function fetchAllUsers(): Promise<UserDto[]> {
  const data = await fetchAPI<Page<UserDto> | undefined>(`/users?size=1000`); // Consider pagination if list grows very large
  return data?.content ?? [];
}


export async function fetchUserById(userId: string): Promise<UserDto> {
  return fetchAPI<UserDto>(`/users/${userId}`);
}

export async function createUser(userData: CreateUserRequest): Promise<UserDto> {
  return fetchAPI<UserDto>('/users', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
}

export async function updateUser(userId: string, userData: UpdateUserRequest): Promise<UserDto> {
  return fetchAPI<UserDto>(`/users/${userId}`, {
    method: 'PATCH', // Changed from PUT to PATCH
    body: JSON.stringify(userData),
  });
}

export async function deleteUser(userId: string): Promise<void> {
  return fetchAPI<void>(`/users/${userId}`, {
    method: 'DELETE',
  }, false);
}

export async function searchUserByPhone(phone: string): Promise<UserDto[]> {
  try {
    const result = await fetchAPI<UserDto | UserDto[] | null>(`/users/by-phone?phone=${encodeURIComponent(phone)}`);
    if (Array.isArray(result)) {
      return result;
    } else if (result) {
      return [result];
    }
    return [];
  } catch (error: any) {
    if (error.message && error.message.includes("404")) return [];
    console.warn(`Search user by phone for "${phone}" failed or user not found:`, error);
    return [];
  }
}


// === BUSINESS PROFILE MANAGEMENT ===
export interface BusinessProfileDto {
  id: string;
  name?: string | null;
  gstin?: string | null;
  status?: 'ACTIVE' | 'INACTIVE' | string | null;
  paymentTerms?: string | null;
  addresses?: AddressDto[] | null;
  userIds?: string[] | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  user?: UserDto;
}

export interface CreateBusinessProfileRequest {
  name: string;
  gstin: string;
  addresses?: AddressCreateDto[] | null;
  paymentTerms?: string | null;
  userIds?: string[] | null;
  status?: 'ACTIVE' | 'INACTIVE';
}

export interface UpdateBusinessProfileRequest {
  name?: string;
  gstin?: string;
  status?: 'ACTIVE' | 'INACTIVE' | undefined;
  addresses?: (AddressCreateDto | AddressDto)[] | null;
  paymentTerms?: string | null;
  userIds?: string[] | null;
}

export interface CreateBusinessProfileWithUserRequest {
  businessProfile: {
    name: string;
    gstin: string;
    paymentTerms?: string | null;
    addresses?: AddressCreateDto[] | null;
    status?: 'ACTIVE' | 'INACTIVE';
  };
  user: {
    name: string;
    phone: string;
    email?: string | null;
    addresses?: AddressCreateDto[] | null;
    status?: 'ACTIVE' | 'INACTIVE';
  };
}
export interface CreateBusinessProfileWithUserResponse extends BusinessProfileDto {
  user?: UserDto;
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

export async function fetchBusinessProfileById(profileId: string): Promise<BusinessProfileDto> {
  return fetchAPI<BusinessProfileDto>(`/business-profiles/${profileId}`);
}

export async function createBusinessProfile(profileData: CreateBusinessProfileRequest): Promise<BusinessProfileDto> {
  return fetchAPI<BusinessProfileDto>('/business-profiles', {
    method: 'POST',
    body: JSON.stringify(profileData),
  });
}

export async function updateBusinessProfile(profileId: string, profileData: UpdateBusinessProfileRequest): Promise<BusinessProfileDto> {
  return fetchAPI<BusinessProfileDto>(`/business-profiles/${profileId}`, {
    method: 'PATCH', // Changed from PUT to PATCH
    body: JSON.stringify(profileData),
  });
}

export async function deleteBusinessProfile(profileId: string): Promise<void> {
  return fetchAPI<void>(`/business-profiles/${profileId}`, {
    method: 'DELETE',
  }, false);
}

export async function searchBusinessProfileByGstin(gstin: string): Promise<BusinessProfileDto | null> {
   try {
    return await fetchAPI<BusinessProfileDto>(`/business-profiles/by-gstin?gstin=${encodeURIComponent(gstin)}`);
  } catch (error: any) {
    if (error.message && error.message.includes("404")) return null;
    console.warn(`Search BP by GSTIN for "${gstin}" failed or BP not found:`, error);
    return null;
  }
}

export async function createBusinessProfileWithUser(data: CreateBusinessProfileWithUserRequest): Promise<CreateBusinessProfileWithUserResponse> {
  return fetchAPI<CreateBusinessProfileWithUserResponse>('/business-profiles/with-user', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}


// === STAFF MANAGEMENT ===
export interface StaffDto {
  id: string;
  userId: string;
  user?: UserDto | null;
  roles: string[];
  permissions?: string[] | null;
  status: 'ACTIVE' | 'INACTIVE' | string;
  createdAt?: string;
  updatedAt?: string;
}

// Used for POST /api/v2/users/{userId}/staff
export interface CreateStaffRequest {
  roles: string[];
  permissions?: string[] | null;
  status?: 'ACTIVE' | 'INACTIVE';
}

// Used for PUT /api/v2/staff/{staffId} (assuming it updates these fields)
export interface UpdateStaffRequest {
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
  const data = await fetchAPI<Page<StaffDto> | undefined>(`/users/staff${queryString ? `?${queryString}` : ''}`); // Corrected endpoint
  return data ?? { content: [], totalPages: 0, totalElements: 0, size: params?.size ?? 10, number: params?.page ?? 0, first: true, last: true, empty: true };
}

export async function fetchStaffById(staffId: string): Promise<StaffDto> {
  return fetchAPI<StaffDto>(`/staff/${staffId}`);
}

// POST /api/v2/users/{userId}/staff
export async function createStaffMember(userId: string, staffData: CreateStaffRequest): Promise<StaffDto> {
  return fetchAPI<StaffDto>(`/users/${userId}/staff`, {
    method: 'POST',
    body: JSON.stringify(staffData),
  });
}

// PUT /api/v2/staff/{staffId} - for status and permissions
export async function updateStaffMember(staffId: string, staffData: UpdateStaffRequest): Promise<StaffDto> {
  return fetchAPI<StaffDto>(`/staff/${staffId}`, {
    method: 'PUT',
    body: JSON.stringify(staffData),
  });
}
// PUT /api/v2/users/{userId}/staff-roles - for roles specifically
export async function updateStaffRoles(userId: string, roles: string[]): Promise<StaffDto> {
  return fetchAPI<StaffDto>(`/users/${userId}/staff-roles`, {
    method: 'PUT',
    body: JSON.stringify({ roles }),
  });
}

export async function deleteStaffMember(staffId: string): Promise<void> {
  return fetchAPI<void>(`/staff/${staffId}`, {
    method: 'DELETE',
  }, false);
}


// === PRODUCT MANAGEMENT ===
export interface MetaItem {
  id: string;
  name: string;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Brand extends MetaItem {}

export interface Category extends MetaItem {
  parentId?: string | null;
}
export interface ProductCategoryNode extends Category {
  children?: ProductCategoryNode[] | null;
  displayName?: string;
  depth?: number;
}

export interface ProductUnit extends MetaItem {}


export interface ProductVariantDto {
  id: string;
  productId?: string | null;
  sku?: string | null;
  price?: number | null;
  compareAtPrice?: number | null;
  costPrice?: number | null;
  quantity?: number;
  barcode?: string | null;
  color?: string | null; // Changed from colorValue
  size?: string | null;  // Changed from sizeValue
  imageUrls?: string[] | null;
  createdAt?: string;
  updatedAt?: string;
  // Fields from API sample for variants (like title, images, capacity, dimension, weight, mrp, purchaseCost, sellingPrice) can be added if needed for display
}

export interface ProductDto {
  id: string;
  name:string;
  brand?: Brand | null; // If API returns full object
  brandId?: string | null; // If API returns ID
  category?: Category | null; // If API returns full object
  categoryId?: string | null; // If API returns ID
  subCategory?: string | null;
  hsnCode?: string | null;
  gstTaxRate?: number | null;
  description?: string | null;
  status?: 'ACTIVE' | 'DRAFT' | 'ARCHIVED' | 'OUT_OF_STOCK' | string | null;

  sku?: string | null;
  barcode?: string | null;
  quantity?: number | null;
  unitPrice?: number | null; // This might be base price if no variants, or derived
  costPrice?: number | null;

  unitId?: string | null;
  unit?: ProductUnit | null;

  imageUrls?: string[] | null;
  tags?: string[] | null;
  weight?: number | null;
  dimensions?: string | null;
  isFeatured?: boolean | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  variants?: ProductVariantDto[] | null;
  createdAt?: string;
  updatedAt?: string;
}


export interface CreateProductRequest {
  name: string;
  brand: string; // Expects brand name as string
  hsnCode?: string | null;
  description?: string | null;
  gstTaxRate?: number | null;
  category: string; // Expects category name as string
  subCategory?: string | null;
  colorVariant?: string[] | null; // For generating variants
  sizeVariant?: string[] | null;  // For generating variants
  tags?: string[] | null;
  status?: 'ACTIVE' | 'DRAFT' | 'ARCHIVED' | 'OUT_OF_STOCK' | string | null;

  // Base product pricing/stock - might be ignored if variants are generated
  sku?: string | null;
  barcode?: string | null;
  quantity?: number | null;
  unitPrice?: number | null;
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
  colorVariant?: string[] | null; // For generating *new* variants during update
  sizeVariant?: string[] | null;  // For generating *new* variants during update
  tags?: string[] | null;
  status?: 'ACTIVE' | 'DRAFT' | 'ARCHIVED' | 'OUT_OF_STOCK' | string | null;

  sku?: string | null;
  barcode?: string | null;
  quantity?: number | null;
  unitPrice?: number | null;
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


export async function fetchProducts(params?: { page?: number; size?: number; search?: string}): Promise<Page<ProductDto>> {
  const queryParams = new URLSearchParams();
  if (params?.page !== undefined) queryParams.append('page', params.page.toString());
  if (params?.size !== undefined) queryParams.append('size', params.size.toString());
  if (params?.search) queryParams.append('search', params.search);
  const queryString = queryParams.toString();
  const data = await fetchAPI<Page<ProductDto> | undefined>(`/products${queryString ? `?${queryString}` : ''}`);
  return data ?? { content: [], totalPages: 0, totalElements: 0, size: params?.size ?? 10, number: params?.page ?? 0, first: true, last: true, empty: true };
}

export async function fetchProductById(id: string): Promise<ProductDto> {
  return fetchAPI<ProductDto>(`/products/${id}`);
}

export async function createProduct(productData: CreateProductRequest): Promise<ProductDto> {
  return fetchAPI<ProductDto>('/products', {
    method: 'POST',
    body: JSON.stringify(productData),
  });
}

export async function updateProduct(id: string, productData: UpdateProductRequest): Promise<ProductDto> {
  return fetchAPI<ProductDto>(`/products/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(productData),
  });
}

export async function deleteProduct(id: string): Promise<void> {
  return fetchAPI<void>(`/products/${id}`, {
    method: 'DELETE',
  }, false);
}

export async function addProductVariant(productId: string, variantData: AddVariantRequest): Promise<ProductVariantDto> {
  return fetchAPI<ProductVariantDto>(`/products/${productId}/variants`, {
    method: 'POST',
    body: JSON.stringify(variantData),
  });
}

export async function updateProductVariant(productId: string, variantId: string, variantData: UpdateVariantRequest): Promise<ProductVariantDto> {
  return fetchAPI<ProductVariantDto>(`/products/${productId}/variants/${variantId}`, {
    method: 'PATCH',
    body: JSON.stringify(variantData),
  });
}

export async function deleteProductVariant(productId: string, variantId: string): Promise<void> {
  return fetchAPI<void>(`/products/${productId}/variants/${variantId}`, {
    method: 'DELETE',
  }, false);
}

// ORDER FLOW SPECIFIC DTOs & Functions
export interface ProductSearchResultDto {
    id: string;
    name: string;
    brand?: string | null;    // Changed from brandName
    category?: string | null; // Changed from categoryName
    sku?: string | null;
    // unitPrice not directly available in sample API response top-level.
    // variants array IS available in the sample API response.
    variants?: ProductVariantDto[] | null; // Added to match sample API response structure
}

export interface QuickCreateProductRequest {
    name: string;
    brandName: string; // API for quick create might expect brandName, categoryName
    categoryName: string;
    colorVariants: string[];
    sizeVariants: string[];
    unitPrice: number; // Base unit price for generated variants
}
export interface QuickCreateProductResponse extends ProductDto {}


export interface OrderItemRequest {
    productId: string;
    variantId: string;
    quantity: number;
    unitPrice: number; // Selling price for this item
    discount?: number | null;
    taxRate?: number | null; // Tax rate applied for this item
}
export interface PaymentDetailRequest {
    paymentMode: string;
    amount: number;
    transactionId?: string | null;
    status: 'PENDING' | 'SUCCESS' | 'FAILED' | string;
}
export interface CreateOrderRequest {
    placedByUserId: string;
    businessProfileId?: string | null;
    orderItems: OrderItemRequest[];
    totalAmount: number; // Grand total after all discounts and taxes
    discount?: number | null; // Overall order discount
    taxAmount?: number | null; // Overall order tax
    shippingAddressId?: string | null;
    billingAddressId?: string | null;
    status?: string; // Initial order status
    paymentDetails?: PaymentDetailRequest[] | null;
    notes?: string | null;
}
export interface OrderDto {
    id: string;
    orderNumber?: string | null;
    placedByUserId: string;
    user?: UserDto | null;
    businessProfileId?: string | null;
    businessProfile?: BusinessProfileDto | null;
    orderItems: (OrderItemRequest & {id?: string; product?: ProductDto | null, variant?: ProductVariantDto | null})[];
    totalAmount: number;
    discount?: number | null;
    taxAmount?: number | null;
    shippingAddress?: AddressDto | null;
    billingAddress?: AddressDto | null;
    status: string;
    paymentDetails?: PaymentDetailRequest[] | null;
    notes?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface GenerateInvoiceRequest {
    orderId: string;
}
export interface InvoiceDto {
    id: string;
    orderId: string;
    invoiceNumber?: string | null;
    issueDate?: string | null;
    dueDate?: string | null;
    totalAmount?: number | null;
    pdfUrl?: string | null;
}


export async function searchProductsFuzzy(
  keyword: string,
  page: number = 0,
  size: number = 10,
  sort: string = 'name,asc'
): Promise<Page<ProductSearchResultDto>> {
  const queryParams = new URLSearchParams();
  queryParams.append('keyword', keyword); // Changed from query to keyword
  queryParams.append('page', page.toString());
  queryParams.append('size', size.toString());
  queryParams.append('sort', sort);

  const queryString = queryParams.toString();
  const data = await fetchAPI<Page<ProductSearchResultDto> | undefined>(`/products/search?${queryString}`);
  // Ensure content is always an array
  return data ?? { content: [], totalPages: 0, totalElements: 0, size: size, number: page, first: true, last: true, empty: true };
}


export async function quickCreateProduct(productData: QuickCreateProductRequest): Promise<QuickCreateProductResponse> {
    return fetchAPI<QuickCreateProductResponse>('/products/quick', {
        method: 'POST',
        body: JSON.stringify(productData),
    });
}

export async function createOrder(orderData: CreateOrderRequest): Promise<OrderDto> {
    return fetchAPI<OrderDto>('/orders', {
        method: 'POST',
        body: JSON.stringify(orderData),
    });
}

export async function generateInvoice(data: GenerateInvoiceRequest): Promise<InvoiceDto> {
    return fetchAPI<InvoiceDto>('/invoices/generate', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export async function downloadInvoicePdf(orderId: string): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/invoices/by-order/${orderId}/pdf`, {
        method: 'GET',
        headers: {
            // 'Authorization': `Bearer ${getToken()}`, // Placeholder for auth
        },
    });
    if (!response.ok) {
        throw new Error(`Invoice PDF download failed: ${response.status} ${response.statusText}`);
    }
    return response.blob();
}


// === V2 META ENDPOINTS ===
export async function fetchProductBrands(): Promise<Brand[]> {
  const data = await fetchAPI<Brand[] | undefined>('/meta/product/brands');
  return Array.isArray(data) ? data : [];
}
export async function createProductBrand(data: Omit<Brand, 'id' | 'createdAt' | 'updatedAt'>): Promise<Brand> {
  return fetchAPI<Brand>('/meta/product/brands', { method: 'POST', body: JSON.stringify(data) });
}
export async function updateProductBrand(id: string, data: Partial<Omit<Brand, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Brand> {
  return fetchAPI<Brand>(`/meta/product/brands/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}
export async function deleteProductBrand(id: string): Promise<void> {
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

export interface CreateCategoryRequest extends Omit<Category, 'id' | 'createdAt' | 'updatedAt'> {
  parentId?: string | null;
}
export async function createProductCategory(data: CreateCategoryRequest): Promise<Category> {
  return fetchAPI<Category>('/meta/product/categories', { method: 'POST', body: JSON.stringify(data) });
}

export interface UpdateCategoryRequest extends Partial<Omit<Category, 'id' | 'createdAt' | 'updatedAt'>> {
  parentId?: string | null;
}
export async function updateProductCategory(id: string, data: UpdateCategoryRequest): Promise<Category> {
  return fetchAPI<Category>(`/meta/product/categories/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}
export async function deleteProductCategory(id: string): Promise<void> {
  return fetchAPI<void>(`/meta/product/categories/${id}`, { method: 'DELETE' }, false);
}

export async function fetchProductUnits(): Promise<ProductUnit[]> {
  const data = await fetchAPI<ProductUnit[] | undefined>('/meta/product/units');
  return Array.isArray(data) ? data : [];
}
export async function createProductUnit(data: Omit<ProductUnit, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProductUnit> {
  return fetchAPI<ProductUnit>('/meta/product/units', { method: 'POST', body: JSON.stringify(data) });
}
export async function updateProductUnit(id: string, data: Partial<Omit<ProductUnit, 'id' | 'createdAt' | 'updatedAt'>>): Promise<ProductUnit> {
  return fetchAPI<ProductUnit>(`/meta/product/units/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}
export async function deleteProductUnit(id: string): Promise<void> {
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
  id: string;
  name: string;
  subject: string;
  body: string;
  type: string;
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
export async function updateNotificationTemplate(id: string, data: Partial<Omit<NotificationTemplate, 'id' | 'createdAt' | 'updatedAt'>>): Promise<NotificationTemplate> {
  return fetchAPI<NotificationTemplate>(`/meta/notification/templates/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}
export async function deleteNotificationTemplate(id: string): Promise<void> {
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

    
