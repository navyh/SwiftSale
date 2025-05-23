
"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PlusCircle, Search, Edit3, Trash2, Filter, Package, ChevronLeft, ChevronRight } from "lucide-react";
import { 
  fetchProducts, 
  deleteProduct, 
  type ProductDto, 
  type Page,
  type ProductVariantDto
} from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

const defaultPageData: Page<ProductDto> = {
  content: [],
  totalPages: 0,
  totalElements: 0,
  size: 10,
  number: 0,
  first: true,
  last: true,
  empty: true,
};

export default function ProductsPage() {
  const [products, setProducts] = React.useState<ProductDto[]>([]);
  const [productsPage, setProductsPage] = React.useState<Page<ProductDto>>(defaultPageData);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const { toast } = useToast();
  
  const [currentPage, setCurrentPage] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(10);

  const loadData = React.useCallback(async (page: number, size: number, search: string) => {
    setIsLoading(true);
    setError(null);
    console.log("Loading products with params:", { page, size, search });
    try {
      const productsData = await fetchProducts({ page, size, search });
      if (productsData && Array.isArray(productsData.content)) {
        console.log("Fetched products content:", productsData.content);
        setProducts(productsData.content);
        setProductsPage(productsData);
      } else {
        console.warn("No products content found or data is not in expected format:", productsData);
        setProducts([]);
        setProductsPage(defaultPageData);
      }
    } catch (err: any) {
      console.error("Error fetching products:", err);
      setError(err.message || "Failed to fetch data.");
      toast({ title: "Error", description: err.message || "Failed to fetch data.", variant: "destructive" });
      setProducts([]);
      setProductsPage(defaultPageData);
    } finally {
      setIsLoading(false);
    }
  }, [toast]); // pageSize and searchTerm are passed as args, so not needed in useCallback deps unless they influence loadData's definition

  React.useEffect(() => {
    loadData(currentPage, pageSize, searchTerm);
  }, [loadData, currentPage, pageSize, searchTerm]);

  const handleDeleteProduct = async (productId: string) => {
    try {
      await deleteProduct(productId);
      toast({ title: "Success", description: "Product deleted successfully." });
      // Refresh data for the current page
      loadData(currentPage, pageSize, searchTerm);
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to delete product.", variant: "destructive" });
    }
  };

  const filteredProducts = React.useMemo(() => {
    if (!products || products.length === 0) return [];
    
    const lowerSearchTerm = searchTerm.toLowerCase().trim();
    if (!lowerSearchTerm) return products; // If search term is empty, show all products from current page

    return products.filter(product => {
      const productName = product.name?.toLowerCase() || "";
      const productSku = product.sku?.toLowerCase() || "";
      const categoryName = product.category?.toLowerCase() || "";
      const brandName = product.brand?.toLowerCase() || "";

      return (
        productName.includes(lowerSearchTerm) ||
        productSku.includes(lowerSearchTerm) ||
        categoryName.includes(lowerSearchTerm) ||
        brandName.includes(lowerSearchTerm)
      );
    });
  }, [products, searchTerm]);

  const getStatusColor = (status?: string | null) => {
    if (!status) return "bg-gray-100 text-gray-700";
    switch (status.toUpperCase()) {
      case 'ACTIVE': return "bg-green-100 text-green-700";
      case 'OUT_OF_STOCK': return "bg-red-100 text-red-700";
      case 'DRAFT': return "bg-yellow-100 text-yellow-700";
      case 'ARCHIVED': return "bg-gray-100 text-gray-700";
      default: return "bg-blue-100 text-blue-700";
    }
  };
  
  const formatPrice = (variants?: ProductVariantDto[] | null) => {
    if (variants && variants.length > 0 && variants[0]?.sellingPrice !== null && variants[0]?.sellingPrice !== undefined) {
      return `₹${variants[0].sellingPrice.toFixed(2)}`;
    }
    return "N/A";
  }

  const getStock = (variants?: ProductVariantDto[] | null) => {
    if (variants && variants.length > 0 && variants[0]?.quantity !== null && variants[0]?.quantity !== undefined) {
      return variants[0].quantity;
    }
    return "N/A";
  }
  
  const handleSearchDebounced = React.useCallback(
    debounce((term: string) => {
      setSearchTerm(term);
      setCurrentPage(0); // Reset to first page on new search
    }, 500),
    []
  );

  function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number) {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    return (...args: Parameters<F>): Promise<ReturnType<F>> =>
      new Promise(resolve => {
        if (timeout) {
          clearTimeout(timeout);
        }
        timeout = setTimeout(() => resolve(func(...args)), waitFor);
      });
  }

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  // console.log("ProductsPage render:", { isLoading, error, products, filteredProducts });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center">
            <Package className="mr-3 h-7 w-7" /> Product Management
          </h1>
          <p className="text-muted-foreground">Manage your product inventory, variants, and details.</p>
        </div>
        <Link href="/products/new" passHref>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Product
          </Button>
        </Link>
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <CardTitle>All Products</CardTitle>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-grow md:flex-grow-0">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search products..."
                  className="pl-8 w-full md:w-[250px]"
                  onChange={(e) => handleSearchDebounced(e.target.value)}
                />
              </div>
              <Button variant="outline" disabled> {/* Filters button can be enabled later */}
                <Filter className="mr-2 h-4 w-4" /> Filters
              </Button>
            </div>
          </div>
          <CardDescription>View, edit, and manage all your products.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px] md:w-[80px]">Image</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Category</TableHead>
                <TableHead className="hidden lg:table-cell">Brand</TableHead>
                <TableHead>Price</TableHead>
                <TableHead className="hidden sm:table-cell">Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: pageSize }).map((_, index) => (
                  <TableRow key={`skeleton-${index}`}>
                    <TableCell><Skeleton className="h-10 w-10 rounded-md" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-3/4" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-1/2" /></TableCell>
                    <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-1/2" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-1/4" /></TableCell>
                    <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-1/4" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell className="text-right space-x-1"><Skeleton className="h-8 w-8 inline-block rounded" /><Skeleton className="h-8 w-8 inline-block rounded" /></TableCell>
                  </TableRow>
                ))
              ) : error ? (
                <TableRow><TableCell colSpan={8} className="text-center py-10 text-destructive">{error}</TableCell></TableRow>
              ) : filteredProducts.length === 0 ? (
                 <TableRow><TableCell colSpan={8} className="text-center py-10"><Package className="mx-auto h-12 w-12 text-muted-foreground mb-2"/><p className="text-muted-foreground">No products found.</p>{products.length > 0 && searchTerm && <p className="text-sm text-muted-foreground">Try adjusting your search term.</p>}</TableCell></TableRow>
              ) : (
                filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <Image 
                        src={(product.imageUrls && product.imageUrls.length > 0 ? product.imageUrls[0] : product.variants?.[0]?.images?.[0]) || "https://placehold.co/40x40.png"} 
                        alt={product.name || 'Product Image'} 
                        width={40} 
                        height={40} 
                        className="rounded-md aspect-square object-cover"
                        data-ai-hint={product.category?.toLowerCase().split(' ')[0] || "product"}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{product.name || "N/A"}</TableCell>
                    <TableCell className="hidden md:table-cell">{product.category || "N/A"}</TableCell>
                    <TableCell className="hidden lg:table-cell">{product.brand || "N/A"}</TableCell>
                    <TableCell>{formatPrice(product.variants)}</TableCell>
                    <TableCell className="hidden sm:table-cell">{getStock(product.variants)}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 text-xs rounded-full whitespace-nowrap ${getStatusColor(product.status)}`}>
                        {product.status ? product.status.replace(/_/g, ' ') : "N/A"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="hover:text-primary" asChild>
                        <Link href={`/products/${product.id}/edit`}>
                          <Edit3 className="h-4 w-4" />
                          <span className="sr-only">Edit</span>
                        </Link>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the product "{product.name || 'this product'}".
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteProduct(product.id)}
                              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
           {productsPage && productsPage.totalPages > 1 && (
             <div className="flex items-center justify-end space-x-2 py-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={productsPage.first || isLoading}
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {productsPage.number + 1} of {productsPage.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={productsPage.last || isLoading}
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* This card can be removed or updated if not needed for Product Management */}
      <Card className="shadow-md">
        <CardHeader>
            <CardTitle>Quick Product Creation</CardTitle>
            <CardDescription>For quickly adding draft products, e.g., during order taking.</CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-sm text-muted-foreground">
                This section can link to a quick create form or be part of other flows.
            </p>
            <Link href="/products/new?status=DRAFT" passHref>
             <Button variant="secondary" className="mt-4">
              <PlusCircle className="mr-2 h-4 w-4" /> Create Draft Product
            </Button>
            </Link>
        </CardContent>
      </Card>
    </div>
  );
}

