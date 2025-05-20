
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
} from "@/components/ui/alert-dialog";
import { PlusCircle, Search, Edit3, Trash2, Filter, Package } from "lucide-react";
import { fetchProducts, deleteProduct, type Product, fetchProductCategoriesFlat, fetchProductBrands, type Category, type Brand } from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface CategoriesMap {
  [key: number]: string;
}

interface BrandsMap {
  [key: number]: string;
}

export default function ProductsPage() {
  const [products, setProducts] = React.useState<Product[]>([]);
  const [categoriesMap, setCategoriesMap] = React.useState<CategoriesMap>({});
  const [brandsMap, setBrandsMap] = React.useState<BrandsMap>({});
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const { toast } = useToast();

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [productsData, categoriesData, brandsData] = await Promise.all([
        fetchProducts(),
        fetchProductCategoriesFlat(),
        fetchProductBrands()
      ]);
      setProducts(productsData);

      const catMap: CategoriesMap = {};
      categoriesData.forEach(cat => { catMap[cat.id] = cat.name; });
      setCategoriesMap(catMap);

      const brMap: BrandsMap = {};
      brandsData.forEach(brand => { brMap[brand.id] = brand.name; });
      setBrandsMap(brMap);

    } catch (err: any) {
      setError(err.message || "Failed to fetch data.");
      toast({ title: "Error", description: err.message || "Failed to fetch data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDeleteProduct = async (productId: number) => {
    try {
      await deleteProduct(productId);
      toast({ title: "Success", description: "Product deleted successfully." });
      setProducts(prevProducts => prevProducts.filter(p => p.id !== productId));
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to delete product.", variant: "destructive" });
    }
  };

  const filteredProducts = products.filter(product => {
    const categoryName = product.categoryId ? categoriesMap[product.categoryId]?.toLowerCase() : "";
    const brandName = product.brandId ? brandsMap[product.brandId]?.toLowerCase() : "";
    const lowerSearchTerm = searchTerm.toLowerCase();

    return (
      product.name.toLowerCase().includes(lowerSearchTerm) ||
      (product.sku && product.sku.toLowerCase().includes(lowerSearchTerm)) ||
      (categoryName && categoryName.includes(lowerSearchTerm)) ||
      (brandName && brandName.includes(lowerSearchTerm))
    );
  });

  const getStatusColor = (status?: string | null) => {
    switch (status) {
      case 'ACTIVE': return "bg-green-100 text-green-700";
      case 'OUT_OF_STOCK': return "bg-red-100 text-red-700";
      case 'DRAFT': return "bg-yellow-100 text-yellow-700";
      case 'ARCHIVED': return "bg-gray-100 text-gray-700";
      default: return "bg-blue-100 text-blue-700"; // For null or other statuses
    }
  };
  
  const formatPrice = (price?: number | null) => {
    if (price === null || price === undefined) return "N/A";
    return `$${price.toFixed(2)}`;
  }

  const getCategoryName = (categoryId?: number | null) => {
    return categoryId && categoriesMap[categoryId] ? categoriesMap[categoryId] : "N/A";
  }

  const getBrandName = (brandId?: number | null) => {
    return brandId && brandsMap[brandId] ? brandsMap[brandId] : "N/A";
  }


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
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="outline" disabled> {/* Filters can be implemented later */}
                <Filter className="mr-2 h-4 w-4" /> Filters
              </Button>
            </div>
          </div>
          <CardDescription>View, edit, and manage all your products.</CardDescription>
        </CardHeader>
        <CardContent>
          {error && <p className="text-destructive text-center">{error}</p>}
          <Table>
            <TableHeader>
              <TableRow><TableHead className="w-[60px] md:w-[80px]">Image</TableHead><TableHead>Name</TableHead><TableHead className="hidden md:table-cell">Category</TableHead><TableHead className="hidden lg:table-cell">Brand</TableHead><TableHead>Price</TableHead><TableHead className="hidden sm:table-cell">Stock</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={`skeleton-${index}`}><TableCell><Skeleton className="h-10 w-10 rounded-md" /></TableCell><TableCell><Skeleton className="h-4 w-3/4" /></TableCell><TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-1/2" /></TableCell><TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-1/2" /></TableCell><TableCell><Skeleton className="h-4 w-1/4" /></TableCell><TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-1/4" /></TableCell><TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell><TableCell className="text-right space-x-1"><Skeleton className="h-8 w-8 inline-block rounded" /><Skeleton className="h-8 w-8 inline-block rounded" /></TableCell></TableRow>
                ))
              ) : filteredProducts.length === 0 && !error ? (
                 <TableRow><TableCell colSpan={8} className="text-center py-10"><Package className="mx-auto h-12 w-12 text-muted-foreground mb-2"/><p className="text-muted-foreground">No products found.</p>{products.length > 0 && searchTerm && <p className="text-sm text-muted-foreground">Try adjusting your search term.</p>}</TableCell></TableRow>
              ) : (
                filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <Image 
                        src={product.imageUrls && product.imageUrls.length > 0 ? product.imageUrls[0] : "https://placehold.co/40x40.png"} 
                        alt={product.name} 
                        width={40} 
                        height={40} 
                        className="rounded-md aspect-square object-cover"
                        data-ai-hint={getCategoryName(product.categoryId).toLowerCase().split(' ')[0] || "product"}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell className="hidden md:table-cell">{getCategoryName(product.categoryId)}</TableCell>
                    <TableCell className="hidden lg:table-cell">{getBrandName(product.brandId)}</TableCell>
                    <TableCell>{formatPrice(product.unitPrice)}</TableCell>
                    <TableCell className="hidden sm:table-cell">{product.quantity}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 text-xs rounded-full whitespace-nowrap ${getStatusColor(product.status)}`}>
                        {product.status ? product.status.replace(/_/g, ' ') : "N/A"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="hover:text-primary" asChild>
                        <Link href={`/products/${product.id}/edit`}> {/* TODO: Implement edit page */}
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
                              This action cannot be undone. This will permanently delete the product "{product.name}".
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
        </CardContent>
      </Card>

      <Card className="shadow-md">
        <CardHeader>
            <CardTitle>Quick Product Creation</CardTitle>
            <CardDescription>For quickly adding draft products, e.g., during order taking.</CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-sm text-muted-foreground">
                Feature for inline product creation (e.g. in a modal during order entry) will be implemented here.
                This allows users to quickly add a draft product with minimal details if it's not found during an order.
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

