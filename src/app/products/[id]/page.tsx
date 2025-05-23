
"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  fetchProductById,
  deleteProduct,
  type ProductDto,
  type ProductVariantDto,
} from "@/lib/apiClient";
import { ChevronLeft, Edit, Trash2, Package2, Tag, AlignLeft, Barcode, PackageSearch, DollarSign, Warehouse, Weight, Ruler, CheckCircle, CalendarDays, AlertCircle, Loader2, Layers, Palette, Rows } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
import { Separator } from "@/components/ui/separator";
import { format } from 'date-fns';

function DetailItem({ label, value, icon: Icon, className }: { label: string; value?: string | null | number | boolean; icon?: React.ElementType, className?: string }) {
  if (value === null || value === undefined || value === "") return null;
  let displayValue: React.ReactNode = String(value);
  if (typeof value === 'boolean') {
    displayValue = value ? <CheckCircle className="h-5 w-5 text-green-600" /> : <span className="text-muted-foreground">No</span>;
  } else if (typeof value === 'number' && (label.toLowerCase().includes('price') || label.toLowerCase().includes('mrp'))) {
     displayValue = `₹${value.toFixed(2)}`;
  }


  return (
    <div className={cn("flex flex-col space-y-0.5", className)}>
      <div className="flex items-center text-sm text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5 mr-1.5 shrink-0" />}
        <span>{label}</span>
      </div>
      <div className="text-sm font-medium pl-1">
        {displayValue}
      </div>
    </div>
  );
}

function VariantCard({ variant }: { variant: ProductVariantDto }) {
  return (
    <Card className="bg-secondary/30 shadow-sm">
      <CardHeader className="p-3">
        <CardTitle className="text-base flex justify-between items-center">
          Variant: {variant.title || `${variant.color || ''} ${variant.size || ''}`.trim() || `ID: ${variant.id.substring(0,6)}...`}
          <Badge variant={variant.status?.toUpperCase() === "ACTIVE" ? "default" : "outline"} 
                 className={variant.status?.toUpperCase() === "ACTIVE" ? "bg-green-500/20 text-green-700" : "bg-gray-500/20 text-gray-700"}>
            {variant.status || "N/A"}
          </Badge>
        </CardTitle>
        {variant.sku && <CardDescription className="text-xs">SKU: {variant.sku}</CardDescription>}
      </CardHeader>
      <CardContent className="p-3 grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-2 text-xs">
        <DetailItem label="Color" value={variant.color} icon={Palette} />
        <DetailItem label="Size" value={variant.size} icon={Rows}/>
        <DetailItem label="Selling Price" value={variant.sellingPrice} />
        <DetailItem label="MRP" value={variant.mrp} />
        <DetailItem label="Stock" value={variant.quantity} />
        <DetailItem label="Barcode" value={variant.barcode} icon={Barcode}/>
        {variant.images && variant.images.length > 0 && (
          <div className="col-span-full mt-2">
            <p className="text-xs text-muted-foreground mb-1">Variant Images:</p>
            <div className="flex gap-2 flex-wrap">
              {variant.images.map((img, idx) => (
                <Image key={idx} src={img} alt={`Variant ${variant.id} Image ${idx+1}`} width={48} height={48} className="rounded object-cover aspect-square" data-ai-hint="product variant" />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


export default function ProductDetailPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string; // ID is a string
  const { toast } = useToast();

  const [product, setProduct] = React.useState<ProductDto | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!productId) {
      toast({ title: "Error", description: "Invalid product ID.", variant: "destructive" });
      router.push("/products");
      return;
    }

    async function loadProduct() {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedProduct = await fetchProductById(productId);
        setProduct(fetchedProduct);
      } catch (err: any) {
        console.error("Error fetching product details:", err);
        setError(err.message || "Could not load product data.");
        toast({
          title: "Error Fetching Product",
          description: err.message || "Could not load product data.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }
    loadProduct();
  }, [productId, router, toast]);

  const handleDeleteProduct = async () => {
    if (!product) return;
    try {
      await deleteProduct(product.id);
      toast({ title: "Success", description: `Product "${product.name}" deleted successfully.` });
      router.push("/products");
      router.refresh();
    } catch (err: any) {
      console.error("Error deleting product:", err);
      toast({
        title: "Error Deleting Product",
        description: err.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 pb-8 animate-pulse">
        <div className="flex items-center justify-between">
           <div className="flex items-center gap-2 md:gap-4">
            <Skeleton className="h-9 w-9" />
            <div><Skeleton className="h-8 w-48 mb-1" /><Skeleton className="h-4 w-64" /></div>
          </div>
          <div className="flex gap-2"><Skeleton className="h-9 w-20" /><Skeleton className="h-9 w-20" /></div>
        </div>
        <Card className="shadow-md"><CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_,i) => <Skeleton key={i} className="h-12 w-full" />)}
          </CardContent>
        </Card>
         <Card className="shadow-md"><CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
         <Card className="shadow-md"><CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-12 w-full" /> <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-10">
        <AlertCircle className="w-16 h-16 text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-2">Error Loading Product</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={() => router.push("/products")}>Back to Product List</Button>
      </div>
    );
  }

  if (!product) {
    return <p className="text-center text-muted-foreground py-10">Product not found.</p>;
  }
  
  const productStatus = product.status ? (product.status).toUpperCase() : "N/A";

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2 md:gap-4">
          <Button variant="outline" size="icon" asChild aria-label="Back to Product List">
            <Link href="/products"><ChevronLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight flex items-center">
              <Package2 className="mr-2 h-6 w-6 sm:h-7 sm:w-7" /> {product.name}
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">Viewing details for product ID: {product.id}</p>
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" asChild className="flex-1 sm:flex-initial">
            <Link href={`/products/${product.id}/edit`}><Edit className="mr-2 h-4 w-4" /> Edit Product</Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="flex-1 sm:flex-initial">
                <Trash2 className="mr-2 h-4 w-4" /> Delete Product
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
                <AlertDialogAction onClick={handleDeleteProduct} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-md">
            <CardHeader><CardTitle className="text-lg">Basic Information</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <DetailItem label="Product Name" value={product.name} icon={Package2} />
              <DetailItem label="Brand" value={product.brand} icon={Tag} />
              <DetailItem label="Category" value={product.category} icon={Layers} />
              <DetailItem label="Sub-Category" value={product.subCategory} icon={Layers}/>
              <DetailItem label="Base SKU" value={product.sku} icon={Barcode} />
              <DetailItem label="Base Barcode" value={product.barcode} icon={Barcode} />
              <div className="md:col-span-2">
                 <DetailItem label="Description" value={product.description} icon={AlignLeft} />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader><CardTitle className="text-lg">Codes & Taxes</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <DetailItem label="HSN Code" value={product.hsnCode} icon={PackageSearch} />
              <DetailItem label="GST Tax Rate" value={product.gstTaxRate !== null && product.gstTaxRate !== undefined ? `${product.gstTaxRate}%` : 'N/A'} icon={DollarSign} />
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader><CardTitle className="text-lg">Other Details</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <DetailItem label="Weight" value={product.weight !== null && product.weight !== undefined ? `${product.weight} kg` : 'N/A'} icon={Weight} />
              <DetailItem label="Dimensions" value={product.dimensions} icon={Ruler} />
              <DetailItem label="Featured" value={product.isFeatured} icon={CheckCircle} />
               <div>
                  <p className="text-sm text-muted-foreground mb-1 flex items-center"><PackageSearch className="h-3.5 w-3.5 mr-1.5 shrink-0" />Status</p>
                  <Badge variant={productStatus === "ACTIVE" ? "default" : "outline"}
                         className={productStatus === "ACTIVE" ? "bg-green-500/20 text-green-700 border-green-500/30" : "bg-gray-500/20 text-gray-700 border-gray-500/30"}>
                      {productStatus.replace(/_/g, " ")}
                  </Badge>
              </div>
              {product.tags && product.tags.length > 0 && (
                <div className="md:col-span-2">
                  <p className="text-sm text-muted-foreground mb-1 flex items-center"><Tag className="h-3.5 w-3.5 mr-1.5 shrink-0" />Tags</p>
                  <div className="flex flex-wrap gap-1">
                    {product.tags.map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card className="shadow-md">
            <CardHeader><CardTitle className="text-lg">SEO Information</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
               <DetailItem label="Meta Title" value={product.metaTitle}/>
               <DetailItem label="Meta Description" value={product.metaDescription} className="md:col-span-2"/>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <Card className="shadow-md">
            <CardHeader><CardTitle className="text-lg">Product Images</CardTitle></CardHeader>
            <CardContent>
              {product.imageUrls && product.imageUrls.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {product.imageUrls.map((url, index) => (
                    <Image key={index} src={url} alt={`${product.name} image ${index + 1}`} width={100} height={100} className="rounded-md object-cover aspect-square shadow" data-ai-hint="product photo" />
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No primary product images uploaded.</p>
              )}
            </CardContent>
          </Card>
          <Card className="shadow-md">
            <CardHeader><CardTitle className="text-lg">System Information</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <DetailItem label="Created At" value={product.createdAt ? format(new Date(product.createdAt), "PPPpp") : 'N/A'} icon={CalendarDays}/>
              <DetailItem label="Last Updated At" value={product.updatedAt ? format(new Date(product.updatedAt), "PPPpp") : 'N/A'} icon={CalendarDays}/>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <Separator className="my-6" />

      <Card className="shadow-md">
        <CardHeader><CardTitle className="text-lg">Product Variants</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {product.variants && product.variants.length > 0 ? (
            product.variants.map((variant) => (
              <VariantCard key={variant.id} variant={variant} />
            ))
          ) : (
            <p className="text-muted-foreground">No variants found for this product.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

