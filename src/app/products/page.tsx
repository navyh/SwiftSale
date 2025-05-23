
"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  PlusCircle,
  Search,
  Edit3,
  Trash2,
  Filter,
  Package,
  ChevronLeft,
  ChevronRight,
  Eye,
} from "lucide-react";
import {
  fetchProducts,
  deleteProduct,
  type ProductDto,
  type Page,
  type ProductVariantDto,
} from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

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
  const { toast } = useToast();
  const [productsPage, setProductsPage] = React.useState<Page<ProductDto>>(defaultPageData);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const [currentPage, setCurrentPage] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(10);

  const loadData = React.useCallback(async (page: number, size: number, search: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const productsData = await fetchProducts({ page, size, search });
      console.log("Fetched products data:", productsData);
      if (productsData && Array.isArray(productsData.content)) {
        setProductsPage(productsData);
      } else {
        console.warn("Unexpected products data structure:", productsData);
        setProductsPage(defaultPageData);
      }
    } catch (err: any) {
      console.error("Failed to fetch products:", err);
      setError(err.message || "Failed to fetch data.");
      toast({
        title: "Error",
        description: err.message || "Failed to fetch data.",
        variant: "destructive",
      });
      setProductsPage(defaultPageData);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    loadData(currentPage, pageSize, searchTerm);
  }, [loadData, currentPage, pageSize, searchTerm]);

  const handleDeleteProduct = async (productId: string) => {
    try {
      await deleteProduct(productId);
      toast({ title: "Success", description: "Product deleted successfully." });
      loadData(currentPage, pageSize, searchTerm);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to delete product.",
        variant: "destructive",
      });
    }
  };

  const filteredProducts = React.useMemo(() => {
    if (!productsPage.content || productsPage.content.length === 0) return [];
    return productsPage.content;
  }, [productsPage.content]);


  const getStatusColor = (status?: string | null) => {
    if (!status) return "bg-gray-100 text-gray-700";
    switch (status.toUpperCase()) {
      case "ACTIVE": return "bg-green-100 text-green-700 border-green-500/30";
      case "OUT_OF_STOCK": return "bg-red-100 text-red-700 border-red-500/30";
      case "DRAFT": return "bg-yellow-100 text-yellow-700 border-yellow-500/30";
      case "ARCHIVED": return "bg-gray-100 text-gray-700 border-gray-500/30";
      default: return "bg-blue-100 text-blue-700 border-blue-500/30";
    }
  };

  const formatPrice = (variants?: ProductVariantDto[] | null) => {
    if (variants && variants.length > 0 && variants[0]?.sellingPrice !== null && variants[0]?.sellingPrice !== undefined) {
      return `₹${variants[0].sellingPrice.toFixed(2)}`;
    }
    return "N/A";
  };

  const getStock = (variants?: ProductVariantDto[] | null) => {
    if (variants && variants.length > 0 && variants[0]?.quantity !== null && variants[0]?.quantity !== undefined) {
      return variants[0].quantity.toString();
    }
    return "N/A";
  };

  function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number) {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    return (...args: Parameters<F>): Promise<ReturnType<F>> =>
      new Promise((resolve) => {
        if (timeout) {
          clearTimeout(timeout);
        }
        timeout = setTimeout(() => resolve(func(...args)), waitFor);
      });
  }

  const handleSearchDebounced = React.useCallback(
    debounce((term: string) => {
      setSearchTerm(term);
      setCurrentPage(0);
    }, 500),
    []
  );

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };
  
  console.log("Rendering ProductsPage, isLoading:", isLoading, "error:", error, "filteredProducts length:", filteredProducts.length);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center">
            <Package className="mr-3 h-7 w-7" /> Product Management
          </h1>
          <p className="text-muted-foreground">
            Manage your product inventory, variants, and details.
          </p>
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
              <Button variant="outline" disabled>
                <Filter className="mr-2 h-4 w-4" /> Filters
              </Button>
            </div>
          </div>
          <CardDescription>
            View, edit, and manage all your products.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Desktop Table View */}
          <div className="hidden md:block">
            {isLoading ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px] md:w-[80px]">Image</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: pageSize }).map((_, index) => (
                    <TableRow key={`skeleton-desktop-${index}`}>
                      <TableCell><Skeleton className="h-10 w-10 rounded-md" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-3/4" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-1/2" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-1/2" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-1/4" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-1/4" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                      <TableCell className="text-right space-x-1">
                        <Skeleton className="h-8 w-8 inline-block rounded" />
                        <Skeleton className="h-8 w-8 inline-block rounded" />
                        <Skeleton className="h-8 w-8 inline-block rounded" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : error ? (
              <p className="text-destructive text-center py-4">{error}</p>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-10">
                <Package className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No products found.</p>
                {searchTerm && (<p className="text-sm text-muted-foreground">Try adjusting your search term.</p>)}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px] md:w-[80px]">Image</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <Image
                          src={(product.imageUrls && product.imageUrls.length > 0 ? product.imageUrls[0] : product.variants?.[0]?.images?.[0]) || "https://placehold.co/40x40.png"}
                          alt={product.name || "Product Image"}
                          width={40}
                          height={40}
                          className="rounded-md aspect-square object-cover"
                          data-ai-hint={product.category?.toLowerCase().split(" ")[0] || "product"}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{product.name || "N/A"}</TableCell>
                      <TableCell>{product.category || "N/A"}</TableCell>
                      <TableCell>{product.brand || "N/A"}</TableCell>
                      <TableCell>{formatPrice(product.variants)}</TableCell>
                      <TableCell>{getStock(product.variants)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`px-2 py-1 text-xs rounded-full whitespace-nowrap ${getStatusColor(product.status)}`}>
                          {product.status ? product.status.replace(/_/g, " ") : "N/A"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="hover:text-primary" asChild title="View Product">
                          <Link href={`/products/${product.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon" className="hover:text-primary" asChild title="Edit Product">
                          <Link href={`/products/${product.id}/edit`}>
                            <Edit3 className="h-4 w-4" />
                          </Link>
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="hover:text-destructive" title="Delete Product">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the product "{product.name || "this product"}".
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
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Mobile List View */}
          <div className="md:hidden space-y-3">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <Card key={`mobile-skeleton-${index}`} className="p-4 shadow-sm">
                  <div className="flex gap-4 items-center">
                    <Skeleton className="h-16 w-16 rounded-md shrink-0" />
                    <div className="flex-grow space-y-2">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-4 w-1/3" />
                    </div>
                    <Skeleton className="h-8 w-8 rounded-md shrink-0" />
                  </div>
                </Card>
              ))
            ) : error ? (
              <p className="text-destructive text-center py-4">{error}</p>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-10">
                <Package className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No products found.</p>
                {searchTerm && (<p className="text-sm text-muted-foreground">Try adjusting your search term.</p>)}
              </div>
            ) : (
              filteredProducts.map((product) => (
                <Card key={product.id} className="shadow-sm hover:shadow-md transition-shadow p-3">
                  <div className="flex items-start gap-3">
                    <Image
                      src={(product.imageUrls && product.imageUrls.length > 0 ? product.imageUrls[0] : product.variants?.[0]?.images?.[0]) || "https://placehold.co/64x64.png"}
                      alt={product.name || "Product Image"}
                      width={64}
                      height={64}
                      className="rounded-md aspect-square object-cover shrink-0"
                      data-ai-hint={product.category?.toLowerCase().split(" ")[0] || "item"}
                    />
                    <div className="flex-grow space-y-1">
                      <h3 className="font-semibold text-base leading-tight">{product.name || "N/A"}</h3>
                      <p className="text-xs text-muted-foreground">
                        {product.category || "N/A"} {product.brand && `| ${product.brand}`}
                      </p>
                      <div className="flex items-center gap-2 text-xs">
                        <span>Price: {formatPrice(product.variants)}</span>
                        <span>Stock: {getStock(product.variants)}</span>
                      </div>
                      <Badge variant="outline" className={`mt-1 text-xs ${getStatusColor(product.status)}`}>
                        {product.status ? product.status.replace(/_/g, " ") : "N/A"}
                      </Badge>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                       <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-primary" asChild title="View Product">
                          <Link href={`/products/${product.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-primary" asChild title="Edit Product">
                        <Link href={`/products/${product.id}/edit`}>
                          <Edit3 className="h-4 w-4" />
                        </Link>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive" title="Delete Product">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                           <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the product "{product.name || "this product"}".
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
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>

          {/* Pagination */}
          {productsPage && productsPage.totalPages > 1 && (
            <div className="flex items-center justify-end space-x-2 py-4 mt-4">
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
    </div>
  );
}

    
