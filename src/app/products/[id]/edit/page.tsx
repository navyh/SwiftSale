
"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  fetchProductById,
  updateProduct,
  type UpdateProductRequest,
  type ProductDto, // Changed from Product to ProductDto
  type ProductVariantDto
} from "@/lib/apiClient";
import { ChevronLeft, Save, PlusCircle, Loader2, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// Hardcoded product statuses as meta API for product statuses is not available
const hardcodedProductStatuses = ["ACTIVE", "DRAFT", "ARCHIVED", "OUT_OF_STOCK"];


const productFormSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  brand: z.string().min(1, "Brand name is required"), 
  hsnCode: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  gstTaxRate: z.coerce.number({invalid_type_error: "GST Tax Rate must be a number"}).min(0).optional().nullable(),
  category: z.string().min(1, "Category name is required"), 
  subCategory: z.string().optional().nullable(),
  
  status: z.string().optional().nullable(),
  
  newColorValues: z.string().optional().nullable().describe("Comma-separated new color names for variant generation"),
  newSizeValues: z.string().optional().nullable().describe("Comma-separated new size names for variant generation"),
  
  tagsInput: z.string().optional().nullable(),

  sku: z.string().optional().nullable(), 
  barcode: z.string().optional().nullable(), 
  // quantity: z.coerce.number({invalid_type_error: "Quantity must be a number"}).int().min(0).optional().nullable(), // Product level quantity often comes from variants
  // unitPrice: z.coerce.number({invalid_type_error: "Unit price must be a number"}).min(0).optional().nullable(), // Product level price often comes from variants
  costPrice: z.coerce.number({invalid_type_error: "Cost price must be a number"}).min(0).optional().nullable(),
  imageUrlsInput: z.string().optional().nullable(),
  weight: z.coerce.number({invalid_type_error: "Weight must be a number"}).min(0).optional().nullable(),
  dimensions: z.string().optional().nullable(),
  isFeatured: z.boolean().default(false).optional(),
  metaTitle: z.string().max(70).optional().nullable(),
  metaDescription: z.string().max(160).optional().nullable(),
});

type ProductFormValues = z.infer<typeof productFormSchema>;


export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const productId = params.id as string; // ID is a string

  const [product, setProduct] = React.useState<ProductDto | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const productStatuses = hardcodedProductStatuses;

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      brand: "", 
      hsnCode: "",
      description: "",
      gstTaxRate: undefined,
      category: "", 
      subCategory: "",
      status: "DRAFT",
      newColorValues: "",
      newSizeValues: "",
      tagsInput: "",
      sku: "",
      barcode: "",
      // quantity: 0,
      // unitPrice: 0,
      costPrice: undefined,
      imageUrlsInput: "",
      weight: undefined,
      dimensions: "",
      isFeatured: false,
      metaTitle: "",
      metaDescription: "",
    },
  });

  React.useEffect(() => {
    if (!productId) {
      toast({ title: "Error", description: "Invalid product ID.", variant: "destructive" });
      router.push("/products");
      return;
    }

    const fetchProductData = async () => {
      setIsLoading(true);
      try {
        const fetchedProduct = await fetchProductById(productId);
        setProduct(fetchedProduct);

        const currentStatus = fetchedProduct.status?.toUpperCase();
        const validStatus = productStatuses.includes(currentStatus as any) ? currentStatus : "DRAFT";
        
        form.reset({
          name: fetchedProduct.name || "",
          brand: fetchedProduct.brand || "", // API returns brand name as string
          category: fetchedProduct.category || "", // API returns category name as string
          subCategory: fetchedProduct.subCategory ?? "",
          hsnCode: fetchedProduct.hsnCode ?? "",
          description: fetchedProduct.description ?? "",
          gstTaxRate: fetchedProduct.gstTaxRate ?? undefined,
          status: validStatus,
          
          tagsInput: fetchedProduct.tags?.join(", ") ?? "",
          sku: fetchedProduct.sku ?? "", // Base product SKU
          barcode: fetchedProduct.barcode ?? "", // Base product barcode
          // quantity: fetchedProduct.quantity ?? 0, // Usually variant-level
          // unitPrice: fetchedProduct.unitPrice ?? 0, // Usually variant-level
          costPrice: fetchedProduct.costPrice ?? undefined,
          imageUrlsInput: fetchedProduct.imageUrls?.join(", ") ?? "",
          weight: fetchedProduct.weight ?? undefined,
          dimensions: fetchedProduct.dimensions ?? "",
          isFeatured: fetchedProduct.isFeatured ?? false,
          metaTitle: fetchedProduct.metaTitle ?? "",
          metaDescription: fetchedProduct.metaDescription ?? "",
          newColorValues: "", 
          newSizeValues: "", 
        });
      } catch (error: any) {
        toast({
          title: "Error fetching product",
          description: error.message || "Could not load product data.",
          variant: "destructive",
        });
        router.push("/products");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProductData();
  }, [productId, router, toast, form]);

  async function onSubmit(data: ProductFormValues) {
    if (!productId) return;
    setIsSubmitting(true);
    try {
      const colorVariant = data.newColorValues?.split(',').map(c => c.trim()).filter(Boolean) || undefined;
      const sizeVariant = data.newSizeValues?.split(',').map(s => s.trim()).filter(Boolean) || undefined;
      const tags = data.tagsInput?.split(',').map(t => t.trim()).filter(Boolean) || undefined;
      const imageUrls = data.imageUrlsInput?.split(',').map(url => url.trim()).filter(Boolean) || undefined;

      const payload: UpdateProductRequest = {
        name: data.name,
        brand: data.brand, 
        hsnCode: data.hsnCode || undefined,
        description: data.description || undefined,
        gstTaxRate: data.gstTaxRate === undefined || data.gstTaxRate === null ? undefined : Number(data.gstTaxRate),
        category: data.category, 
        subCategory: data.subCategory || undefined,
        colorVariant: (colorVariant && colorVariant.length > 0) ? colorVariant : undefined, 
        sizeVariant: (sizeVariant && sizeVariant.length > 0) ? sizeVariant : undefined,   
        tags: tags,
        status: data.status as UpdateProductRequest['status'] || undefined,
        
        sku: data.sku || undefined,
        barcode: data.barcode || undefined,
        // quantity: data.quantity === undefined || data.quantity === null ? undefined : Number(data.quantity),
        // unitPrice: data.unitPrice === undefined || data.unitPrice === null ? undefined : Number(data.unitPrice),
        costPrice: data.costPrice === undefined || data.costPrice === null ? undefined : Number(data.costPrice),
        imageUrls: imageUrls,
        weight: data.weight === undefined || data.weight === null ? undefined : Number(data.weight),
        dimensions: data.dimensions || undefined,
        isFeatured: data.isFeatured,
        metaTitle: data.metaTitle || undefined,
        metaDescription: data.metaDescription || undefined,
      };

      await updateProduct(productId, payload);
      toast({
        title: "Success",
        description: "Product updated successfully.",
      });
      router.push("/products"); 
      router.refresh();
    } catch (error: any) {
      toast({
        title: "Error Updating Product",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6 pb-8 animate-pulse">
        <div className="flex items-center gap-2 md:gap-4">
          <Skeleton className="h-9 w-9" />
          <div><Skeleton className="h-8 w-3/5 mb-1" /><Skeleton className="h-4 w-4/5" /></div>
        </div>
        <Card className="shadow-md">
          <CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 md:gap-6">
            <Skeleton className="h-10 w-full" /> <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" /> <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full md:col-span-2" />
          </CardContent>
        </Card>
         <Card className="shadow-md">
          <CardHeader><Skeleton className="h-6 w-1/4" /></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 md:gap-6">
            <Skeleton className="h-10 w-full" /> <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader>
          <CardContent className="space-y-4"><Skeleton className="h-32 w-full" /><Skeleton className="h-10 w-32" /></CardContent>
        </Card>
        <CardFooter className="flex justify-end gap-2 pt-6">
          <Skeleton className="h-10 w-24" /><Skeleton className="h-10 w-32" />
        </CardFooter>
      </div>
    );
  }

  if (!product) {
    return <p className="text-center text-muted-foreground py-10">Product not found or failed to load.</p>;
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center gap-2 md:gap-4">
        <Button variant="outline" size="icon" aria-label="Back to Products" onClick={() => router.push('/products')}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Edit Product: {product.name}</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Update product details, manage variants, and more.</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 md:space-y-8">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Edit the fundamental details of the product.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 md:gap-6">
              <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Product Name *</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField control={form.control} name="brand" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brand Name *</FormLabel>
                    <FormControl><Input placeholder="e.g., Nike (Type brand name)" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField control={form.control} name="category" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category Name *</FormLabel>
                    <FormControl><Input placeholder="e.g., Apparel (Type category name)" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField control={form.control} name="subCategory" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sub-Category Name</FormLabel>
                    <FormControl><Input placeholder="e.g., T-Shirts" {...field} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Description</FormLabel>
                    <FormControl><Textarea rows={3} {...field} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Codes & Taxes</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 md:gap-6">
              <FormField control={form.control} name="hsnCode" render={({ field }) => (
                  <FormItem>
                    <FormLabel>HSN Code</FormLabel>
                    <FormControl><Input placeholder="e.g., 61091000" {...field} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField control={form.control} name="gstTaxRate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>GST Tax Rate (%)</FormLabel>
                    <FormControl><Input type="number" step="0.01" placeholder="e.g., 18" {...field} onChange={e => field.onChange(e.target.value === '' ? null : +e.target.value)} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Optional Base Product Details</CardTitle>
              <CardDescription>Base values if product has no variants or as default. API may use variant-specific data.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 md:gap-6">
                <FormField control={form.control} name="sku" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Base SKU</FormLabel>
                    <FormControl><Input {...field} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField control={form.control} name="barcode" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Base Barcode</FormLabel>
                    <FormControl><Input {...field} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Base Quantity and Unit Price removed as they are variant-specific */}
              <FormField control={form.control} name="costPrice" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Base Cost Price</FormLabel>
                    <FormControl><Input type="number" step="0.01" {...field} onChange={e => field.onChange(e.target.value === '' ? null : +e.target.value)} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
          
          <Card className="shadow-md">
            <CardHeader>
                <CardTitle>Generate New Variants</CardTitle>
                <CardDescription>Enter comma-separated color and size names to generate new variant combinations upon saving. Backend will create these.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
                <FormField control={form.control} name="newColorValues" render={({ field }) => (
                        <FormItem>
                            <FormLabel>New Color Names</FormLabel>
                            <FormControl><Input {...field} placeholder="e.g., Red, Blue, Green" value={field.value ?? ""} /></FormControl>
                            <FormDescription>Comma-separated. Variants will be generated for each color combined with each size.</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField control={form.control} name="newSizeValues" render={({ field }) => (
                        <FormItem>
                            <FormLabel>New Size Names</FormLabel>
                            <FormControl><Input {...field} placeholder="e.g., S, M, L" value={field.value ?? ""}/></FormControl>
                            <FormDescription>Comma-separated.</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Existing Variants</CardTitle>
              <CardDescription>Manage existing product variants. Price and stock updates here will use specific variant update APIs.</CardDescription>
            </CardHeader>
            <CardContent>
              {(!product.variants || product.variants.length === 0) ? (
                <p className="text-muted-foreground">No variants found for this product. You can generate them above or add specific ones below.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Color</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Selling Price</TableHead>
                      <TableHead>MRP</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {product.variants.map(variant => (
                      <TableRow key={variant.id}>
                        <TableCell>{variant.sku || 'N/A'}</TableCell>
                        <TableCell>{variant.color || 'N/A'}</TableCell> 
                        <TableCell>{variant.size || 'N/A'}</TableCell>   
                        <TableCell>{variant.sellingPrice !== null && variant.sellingPrice !== undefined ? `₹${variant.sellingPrice.toFixed(2)}` : 'N/A'}</TableCell>
                        <TableCell>{variant.mrp !== null && variant.mrp !== undefined ? `₹${variant.mrp.toFixed(2)}` : 'N/A'}</TableCell>
                        <TableCell>{variant.quantity}</TableCell>
                        <TableCell className="text-right">
                          <Button type="button" variant="outline" size="sm" onClick={() => alert(`Edit variant ${variant.id} - TBD: Implement variant edit modal/form using updateProductVariant API.`)}>Edit</Button>
                           <Button type="button" variant="destructive" size="sm" className="ml-2" onClick={() => alert(`Delete variant ${variant.id} - TBD: Implement deleteProductVariant API call.`)}>Delete</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              <div className="mt-4">
                <Button type="button" variant="outline" onClick={() => alert("Add specific variant - TBD: Implement form and addProductVariant API call.")}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Specific Variant
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Media, Status & Other Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 md:gap-6">
              <FormField control={form.control} name="tagsInput" render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Tags</FormLabel>
                    <FormControl><Input placeholder="e.g., electronics, new, featured" {...field} value={field.value ?? ""}/></FormControl>
                    <FormDescription>Comma-separated tags.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField control={form.control} name="imageUrlsInput" render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Image URLs</FormLabel>
                    <FormControl><Textarea rows={3} placeholder="e.g., https://example.com/image1.jpg" {...field} value={field.value ?? ""} /></FormControl>
                    <FormDescription>Comma-separated product-level image URLs.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField control={form.control} name="weight" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Weight (kg)</FormLabel>
                    <FormControl><Input type="number" step="0.01" {...field} onChange={e => field.onChange(e.target.value === '' ? null : +e.target.value)} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField control={form.control} name="dimensions" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dimensions (LxWxH cm)</FormLabel>
                    <FormControl><Input {...field} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
                    <SelectContent>{productStatuses.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>)}
              />
              <FormField control={form.control} name="isFeatured" render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 md:col-span-2">
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Featured Product</FormLabel>
                      <FormDescription>Mark this product as featured.</FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader><CardTitle>SEO Information</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <FormField control={form.control} name="metaTitle" render={({ field }) => (
                <FormItem>
                  <FormLabel>Meta Title</FormLabel>
                  <FormControl><Input {...field} value={field.value ?? ""} /></FormControl>
                  <FormMessage />
                </FormItem>)}
              />
              <FormField control={form.control} name="metaDescription" render={({ field }) => (
                <FormItem>
                  <FormLabel>Meta Description</FormLabel>
                  <FormControl><Textarea rows={3} {...field} value={field.value ?? ""} /></FormControl>
                  <FormMessage />
                </FormItem>)}
              />
            </CardContent>
          </Card>


          <CardFooter className="flex flex-col sm:flex-row justify-end gap-2 pt-6">
            <Button type="button" variant="outline" onClick={() => router.back()} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || isLoading} className="w-full sm:w-auto">
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : <><Save className="mr-2 h-4 w-4" /> Save Changes</>}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </div>
  );
}


    
