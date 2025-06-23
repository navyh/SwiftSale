
// src/lib/apiClient.ts
"use client"; // To be used in client components

// const API_BASE_URL = 'https://orca-app-k6zka.ondigitalocean.app/api/v2';
const API_BASE_URL = 'http://localhost:8080/api/v2';

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
  line1?: string | null;
  line2?: string | null;
  city: string;
  state: string;
  stateCode: string;
  country?: string | null;
  postalCode?: string | null;
  type?: 'SHIPPING' | 'BILLING' | string | null;
  isDefault?: boolean | null;
  contactName?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
}

// === USER MANAGEMENT ===
export interface BusinessMembershipDto {
  businessProfileId: string;
  role: string;
  companyName: string;
}

export interface UserDto {
  id: string;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  addresses?: AddressDto[] | null;
  role?: string | null; // This is the user's system-level role, not their role in a BusinessProfile
  status?: 'ACTIVE' | 'INACTIVE' | string | null;
  businessMemberships?: BusinessMembershipDto[] | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  // Extra fields potentially from API samples, not directly in core DTO but useful for context
  type?: string | null; // Example: B2C, B2B from User list
  gstin?: string | null; // Example: If user has their own GSTIN
}

export interface CreateUserRequest {
  name: string;
  phone: string;
  email?: string | null;
  role?: string | null;
  status?: 'ACTIVE' | 'INACTIVE';
  addresses: AddressCreateDto[];
}

export interface UpdateUserRequest {
  name?: string;
  email?: string | null;
  role?: string | null;
  status?: 'ACTIVE' | 'INACTIVE';
  addresses?: (AddressCreateDto | AddressDto)[];
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
  const data = await fetchAPI<Page<UserDto> | undefined>(`/users?size=1000`); // Fetch a large number for dropdowns
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
    method: 'PATCH',
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
    const result = await fetchAPI<UserDto[] | UserDto | null>(`/users/by-phone?phone=${encodeURIComponent(phone)}`);
    if (Array.isArray(result)) {
      return result;
    } else if (result) {
      return [result];
    }
    return [];
  } catch (error: any) {
    if (error.message && error.message.toLowerCase().includes("not found")) return [];
    console.warn(`Search user by phone for "${phone}" failed:`, error);
    return [];
  }
}

export async function searchUsersByName(name: string, page: number = 0, size: number = 10): Promise<Page<UserDto>> {
  const queryParams = new URLSearchParams();
  queryParams.append('keyword', name);
  queryParams.append('page', page.toString());
  queryParams.append('size', size.toString());
  const queryString = queryParams.toString();
  const data = await fetchAPI<Page<UserDto> | undefined>(`/users/search?${queryString}`);
  return data ?? { content: [], totalPages: 0, totalElements: 0, size: size, number: page, first: true, last: true, empty: true };
}


// === BUSINESS PROFILE MANAGEMENT ===
export interface BusinessProfileDto {
  id: string;
  companyName: string;
  gstin: string;
  isActive: boolean;
  paymentTerms?: string | null;
  addresses?: AddressDto[] | null;
  userIds?: string[] | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  user?: UserDto;
  panNumber?: string | null;
  creditLimit?: number | null;
  notes?: string | null;
  status?: 'ACTIVE' | 'INACTIVE' | string | null;
}

export interface CreateBusinessProfileRequest {
  companyName: string;
  gstin: string;
  addresses: AddressCreateDto[];
  paymentTerms?: string | null;
  creditLimit?: number | null;
  status?: 'ACTIVE' | 'INACTIVE';
}

export interface UpdateBusinessProfileRequest {
  companyName?: string;
  gstin?: string;
  status?: 'ACTIVE' | 'INACTIVE' | undefined;
  addresses?: (AddressCreateDto | AddressDto)[] | null;
  paymentTerms?: string | null;
  creditLimit?: number | null;
}

export interface UserForCreateWithBpDto {
  name: string;
  phone: string;
  status: 'ACTIVE' | 'INACTIVE';
  addresses: AddressCreateDto[];
  email?: string | null;
}
export interface BusinessProfileForCreateWithBpDto {
  companyName: string;
  gstin: string;
  addresses: AddressCreateDto[];
  paymentTerms?: string | null;
  creditLimit?: number | null;
  status?: 'ACTIVE' | 'INACTIVE';
}
export interface CreateBusinessProfileWithUserRequest {
  user: UserForCreateWithBpDto;
  businessProfile: BusinessProfileForCreateWithBpDto;
}
export interface CreateBusinessProfileWithUserResponse {
  user: UserDto;
  businessProfiles: BusinessProfileDto[];
}


export async function fetchBusinessProfiles(params?: { search?: string; status?: string; page?: number; size?: number }): Promise<Page<BusinessProfileDto>> {
  const queryParams = new URLSearchParams();
  if (params?.search) queryParams.append('search', params.search);
  if (params?.status) queryParams.append('status', params.status);
  if (params?.page !== undefined) queryParams.append('page', params.page.toString());
  if (params?.size !== undefined) queryParams.append('size', params.size.toString());

  const queryString = queryParams.toString();
  const data = await fetchAPI<Page<BusinessProfileDto> | undefined>(`/business-profiles${queryString ? `?${queryString}` : ''}`);
  const contentWithIsActive = data?.content.map(profile => ({
    ...profile,
    companyName: profile.companyName || (profile as any).name,
    isActive: profile.isActive !== undefined ? profile.isActive : (profile.status === 'ACTIVE'),
  })) ?? [];
  return data ? { ...data, content: contentWithIsActive } : { content: [], totalPages: 0, totalElements: 0, size: params?.size ?? 10, number: params?.page ?? 0, first: true, last: true, empty: true };
}

export async function fetchBusinessProfileById(profileId: string): Promise<BusinessProfileDto> {
  const fetchedProfile = await fetchAPI<BusinessProfileDto>(`/business-profiles/${profileId}`);
  return {
    ...fetchedProfile,
    companyName: fetchedProfile.companyName || (fetchedProfile as any).name,
    isActive: fetchedProfile.isActive !== undefined ? fetchedProfile.isActive : (fetchedProfile.status === 'ACTIVE'),
  };
}

export async function createBusinessProfile(profileData: CreateBusinessProfileRequest, creatorUserId: string): Promise<BusinessProfileDto> {
  return fetchAPI<BusinessProfileDto>(`/business-profiles?creatorUserId=${encodeURIComponent(creatorUserId)}`, {
    method: 'POST',
    body: JSON.stringify({ ...profileData, companyName: profileData.companyName }), // Ensure companyName is sent
  });
}

export async function updateBusinessProfile(profileId: string, profileData: UpdateBusinessProfileRequest): Promise<BusinessProfileDto> {
  return fetchAPI<BusinessProfileDto>(`/business-profiles/${profileId}`, {
    method: 'PATCH',
    body: JSON.stringify({ ...profileData, companyName: profileData.companyName }), // Ensure companyName is sent
  });
}

export async function deleteBusinessProfile(profileId: string): Promise<void> {
  return fetchAPI<void>(`/business-profiles/${profileId}`, {
    method: 'DELETE',
  }, false);
}

export async function searchBusinessProfileByGstin(gstin: string): Promise<BusinessProfileDto | null> {
   try {
    const profile = await fetchAPI<BusinessProfileDto>(`/business-profiles/by-gstin?gstin=${encodeURIComponent(gstin)}`);
    return profile ? {
         ...profile,
         companyName: profile.companyName || (profile as any).name,
         isActive: profile.isActive !== undefined ? profile.isActive : (profile.status === 'ACTIVE')
        } : null;
  } catch (error: any) {
    if (error.message && error.message.toLowerCase().includes("not found")) return null;
    console.warn(`Search BP by GSTIN for "${gstin}" failed:`, error);
    return null;
  }
}

export async function searchBusinessProfilesByName(name: string, page: number = 0, size: number = 10): Promise<Page<BusinessProfileDto>> {
  const queryParams = new URLSearchParams();
  queryParams.append('keyword', name);
  queryParams.append('page', page.toString());
  queryParams.append('size', size.toString());
  const queryString = queryParams.toString();
  const data = await fetchAPI<Page<BusinessProfileDto> | undefined>(`/business-profiles/search?${queryString}`);
  const contentWithIsActive = data?.content.map(profile => ({
    ...profile,
    companyName: profile.companyName || (profile as any).name,
    isActive: profile.isActive !== undefined ? profile.isActive : (profile.status === 'ACTIVE'),
  })) ?? [];
  return data ? { ...data, content: contentWithIsActive } : { content: [], totalPages: 0, totalElements: 0, size: size, number: page, first: true, last: true, empty: true };
}


export async function createBusinessProfileWithUser(data: CreateBusinessProfileWithUserRequest): Promise<CreateBusinessProfileWithUserResponse> {
  const payload = {
    ...data,
    businessProfile: { ...data.businessProfile, companyName: data.businessProfile.companyName } // Ensure companyName
  };
  const response = await fetchAPI<CreateBusinessProfileWithUserResponse>('/business-profiles/with-user', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  // Process the response to ensure businessProfiles have the required properties
  if (response.businessProfiles && response.businessProfiles.length > 0) {
    response.businessProfiles = response.businessProfiles.map(profile => ({
      ...profile,
      companyName: profile.companyName || (profile as any).name,
      isActive: profile.isActive !== undefined ? profile.isActive : (profile.status === 'ACTIVE'),
    }));
  }

  return response;
}

export async function fetchUsersForBusinessProfileByGstin(gstin: string, params?: { page?: number; size?: number }): Promise<Page<UserDto>> {
  const queryParams = new URLSearchParams();
  if (params?.page !== undefined) queryParams.append('page', params.page.toString());
  if (params?.size !== undefined) queryParams.append('size', params.size.toString());
  const queryString = queryParams.toString();

  const endpoint = `/business-profiles/by-gstin/${encodeURIComponent(gstin)}/users${queryString ? `?${queryString}` : ''}`;
  const data = await fetchAPI<Page<UserDto> | undefined>(endpoint);
  return data ?? { content: [], totalPages: 0, totalElements: 0, size: params?.size ?? 10, number: params?.page ?? 0, first: true, last: true, empty: true };
}

export type BusinessProfileMemberRole = "OWNER" | "MANAGER" | "STAFF" | string;

export interface AddBusinessProfileMemberRequest {
  userId: string;
  role: BusinessProfileMemberRole;
}

export async function addBusinessProfileMember(businessId: string, memberData: AddBusinessProfileMemberRequest): Promise<any> {
  return fetchAPI<any>(`/business-profiles/${businessId}/members`, {
    method: 'POST',
    body: JSON.stringify(memberData),
  });
}

export async function removeBusinessProfileMember(businessId: string, userId: string): Promise<void> {
  return fetchAPI<void>(`/business-profiles/${businessId}/members/${userId}`, {
    method: 'DELETE',
  }, false);
}


// === STAFF MANAGEMENT ===
export interface StaffDto {
  id: string; // Changed from number to string to align with other IDs like UserDto
  userId: string;
  user?: UserDto | null;
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

export async function fetchStaffById(staffId: number | string): Promise<StaffDto> { // Allow string for consistency if needed
  return fetchAPI<StaffDto>(`/staff/${staffId}`);
}

export async function createStaffMember(userId: number | string, staffData: CreateStaffRequest): Promise<StaffDto> {
  return fetchAPI<StaffDto>(`/users/${userId}/staff`, {
    method: 'POST',
    body: JSON.stringify(staffData),
  });
}

export async function updateStaffMember(staffId: number | string, staffData: UpdateStaffRequest): Promise<StaffDto> {
  return fetchAPI<StaffDto>(`/staff/${staffId}`, {
    method: 'PUT', // Changed to PUT as per many typical update patterns, PATCH also viable
    body: JSON.stringify(staffData),
  });
}

export async function updateStaffRoles(userId: string, roles: string[]): Promise<StaffDto> {
  return fetchAPI<StaffDto>(`/users/${userId}/staff-roles`, {
    method: 'PUT',
    body: JSON.stringify({ roles }),
  });
}

export async function deleteStaffMember(staffId: number | string): Promise<void> {
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
  costPrice?: number | null;
  quantity?: number | null; // Made nullable to match API
  barcode?: string | null;
  color?: string | null;
  size?: string | null;
  title?: string | null;
  images?: string[] | null;
  capacity?: string | null;
  dimension?: { length?: number; width?: number; height?: number; unit?: string } | null;
  weight?: number | null;
  status?: 'ACTIVE' | 'DRAFT' | 'ARCHIVED' | 'OUT_OF_STOCK' | string | null;
  mrp?: number | null;
  sellingPrice?: number | null;
  purchaseCost?: {
    mrp?: number;
    consumerDiscountRate?: number;
    traderDiscountRate?: number;
    cashDiscountRate?: number;
    createdAt?: string;
    consumerDiscountAmount?: number;
    traderDiscountAmount?: number;
    cashDiscountAmount?: number;
    costPrice?: number;
  } | null;
  createdAt?: string;
  updatedAt?: string;
}


export interface ProductDto {
  id: string;
  name: string;
  brand?: string | null;
  category?: string | null;
  subCategory?: string | null;
  hsnCode?: string | null;
  gstTaxRate?: number | null;
  description?: string | null;
  status?: 'ACTIVE' | 'DRAFT' | 'ARCHIVED' | 'OUT_OF_STOCK' | string | null;
  sku?: string | null;
  barcode?: string | null;
  costPrice?: number | null;
  imageUrls?: string[] | null;
  weight?: number | null;
  dimensions?: string | null;
  isFeatured?: boolean | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  tags?: string[] | null;
  variants?: ProductVariantDto[] | null;
  createdAt?: string;
  updatedAt?: string;
  title?: string | null;
  manufacturedBy?: string | null;
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
  title?: string | null;
  manufacturedBy?: string | null;
}


export interface UpdateProductRequest {
  name?: string;
  brand?: string;
  category?: string;
  subCategory?: string | null;
  hsnCode?: string | null;
  description?: string | null;
  gstTaxRate?: number | null;
  tags?: string[] | null;
  status?: 'ACTIVE' | 'DRAFT' | 'ARCHIVED' | 'OUT_OF_STOCK' | string | null;
  title?: string | null;
  manufacturedBy?: string | null;
}

export interface AddProductVariantsRequest {
  color?: string[];
  size?: string[];
}

export interface UpdateVariantRequest {
  id?: string; // Included ID as per sample payload, though usually in path
  title?: string | null;
  color?: string | null;
  size?: string | null;
  sku?: string | null;
  barcode?: string | null;
  capacity?: string | null;
  dimension?: { length?: number; width?: number; height?: number; unit?: string } | null;
  weight?: number | null;
  status?: 'ACTIVE' | 'DRAFT' | 'ARCHIVED' | 'OUT_OF_STOCK' | string;
  mrp?: number | null;
  sellingPrice?: number | null;
  quantity?: number | null; // Added
  imageUrls?: string[] | null;
  allowCriticalFieldUpdates?: boolean;
  purchaseCost?: { // Added purchaseCost structure
    mrp?: number;
    consumerDiscountRate?: number;
    traderDiscountRate?: number;
    cashDiscountRate?: number;
    createdAt?: string; // Typically not sent in request, but matching sample
    consumerDiscountAmount?: number;
    traderDiscountAmount?: number;
    cashDiscountAmount?: number;
    costPrice?: number;
  } | null;
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
    method: 'PUT', // Changed from PATCH to PUT
    body: JSON.stringify(productData),
  });
}

export async function deleteProduct(id: string): Promise<void> {
  return fetchAPI<void>(`/products/${id}`, {
    method: 'DELETE',
  }, false);
}

export async function addMultipleVariants(productId: string, data: AddProductVariantsRequest): Promise<ProductDto> {
  return fetchAPI<ProductDto>(`/products/${productId}/variants`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateProductVariant(productId: string, variantId: string, variantData: UpdateVariantRequest): Promise<ProductVariantDto> {
  return fetchAPI<ProductVariantDto>(`/products/${productId}/variants/${variantId}`, {
    method: 'PUT', // Assuming PATCH for partial updates, PUT could also be used
    body: JSON.stringify(variantData),
  });
}

export async function deleteProductVariant(productId: string, variantId: string): Promise<void> {
  return fetchAPI<void>(`/products/${productId}/variants/${variantId}`, {
    method: 'DELETE',
  }, false);
}

// ORDER FLOW SPECIFIC DTOs & Functions
export interface ProductSearchRequest {
  keyword: string;
  page?: number;
  size?: number;
  sort?: string;
}
export interface ProductSearchResultDto {
    id: string;
    name: string;
    brand?: string | null;
    category?: string | null;
    sku?: string | null;
    title?: string | null;
    description?: string | null;
    status?: string | null;
    variants?: ProductVariantDto[] | null;
    imageUrls?: string[] | null;
    gstTaxRate?: number | null;
    hsnCode?: string | null;
}

export interface QuickCreateProductRequest {
    name: string;
    brand: string;
    gstTaxRate: number;
    category: string;
    subCategory: string;
    color: string;
    size: string;
    mrp: number;
    consumerDiscount: number;
    status: string;
}
export interface QuickCreateProductResponse extends ProductDto {}


export interface OrderItemRequest {
    productId: string;
    productName: string;
    variantId: string;
    variantName: string;
    size?: string | null;
    color?: string | null;
    quantity: number;
    mrp: number;
    unitPrice: number;
    taxableAmount: number;
    discountRate?: number | null;
    discountAmount?: number | null;
    hsnCode?: string | null;
    gstTaxRate?: number | null;
}

export interface CustomerDetailsDto {
    userId?: string | null;
    name?: string | null;
    phone?: string | null;
    email?: string | null;
    billingAddress?: AddressCreateDto | null;
    shippingAddress?: AddressCreateDto | null;
    businessProfileId?: string | null;
    companyName?: string | null;
    gstin?: string | null;
    stateCode?: string | null;
}

export interface CreateOrderRequest {
    placedByUserId: string;
    businessProfileId?: string | null;
    customerDetails?: CustomerDetailsDto | null;
    items: OrderItemRequest[];
    paymentMethod?: string | null;
    status?: string;
    notes?: string | null;
}

export interface PaymentDetailRequest {
    paymentMode: string;
    amount: number;
    transactionId?: string | null;
    status: 'PENDING' | 'SUCCESS' | 'FAILED' | string;
}

export interface TotalGstDto {
    igstRate?: number | null;
    igstAmount?: number | null;
    cgstRate?: number | null;
    cgstAmount?: number | null;
    sgstRate?: number | null;
    sgstAmount?: number | null;
}

export interface PaymentSummaryDto {
    totalItems: number;
    totalTaxableAmount: number;
    totalGst: TotalGstDto;
    totalDiscountAmount: number;
    shippingCharges: number;
    totalAmount: number;
}

export interface OrderDto {
    id: string;
    orderNumber?: string | null;
    placedByUserId: string;
    user?: UserDto | null;
    businessProfileId?: string | null;
    businessProfile?: BusinessProfileDto | null;
    customerDetails?: CustomerDetailsDto | null;
    items: (OrderItemRequest & {id?: string; product?: ProductDto | null, variant?: ProductVariantDto | null})[];
    totalAmount: number;
    discount?: number | null;
    taxAmount?: number | null;
    shippingAddress?: AddressDto | null;
    billingAddress?: AddressDto | null;
    status: string;
    paymentDetails?: PaymentDetailRequest[] | null;
    paymentSummary?: PaymentSummaryDto | null;
    paymentMethod?: string | null;
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
  size: number = 20,
  sort: string = 'name,asc'
): Promise<Page<ProductSearchResultDto>> {
  const queryParams = new URLSearchParams();
  queryParams.append('keyword', keyword);
  queryParams.append('page', page.toString());
  queryParams.append('size', size.toString());
  queryParams.append('sort', sort);

  const queryString = queryParams.toString();
  const data = await fetchAPI<Page<ProductSearchResultDto> | undefined>(`/products/search?${queryString}`);

  if (data && Array.isArray(data.content)) {
    return data;
  }
  return { content: [], totalPages: 0, totalElements: 0, size: size, number: page, first: true, last: true, empty: true };
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

export async function fetchOrders(params?: { 
    sortBy?: string; 
    sortDir?: 'asc' | 'desc'; 
    status?: string; 
    createdFrom?: string; 
    createdTo?: string; 
    userId?: string;
    businessProfileId?: string;
    page?: number; 
    size?: number;
}): Promise<Page<OrderDto>> {
    const queryParams = new URLSearchParams();
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.sortDir) queryParams.append('sortDir', params.sortDir);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.createdFrom) queryParams.append('createdFrom', params.createdFrom);
    if (params?.createdTo) queryParams.append('createdTo', params.createdTo);
    if (params?.userId) queryParams.append('userId', params.userId);
    if (params?.businessProfileId) queryParams.append('businessProfileId', params.businessProfileId);
    if (params?.page !== undefined) queryParams.append('page', params.page.toString());
    if (params?.size !== undefined) queryParams.append('size', params.size.toString());

    const queryString = queryParams.toString();
    const data = await fetchAPI<Page<OrderDto> | undefined>(`/orders${queryString ? `?${queryString}` : ''}`);
    return data ?? { content: [], totalPages: 0, totalElements: 0, size: params?.size ?? 10, number: params?.page ?? 0, first: true, last: true, empty: true };
}

export async function searchOrders(keyword: string, page: number = 0, size: number = 10, sort: string = 'createdAt,desc'): Promise<Page<OrderDto>> {
    const queryParams = new URLSearchParams();
    queryParams.append('keyword', keyword);
    queryParams.append('page', page.toString());
    queryParams.append('size', size.toString());
    queryParams.append('sort', sort);

    const queryString = queryParams.toString();
    const data = await fetchAPI<Page<OrderDto> | undefined>(`/orders/search?${queryString}`);
    return data ?? { content: [], totalPages: 0, totalElements: 0, size: size, number: page, first: true, last: true, empty: true };
}

export async function fetchOrderById(orderId: string): Promise<OrderDto> {
    return fetchAPI<OrderDto>(`/orders/${orderId}`);
}

export async function updateOrderStatus(orderId: string, newStatus: string): Promise<OrderDto> {
    return fetchAPI<OrderDto>(`/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ newStatus }),
    });
}


// === PROCUREMENT MANAGEMENT ===

export interface ProcurementItemDto {
    id?: string;
    productId: string;
    productName: string;
    variantId: string;
    variantName: string;
    quantity: number;
    unitPrice: number;
}

// This function is no longer needed as per the issue description
// export async function fetchProcurementStatuses(): Promise<string[]> {
//   return fetchAPI<string[]>('/meta/procurement/statuses');
// }

export interface ProcurementPaymentDto {
    id?: string;
    amount: number;
    paymentDate: string;
    paymentMethod: string;
    referenceNumber?: string;
    notes?: string;
    cashDiscountApplied?: boolean;
    cashDiscountAmount?: number;
    createdAt?: string;
}

export interface ProcurementDto {
    id?: string;
    businessProfileId: string;
    businessProfile?: BusinessProfileDto;
    invoiceNumber: string;
    invoiceAmount: number;
    creditPeriod: number;
    cashDiscountPercentage?: number;
    invoiceDate: string;
    receiptDate: string;
    dueDate?: string;
    paymentStatus?: string;
    totalPaidAmount?: number;
    remainingAmount?: number;
    payments?: ProcurementPaymentDto[];
    notes?: string;
    invoiceImage?: string;
    invoiceImageUrl?: string;
    status?: string;
    items: ProcurementItemDto[];
    createdAt?: string;
    updatedAt?: string;
}

export interface CreateProcurementRequest {
    businessProfileId: string;
    invoiceNumber: string;
    invoiceAmount: number;
    creditPeriod: number;
    cashDiscountPercentage?: number;
    invoiceDate: string;
    receiptDate: string;
    notes?: string;
    items?: ProcurementItemDto[];
    invoiceImage?: string;
}

export interface UpdateProcurementRequest {
    businessProfileId?: string;
    invoiceNumber?: string;
    invoiceAmount?: number;
    creditPeriod?: number;
    cashDiscountPercentage?: number;
    invoiceDate?: string;
    receiptDate?: string;
    notes?: string;
    items?: ProcurementItemDto[];
    invoiceImage?: string;
}

export async function createProcurement(data: CreateProcurementRequest): Promise<ProcurementDto> {
    return fetchAPI<ProcurementDto>('/procurements', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export async function fetchProcurements(params?: { 
    sortBy?: string; 
    sortDir?: 'asc' | 'desc'; 
    status?: string; 
    createdFrom?: string; 
    createdTo?: string; 
    businessProfileId?: string;
    page?: number; 
    size?: number;
}): Promise<Page<ProcurementDto>> {
    const queryParams = new URLSearchParams();
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.sortDir) queryParams.append('sortDir', params.sortDir);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.createdFrom) queryParams.append('createdFrom', params.createdFrom);
    if (params?.createdTo) queryParams.append('createdTo', params.createdTo);
    if (params?.businessProfileId) queryParams.append('businessProfileId', params.businessProfileId);
    if (params?.page !== undefined) queryParams.append('page', params.page.toString());
    if (params?.size !== undefined) queryParams.append('size', params.size.toString());

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/procurements?${queryString}` : '/procurements';

    const data = await fetchAPI<Page<ProcurementDto> | undefined>(endpoint);
    return data ?? { content: [], totalPages: 0, totalElements: 0, size: params?.size || 10, number: params?.page || 0, first: true, last: true, empty: true };
}

export async function searchProcurements(
    keyword: string,
    page: number = 0,
    size: number = 20,
    sort: string = 'createdAt,desc'
): Promise<Page<ProcurementDto>> {
    const queryParams = new URLSearchParams();
    queryParams.append('keyword', keyword);
    queryParams.append('page', page.toString());
    queryParams.append('size', size.toString());
    queryParams.append('sort', sort);

    const queryString = queryParams.toString();
    const data = await fetchAPI<Page<ProcurementDto> | undefined>(`/procurements/search?${queryString}`);
    return data ?? { content: [], totalPages: 0, totalElements: 0, size: size, number: page, first: true, last: true, empty: true };
}

export async function fetchProcurementById(procurementId: string): Promise<ProcurementDto> {
    return fetchAPI<ProcurementDto>(`/procurements/${procurementId}`);
}

export async function updateProcurement(procurementId: string, data: UpdateProcurementRequest): Promise<ProcurementDto> {
    return fetchAPI<ProcurementDto>(`/procurements/${procurementId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

export async function updateProcurementStatus(procurementId: string, newStatus: string): Promise<ProcurementDto> {
    return fetchAPI<ProcurementDto>(`/procurements/${procurementId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ newStatus }),
    });
}

export async function deleteProcurement(procurementId: string): Promise<void> {
    return fetchAPI<void>(`/procurements/${procurementId}`, {
        method: 'DELETE',
    }, false);
}

export interface ProcurementPaymentRequest {
    amount: number;
    paymentDate: string;
    paymentMethod: string;
    referenceNumber?: string;
    notes?: string;
    applyCashDiscount?: boolean;
}

export interface ProcurementDashboardDto {
    currentMonthTotal: number;
    pendingAmount: number;
    dueCount: number;
    dueAmount: number;
}

// === DASHBOARD INTERFACES ===
export interface ProductTopSellingDto {
    id: string;
    name: string;
    quantity: number;
    revenue: number;
    imageUrl?: string;
}

export interface ProductSummaryDto {
    totalProducts: number;
    activeProducts: number;
    outOfStockProducts: number;
    recentlyAddedCount: number;
}

export interface ProductCategoryBreakdownDto {
    categoryName: string;
    productCount: number;
    percentage: number;
}

export interface ProcurementVendorBreakdownDto {
    vendorName: string;
    procurementCount: number;
    totalAmount: number;
    percentage: number;
}

export interface ProcurementSummaryDto {
    totalProcurements: number;
    pendingPayments: number;
    totalSpent: number;
    averageOrderValue: number;
}

export interface ProcurementRecentDto {
    id: string;
    invoiceNumber: string;
    vendorName: string;
    amount: number;
    date: string;
    status: string;
}

export interface ProcurementOutstandingDto {
    id: string;
    invoiceNumber: string;
    vendorName: string;
    amount: number;
    dueDate: string;
    daysOverdue: number;
}

export interface OrderTrendsDto {
    period: string; // e.g., "Jan", "Feb", etc. or dates
    orderCount: number;
    revenue: number;
}

export interface OrderSummaryDto {
    totalOrders: number;
    pendingOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
}

export interface OrderRecentDto {
    id: string;
    orderNumber: string;
    customerName: string;
    amount: number;
    date: string;
    status: string;
}

export interface InvoiceTrendsDto {
    period: string;
    invoiceCount: number;
    amount: number;
}

export interface InvoiceSummaryDto {
    totalInvoices: number;
    paidInvoices: number;
    totalAmount: number;
    outstandingAmount: number;
}

export interface InvoiceOutstandingDto {
    id: string;
    invoiceNumber: string;
    customerName: string;
    amount: number;
    dueDate: string;
    daysOverdue: number;
}

export interface CustomerTopDto {
    id: string;
    name: string;
    totalOrders: number;
    totalSpent: number;
    lastOrderDate: string;
}

export async function makeProcurementPayment(procurementId: string, paymentData: ProcurementPaymentRequest): Promise<ProcurementDto> {
    return fetchAPI<ProcurementDto>(`/procurements/${procurementId}/payments`, {
        method: 'POST',
        body: JSON.stringify(paymentData),
    });
}

// === DASHBOARD API FUNCTIONS ===
export async function fetchProcurementDashboard(): Promise<ProcurementDashboardDto> {
    return fetchAPI<ProcurementDashboardDto>('/procurements/dashboard');
}

export async function fetchProductsTopSelling(): Promise<ProductTopSellingDto[]> {
    return fetchAPI<ProductTopSellingDto[]>('/dashboard/products/top-selling');
}

export async function fetchProductsSummary(): Promise<ProductSummaryDto> {
    return fetchAPI<ProductSummaryDto>('/dashboard/products/summary');
}

export async function fetchProductsCategoryBreakdown(): Promise<ProductCategoryBreakdownDto[]> {
    return fetchAPI<ProductCategoryBreakdownDto[]>('/dashboard/products/category-breakdown');
}

export async function fetchProcurementsVendorBreakdown(): Promise<ProcurementVendorBreakdownDto[]> {
    return fetchAPI<ProcurementVendorBreakdownDto[]>('/dashboard/procurements/vendor-breakdown');
}

export async function fetchProcurementsSummary(): Promise<ProcurementSummaryDto> {
    return fetchAPI<ProcurementSummaryDto>('/dashboard/procurements/summary');
}

export async function fetchProcurementsRecent(): Promise<ProcurementRecentDto[]> {
    return fetchAPI<ProcurementRecentDto[]>('/dashboard/procurements/recent');
}

export async function fetchProcurementsOutstanding(): Promise<ProcurementOutstandingDto[]> {
    return fetchAPI<ProcurementOutstandingDto[]>('/dashboard/procurements/outstanding');
}

export async function fetchOrdersTrends(): Promise<OrderTrendsDto[]> {
    return fetchAPI<OrderTrendsDto[]>('/dashboard/orders/trends');
}

export async function fetchOrdersSummary(): Promise<OrderSummaryDto> {
    return fetchAPI<OrderSummaryDto>('/dashboard/orders/summary');
}

export async function fetchOrdersRecent(): Promise<OrderRecentDto[]> {
    return fetchAPI<OrderRecentDto[]>('/dashboard/orders/recent');
}

export async function fetchInvoicesTrends(): Promise<InvoiceTrendsDto[]> {
    return fetchAPI<InvoiceTrendsDto[]>('/dashboard/invoices/trends');
}

export async function fetchInvoicesSummary(): Promise<InvoiceSummaryDto> {
    return fetchAPI<InvoiceSummaryDto>('/dashboard/invoices/summary');
}

export async function fetchInvoicesOutstanding(): Promise<InvoiceOutstandingDto[]> {
    return fetchAPI<InvoiceOutstandingDto[]>('/dashboard/invoices/outstanding');
}

export async function fetchCustomersTop(): Promise<CustomerTopDto[]> {
    return fetchAPI<CustomerTopDto[]>('/dashboard/customers/top');
}


// === V2 META ENDPOINTS ===

export interface InventoryAdjustmentReason extends MetaItem {}

export interface NotificationTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  type: string;
  createdAt?: string;
  updatedAt?: string;
}

export type OrderStatus = string;
export type PaymentType = string;
export type UserRoleMeta = string;


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

export interface CreateCategoryRequest {
  name: string;
  description?: string | null;
  parentId?: string | null; // Changed to string to match API for ID
}
export async function createProductCategory(data: CreateCategoryRequest): Promise<Category> {
  return fetchAPI<Category>('/meta/product/categories', { method: 'POST', body: JSON.stringify(data) });
}

export interface UpdateCategoryRequest extends Partial<CreateCategoryRequest> {}
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


export async function fetchOrderStatuses(): Promise<OrderStatus[]> {
  const data = await fetchAPI<string[] | undefined>('/meta/order/statuses');
  return Array.isArray(data) ? data : [];
}

export async function fetchPaymentTypes(): Promise<PaymentType[]> {
  const data = await fetchAPI<string[] | undefined>('/meta/order/payment-types');
  return Array.isArray(data) ? data : [];
}

export async function fetchInventoryAdjustmentReasons(): Promise<InventoryAdjustmentReason[]> {
  const data = await fetchAPI<InventoryAdjustmentReason[] | undefined>('/meta/inventory/adjustment-reasons');
  return Array.isArray(data) ? data : [];
}

export async function fetchUserRolesMeta(): Promise<UserRoleMeta[]> {
  const data = await fetchAPI<string[] | undefined>('/meta/user/roles');
  return Array.isArray(data) ? data : [];
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
export interface CurrentUserDto extends UserDto {}
export async function fetchCurrentUser(): Promise<CurrentUserDto> {
  return fetchAPI<CurrentUserDto>('/users/me');
}
export async function updateCurrentUser(data: UpdateUserRequest): Promise<CurrentUserDto> {
  return fetchAPI<CurrentUserDto>('/users/me', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}
