
"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
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
import { 
  createProduct,
  type CreateProductRequest,
} from "@/lib/apiClient";
import { PackagePlus, ChevronLeft } from "lucide-react";
import Link from "next/link";

// Hardcoded product statuses as meta API for product statuses is not available
const hardcodedProductStatuses = ["ACTIVE", "DRAFT", "ARCHIVED", "OUT_OF_STOCK"];


const productFormSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  brand: z.string().min(1, "Brand name is required"), // Expects string name
  hsnCode: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  gstTaxRate: z.coerce.number({invalid_type_error: "GST Tax Rate must be a number"}).min(0).optional().nullable(),
  category: z.string().min(1, "Category name is required"), // Expects string name
  subCategory: z.string().optional().nullable(),
  colorVariantInput: z.string().optional().nullable().describe("Comma-separated color names"),
  sizeVariantInput: z.string().optional().nullable().describe("Comma-separated size names"),
  tagsInput: z.string().optional().nullable().describe("Comma-separated tags"),
  status: z.string().optional().nullable(),

  sku: z.string().optional().nullable(),
  barcode: z.string().optional().nullable(),
  quantity: z.coerce.number({invalid_type_error: "Quantity must be a number"}).int().min(0, "Quantity must be non-negative").optional().nullable(),
  unitPrice: z.coerce.number({invalid_type_error: "Unit price must be a number"}).min(0, "Unit price must be non-negative").optional().nullable(),
  costPrice: z.coerce.number({invalid_type_error: "Cost price must be a number"}).min(0).optional().nullable(),
  imageUrlsInput: z.string().optional().nullable(), 
  weight: z.coerce.number({invalid_type_error: "Weight must be a number"}).min(0).optional().nullable(),
  dimensions: z.string().optional().nullable(),
  isFeatured: z.boolean().default(false).optional(),
  metaTitle: z.string().max(70, "Meta title should be 70 characters or less").optional().nullable(),
  metaDescription: z.string().max(160, "Meta description should be 160 characters or less").optional().nullable(),
});

type ProductFormValues = z.infer<typeof productFormSchema>;


export default function CreateProductPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const initialStatusQueryParam = searchParams.get('status');
  const productStatuses = hardcodedProductStatuses; 
  
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      brand: "", // Text input for brand name
      hsnCode: "",
      description: "",
      gstTaxRate: undefined,
      category: "", // Text input for category name
      subCategory: "",
      colorVariantInput: "",
      sizeVariantInput: "",
      tagsInput: "",
      status: initialStatusQueryParam && productStatuses.includes(initialStatusQueryParam.toUpperCase()) 
              ? initialStatusQueryParam.toUpperCase() 
              : (productStatuses.includes('DRAFT') ? 'DRAFT' : productStatuses[0]),
      sku: "",
      barcode: "",
      quantity: 0, 
      unitPrice: 0, 
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
    const validInitialStatus = initialStatusQueryParam && productStatuses.includes(initialStatusQueryParam.toUpperCase())
      ? initialStatusQueryParam.toUpperCase()
      : (productStatuses.includes('DRAFT') ? 'DRAFT' : productStatuses[0]);
    if (form.getValues('status') !== validInitialStatus) {
      form.reset({ ...form.getValues(), status: validInitialStatus });
    }
  }, [form, initialStatusQueryParam, productStatuses]);


  async function onSubmit(data: ProductFormValues) {
    try {
      const colorVariants = data.colorVariantInput?.split(',').map(c => c.trim()).filter(Boolean) || undefined;
      const sizeVariants = data.sizeVariantInput?.split(',').map(s => s.trim()).filter(Boolean) || undefined;
      const tags = data.tagsInput?.split(',').map(t => t.trim()).filter(Boolean) || undefined;
      const imageUrls = data.imageUrlsInput?.split(',').map(url => url.trim()).filter(Boolean) || undefined;

      const productPayload: CreateProductRequest = {
        name: data.name,
        brand: data.brand, // Send brand name as string
        hsnCode: data.hsnCode || undefined,
        description: data.description || undefined,
        gstTaxRate: data.gstTaxRate === undefined || data.gstTaxRate === null ? undefined : Number(data.gstTaxRate),
        category: data.category, // Send category name as string
        subCategory: data.subCategory || undefined,
        colorVariant: colorVariants,
        sizeVariant: sizeVariants,
        tags: tags,
        status: data.status as CreateProductRequest['status'] || 'DRAFT',
        
        sku: data.sku || undefined,
        barcode: data.barcode || undefined,
        quantity: data.quantity === undefined || data.quantity === null ? undefined : Number(data.quantity), 
        unitPrice: data.unitPrice === undefined || data.unitPrice === null ? undefined : Number(data.unitPrice), 
        costPrice: data.costPrice === undefined || data.costPrice === null ? undefined : Number(data.costPrice),
        imageUrls: imageUrls,
        weight: data.weight === undefined || data.weight === null ? undefined : Number(data.weight),
        dimensions: data.dimensions || undefined,
        isFeatured: data.isFeatured,
        metaTitle: data.metaTitle || undefined,
        metaDescription: data.metaDescription || undefined,
      };
      
      await createProduct(productPayload);
      toast({
        title: "Success",
        description: "Product created successfully.",
      });
      router.push("/products");
    } catch (error: any) {
      console.error("Failed to create product", error);
      toast({
        title: "Error Creating Product",
        description: error.message || "An unexpected error occurred. Please check your input and try again.",
        variant: "destructive",
      });
    }
  }
  
  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center gap-2 md:gap-4">
        <Link href="/products" passHref>
          <Button variant="outline" size="icon" aria-label="Back to Products">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Create New Product</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Fill in the details to add a new product to your inventory.</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 md:space-y-8">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Enter the fundamental details of the product.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 md:gap-6">
              <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Product Name *</FormLabel>
                    <FormControl><Input placeholder="e.g., Premium Cotton T-Shirt" {...field} /></FormControl>
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
                    <FormControl><Textarea rows={3} placeholder="Detailed description..." {...field} value={field.value ?? ""} /></FormControl>
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
                    <FormControl><Input type="number" step="0.01" placeholder="e.g., 18" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
          
          <Card className="shadow-md">
            <CardHeader>
                <CardTitle>Variant Generation</CardTitle>
                <CardDescription>Enter comma-separated color and size names. The backend will generate variants for each combination.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
                <FormField control={form.control} name="colorVariantInput" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Color Names</FormLabel>
                            <FormControl><Input {...field} placeholder="e.g., Red, Blue, Green" value={field.value ?? ""} /></FormControl>
                            <FormDescription>Comma-separated, e.g., Red, Blue</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField control={form.control} name="sizeVariantInput" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Size Names</FormLabel>
                            <FormControl><Input {...field} placeholder="e.g., S, M, L" value={field.value ?? ""} /></FormControl>
                             <FormDescription>Comma-separated, e.g., S, M, L</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Optional Base Product Details</CardTitle>
              <CardDescription>These might be used if the product has no variants or as base values. API may override with variant data.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 md:gap-6">
              <FormField control={form.control} name="sku" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Base SKU</FormLabel>
                    <FormControl><Input placeholder="e.g., BASE-TSHIRT" {...field} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField control={form.control} name="barcode" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Base Barcode</FormLabel>
                    <FormControl><Input placeholder="e.g., 123456789012" {...field} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField control={form.control} name="quantity" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Base Quantity</FormLabel>
                    <FormControl><Input type="number" placeholder="0" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} value={field.value ?? 0} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField control={form.control} name="unitPrice" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Base Unit Price</FormLabel>
                    <FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} value={field.value ?? 0.00} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField control={form.control} name="costPrice" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Base Cost Price</FormLabel>
                    <FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
          
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Media & Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 md:gap-6">
              <FormField control={form.control} name="tagsInput" render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Tags</FormLabel>
                    <FormControl><Input placeholder="e.g., Cotton, Round Neck, Summer" {...field} value={field.value ?? ""}/></FormControl>
                    <FormDescription>Comma-separated tags.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField control={form.control} name="imageUrlsInput" render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Image URLs</FormLabel>
                    <FormControl><Textarea rows={3} placeholder="e.g., https://example.com/image1.jpg, https://example.com/image2.png" {...field} value={field.value ?? ""} /></FormControl>
                    <FormDescription>Comma-separated URLs for product images.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField control={form.control} name="weight" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Weight (kg)</FormLabel>
                    <FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField control={form.control} name="dimensions" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dimensions (e.g., LxWxH cm)</FormLabel>
                    <FormControl><Input placeholder="e.g., 10x5x2" {...field} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ""} disabled={productStatuses.length === 0}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={productStatuses.length === 0 ? "No statuses available" : "Select product status"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {productStatuses.map(status => (
                           <SelectItem key={status} value={status!}>{status!.charAt(0) + status!.slice(1).toLowerCase().replace(/_/g, ' ')}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
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
             <CardHeader><CardTitle>SEO Information (Optional)</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 md:gap-6">
                 <FormField control={form.control} name="metaTitle" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meta Title</FormLabel>
                    <FormControl><Input placeholder="SEO friendly title (max 70 chars)" {...field} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField control={form.control} name="metaDescription" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meta Description</FormLabel>
                    <FormControl><Textarea rows={3} placeholder="Concise SEO description (max 160 chars)" {...field} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <CardFooter className="flex flex-col sm:flex-row justify-end gap-2 pt-6">
            <Button type="button" variant="outline" onClick={() => router.back()} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting} className="w-full sm:w-auto">
              {form.formState.isSubmitting ? "Creating..." : <><PackagePlus className="mr-2 h-4 w-4" /> Create Product</>}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </div>
  );
}


    