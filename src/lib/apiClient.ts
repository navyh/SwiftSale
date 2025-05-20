
// src/lib/apiClient.ts
"use client"; // To be used in client components

const API_BASE_URL = 'https://orca-app-k6zka.ondigitalocean.app/api/v1';

export interface Category {
  id: number;
  name: string;
  description?: string;
}

export interface Brand {
  id: number;
  name: string;
  description?: string;
}

export interface Supplier {
  id: number;
  name: string;
  // Add other supplier fields if needed from API
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
  // productAttributes: ProductAttributeRequest[] - Omitting for simplicity in this step
}


async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
  if (!response.ok) {
    let errorMessage = `API request failed: ${response.status} ${response.statusText}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch (e) {
      // Ignore if error response is not JSON
    }
    throw new Error(errorMessage);
  }
  if (response.status === 204) { // No Content
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

export async function fetchCategories(): Promise<Category[]> {
  return fetchAPI<Category[]>('/meta/categories');
}

export async function fetchBrands(): Promise<Brand[]> {
  return fetchAPI<Brand[]>('/meta/brands');
}

export async function fetchSuppliers(): Promise<Supplier[]> {
  // Assuming an endpoint /meta/suppliers exists, adjust if different
  return fetchAPI<Supplier[]>('/meta/suppliers');
}

export async function createProduct(productData: CreateProductRequest): Promise<any> {
  return fetchAPI<any>('/products', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(productData),
  });
}
