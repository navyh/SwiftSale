
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
  type Product,
  type VariantDefinitionDTO,
  // Hardcoded data for dropdowns as meta APIs are skipped for forms
} from "@/lib/apiClient";
import { ChevronLeft, Package, Save, PlusCircle, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// Hardcoded data (as per instruction to skip meta APIs for forms)
const hardcodedCategories = [
  { id: "1", name: "Electronics" },
  { id: "2", name: "Books" },
  { id: "3", name: "Clothing" },
  { id: "4", name: "Home Goods" },
];

const hardcodedBrands = [
  { id: "1", name: "BrandA" },
  { id: "2", name: "BrandB" },
  { id: "3", name: "BrandC" },
];

const hardcodedSuppliers = [
  { id: "1", name: "SupplierX" },
  { id: "2", name: "SupplierY" },
];

const hardcodedUnits = [
  { id: "1", name: "PCS" },
  { id: "2", name: "KG" },
  { id: "3", name: "Set" },
];

const hardcodedProductStatuses = ["ACTIVE", "DRAFT", "ARCHIVED", "OUT_OF_STOCK"];


const variantDefinitionSchema = z.object({
  colorValue: z.string().min(1, "Color value is required"),
  sizeValue: z.string().min(1, "Size value is required"),
  sku: z.string().optional().nullable(),
  price: z.coerce.number().optional().nullable(),
  quantity: z.coerce.number().int().optional().nullable(),
});

const productFormSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  description: z.string().optional().nullable(),
  sku: z.string().optional().nullable(), // Base SKU
  barcode: z.string().optional().nullable(), // Base Barcode
  quantity: z.coerce.number({invalid_type_error: "Quantity must be a number"}).int().min(0), // Overall quantity
  unitPrice: z.coerce.number({invalid_type_error: "Unit price must be a number"}).min(0), // Overall price
  costPrice: z.coerce.number({invalid_type_error: "Cost price must be a number"}).min(0).optional().nullable(),
  categoryId: z.string().optional().nullable(),
  brandId: z.string().optional().nullable(),
  supplierId: z.string().optional().nullable(),
  unitId: z.string().optional().nullable(),
  imageUrlsInput: z.string().optional().nullable(),
  tagsInput: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
  weight: z.coerce.number({invalid_type_error: "Weight must be a number"}).min(0).optional().nullable(),
  dimensions: z.string().optional().nullable(),
  isFeatured: z.boolean().default(false).optional(),
  metaTitle: z.string().max(70).optional().nullable(),
  metaDescription: z.string().max(160).optional().nullable(),
  // For generating new variants
  newColorValues: z.string().optional().describe("Comma-separated new color values"),
  newSizeValues: z.string().optional().describe("Comma-separated new size values"),
  // variantDefinitions: z.array(variantDefinitionSchema).optional().nullable(), // For direct definition, might be simpler with color/size strings
});

type ProductFormValues = z.infer<typeof productFormSchema>;

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const productId = Number(params.id);

  const [product, setProduct] = React.useState<Product | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Using hardcoded data for dropdowns
  const categories = hardcodedCategories;
  const brands = hardcodedBrands;
  const suppliers = hardcodedSuppliers;
  const units = hardcodedUnits;
  const productStatuses = hardcodedProductStatuses;

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      description: "",
      sku: "",
      barcode: "",
      quantity: 0,
      unitPrice: 0,
      newColorValues: "",
      newSizeValues: "",
    },
  });

  React.useEffect(() => {
    if (isNaN(productId)) {
      toast({ title: "Error", description: "Invalid product ID.", variant: "destructive" });
      router.push("/products");
      return;
    }

    const fetchProductData = async () => {
      setIsLoading(true);
      try {
        const fetchedProduct = await fetchProductById(productId);
        setProduct(fetchedProduct);
        form.reset({
          name: fetchedProduct.name,
          description: fetchedProduct.description ?? "",
          sku: fetchedProduct.sku ?? "",
          barcode: fetchedProduct.barcode ?? "",
          quantity: fetchedProduct.quantity,
          unitPrice: fetchedProduct.unitPrice,
          costPrice: fetchedProduct.costPrice ?? undefined,
          categoryId: fetchedProduct.categoryId?.toString() ?? undefined,
          brandId: fetchedProduct.brandId?.toString() ?? undefined,
          supplierId: fetchedProduct.supplierId?.toString() ?? undefined,
          unitId: fetchedProduct.unitId?.toString() ?? undefined,
          imageUrlsInput: fetchedProduct.imageUrls?.join(", ") ?? "",
          tagsInput: fetchedProduct.tags?.join(", ") ?? "",
          status: fetchedProduct.status ?? undefined,
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
    setIsSubmitting(true);
    try {
      let variantDefinitions: VariantDefinitionDTO[] = [];
      if (data.newColorValues && data.newSizeValues) {
        const colors = data.newColorValues.split(',').map(c => c.trim()).filter(Boolean);
        const sizes = data.newSizeValues.split(',').map(s => s.trim()).filter(Boolean);
        if (colors.length > 0 && sizes.length > 0) {
          colors.forEach(colorValue => {
            sizes.forEach(sizeValue => {
              variantDefinitions.push({ colorValue, sizeValue });
            });
          });
        }
      }

      const payload: UpdateProductRequest = {
        name: data.name,
        description: data.description,
        sku: data.sku,
        barcode: data.barcode,
        quantity: data.quantity,
        unitPrice: data.unitPrice,
        costPrice: data.costPrice,
        categoryId: data.categoryId ? parseInt(data.categoryId) : null,
        brandId: data.brandId ? parseInt(data.brandId) : null,
        supplierId: data.supplierId ? parseInt(data.supplierId) : null,
        unitId: data.unitId ? parseInt(data.unitId) : null,
        imageUrls: data.imageUrlsInput ? data.imageUrlsInput.split(',').map(url => url.trim()).filter(Boolean) : null,
        tags: data.tagsInput ? data.tagsInput.split(',').map(tag => tag.trim()).filter(Boolean) : null,
        status: data.status as UpdateProductRequest['status'] || undefined,
        weight: data.weight,
        dimensions: data.dimensions,
        isFeatured: data.isFeatured,
        metaTitle: data.metaTitle,
        metaDescription: data.metaDescription,
        variantDefinitions: variantDefinitions.length > 0 ? variantDefinitions : undefined,
      };

      await updateProduct(productId, payload);
      toast({
        title: "Success",
        description: "Product updated successfully.",
      });
      router.push("/products");
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
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/4" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!product) {
    return <p>Product not found.</p>;
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
               <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Description</FormLabel>
                    <FormControl><Textarea rows={4} {...field} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Pricing & Stock (Base Product)</CardTitle>
              <CardDescription>Base values if product has no variants or as default.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 md:gap-6">
              <FormField control={form.control} name="quantity" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Base Quantity *</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField control={form.control} name="unitPrice" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Base Unit Price *</FormLabel>
                    <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField control={form.control} name="costPrice" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Base Cost Price</FormLabel>
                    <FormControl><Input type="number" step="0.01" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Organization (Hardcoded)</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 md:gap-6">
              <FormField control={form.control} name="categoryId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger></FormControl>
                    <SelectContent>{categories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>)}
              />
              <FormField control={form.control} name="brandId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Brand</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select brand" /></SelectTrigger></FormControl>
                    <SelectContent>{brands.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>)}
              />
              <FormField control={form.control} name="supplierId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Supplier</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger></FormControl>
                    <SelectContent>{suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>)}
              />
              <FormField control={form.control} name="unitId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Unit</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger></FormControl>
                    <SelectContent>{units.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>)}
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
            </CardContent>
          </Card>
          
          <Card className="shadow-md">
            <CardHeader>
                <CardTitle>Generate New Variants</CardTitle>
                <CardDescription>Enter comma-separated color and size values to generate new variant combinations upon saving.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
                <FormField
                    control={form.control}
                    name="newColorValues"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>New Color Values</FormLabel>
                            <FormControl><Input {...field} placeholder="e.g., Red, Blue, Green" /></FormControl>
                            <FormDescription>Comma-separated. Variants will be generated for each color combined with each size.</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="newSizeValues"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>New Size Values</FormLabel>
                            <FormControl><Input {...field} placeholder="e.g., S, M, L" /></FormControl>
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
                      <TableHead>Price</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {product.variants.map(variant => (
                      <TableRow key={variant.id}>
                        <TableCell>{variant.sku || 'N/A'}</TableCell>
                        <TableCell>{variant.colorValue || 'N/A'}</TableCell>
                        <TableCell>{variant.sizeValue || 'N/A'}</TableCell>
                        <TableCell>{variant.price !== null ? `$${variant.price.toFixed(2)}` : 'N/A'}</TableCell>
                        <TableCell>{variant.quantity}</TableCell>
                        <TableCell className="text-right">
                          <Button type="button" variant="outline" size="sm" onClick={() => alert(`Edit variant ${variant.id} - TBD`)}>Edit</Button>
                           <Button type="button" variant="destructive" size="sm" className="ml-2" onClick={() => alert(`Delete variant ${variant.id} - TBD`)}>Delete</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              <div className="mt-4">
                <Button type="button" variant="outline" onClick={() => alert("Add specific variant - TBD")}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Specific Variant
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {/* Other sections like Media, SEO, etc. can be added similarly to the create page */}


          <CardFooter className="flex flex-col sm:flex-row justify-end gap-2 pt-6">
            <Button type="button" variant="outline" onClick={() => router.back()} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || isLoading} className="w-full sm:w-auto">
              {isSubmitting ? "Saving..." : <><Save className="mr-2 h-4 w-4" /> Save Changes</>}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </div>
  );
}
