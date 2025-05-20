
"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label"; // Not directly used with FormField, but good to have
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { 
  createProduct,
  type CreateProductRequest 
} from "@/lib/apiClient"; // Removed meta fetch functions
import { PackagePlus, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

// Define simple types for hardcoded data
interface HardcodedMetaItem {
  id: number;
  name: string;
}

const productFormSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  description: z.string().optional().nullable(),
  sku: z.string().optional().nullable(),
  barcode: z.string().optional().nullable(),
  quantity: z.coerce.number({invalid_type_error: "Quantity must be a number"}).int().min(0, "Quantity must be non-negative"),
  unitPrice: z.coerce.number({invalid_type_error: "Unit price must be a number"}).min(0, "Unit price must be non-negative"),
  costPrice: z.coerce.number({invalid_type_error: "Cost price must be a number"}).min(0).optional().nullable(),
  categoryId: z.string().optional().nullable(),
  brandId: z.string().optional().nullable(),
  supplierId: z.string().optional().nullable(),
  imageUrlsInput: z.string().optional().nullable(), 
  tagsInput: z.string().optional().nullable(), 
  status: z.enum(['ACTIVE', 'DRAFT', 'ARCHIVED', 'OUT_OF_STOCK']).default('DRAFT').optional().nullable(),
  weight: z.coerce.number({invalid_type_error: "Weight must be a number"}).min(0).optional().nullable(),
  dimensions: z.string().optional().nullable(),
  isFeatured: z.boolean().default(false).optional(),
  metaTitle: z.string().max(70, "Meta title should be 70 characters or less").optional().nullable(),
  metaDescription: z.string().max(160, "Meta description should be 160 characters or less").optional().nullable(),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

// Hardcoded data
const hardcodedCategories: HardcodedMetaItem[] = [
  { id: 1, name: 'Electronics' },
  { id: 2, name: 'Books' },
  { id: 3, name: 'Clothing' },
  { id: 4, name: 'Home Goods' },
  { id: 5, name: 'Sports Equipment' },
];

const hardcodedBrands: HardcodedMetaItem[] = [
  { id: 1, name: 'Generic Brand' },
  { id: 2, name: 'Premium Brand' },
  { id: 3, name: 'TechBrand' },
  { id: 4, name: 'FashionBrand' },
];

const hardcodedSuppliers: HardcodedMetaItem[] = [
  { id: 1, name: 'Main Supplier Inc.' },
  { id: 2, name: 'Secondary Supplier Co.' },
  { id: 3, name: 'Local Vendor LLC' },
];

const hardcodedProductStatuses: CreateProductRequest['status'][] = ['ACTIVE', 'DRAFT', 'ARCHIVED', 'OUT_OF_STOCK'];


export default function CreateProductPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  // Use hardcoded data
  const [categories, setCategories] = React.useState<HardcodedMetaItem[]>(hardcodedCategories);
  const [brands, setBrands] = React.useState<HardcodedMetaItem[]>(hardcodedBrands);
  const [suppliers, setSuppliers] = React.useState<HardcodedMetaItem[]>(hardcodedSuppliers);
  const [productStatuses, setProductStatuses] = React.useState<Array<CreateProductRequest['status']>>(hardcodedProductStatuses);
  const [isLoadingData, setIsLoadingData] = React.useState(false); // Set to false as data is hardcoded

  const initialStatusQueryParam = searchParams.get('status') as CreateProductRequest['status'];
  const validInitialStatus = initialStatusQueryParam && productStatuses.includes(initialStatusQueryParam) 
    ? initialStatusQueryParam 
    : (productStatuses.includes('DRAFT') ? 'DRAFT' : productStatuses[0]);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      description: "",
      sku: "",
      barcode: "",
      quantity: 0,
      unitPrice: 0,
      costPrice: undefined,
      categoryId: undefined,
      brandId: undefined,
      supplierId: undefined,
      imageUrlsInput: "",
      tagsInput: "",
      status: validInitialStatus,
      weight: undefined,
      dimensions: "",
      isFeatured: false,
      metaTitle: "",
      metaDescription: "",
    },
  });

  React.useEffect(() => {
    // Data is now hardcoded, so no async fetching needed here for these dropdowns.
    // We still might want to reset form status based on query params.
    const queryStatus = searchParams.get('status') as CreateProductRequest['status'];
    if (queryStatus && productStatuses.includes(queryStatus)) {
      form.reset({ ...form.getValues(), status: queryStatus });
    } else if (productStatuses.includes('DRAFT')) {
       form.reset({ ...form.getValues(), status: 'DRAFT' });
    } else if (productStatuses.length > 0) {
       form.reset({ ...form.getValues(), status: productStatuses[0] });
    }
    setIsLoadingData(false); // Ensure loading is set to false
  }, [form, searchParams, productStatuses]); // productStatuses is now stable

  async function onSubmit(data: ProductFormValues) {
    try {
      const productPayload: CreateProductRequest = {
        ...data,
        categoryId: data.categoryId ? parseInt(data.categoryId, 10) : null,
        brandId: data.brandId ? parseInt(data.brandId, 10) : null,
        supplierId: data.supplierId ? parseInt(data.supplierId, 10) : null,
        imageUrls: data.imageUrlsInput ? data.imageUrlsInput.split(',').map(url => url.trim()).filter(url => url) : null,
        tags: data.tagsInput ? data.tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag) : null,
        costPrice: data.costPrice === undefined || data.costPrice === null ? null : Number(data.costPrice),
        weight: data.weight === undefined || data.weight === null ? null : Number(data.weight),
        status: data.status || 'DRAFT', 
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
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Product Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Wireless Ergonomic Mouse" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea rows={4} placeholder="Detailed description of the product..." {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SKU (Stock Keeping Unit)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., WEM-BLK-01" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="barcode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Barcode (UPC/EAN)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 123456789012" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Pricing & Stock</CardTitle>
              <CardDescription>Manage inventory levels and pricing.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 md:gap-6">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity in Stock *</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="unitPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit Price (Selling Price) *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="costPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost Price</FormLabel>
                    <FormControl>
                       <Input type="number" step="0.01" placeholder="0.00" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} value={field.value ?? ""} />
                    </FormControl>
                    <FormDescription>Optional cost of acquiring the product.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
          
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Organization</CardTitle>
              <CardDescription>Categorize and group your product.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 md:gap-6">
              {isLoadingData && !categories.length ? <Skeleton className="h-10 w-full rounded-md" /> : <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value?.toString()} value={field.value?.toString()} disabled={isLoadingData || categories.length === 0}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={isLoadingData ? "Loading..." : (categories.length === 0 ? "No categories available" : "Select a category")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />}
              {isLoadingData && !brands.length ? <Skeleton className="h-10 w-full rounded-md" /> : <FormField
                control={form.control}
                name="brandId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brand</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value?.toString()} value={field.value?.toString()} disabled={isLoadingData || brands.length === 0}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={isLoadingData ? "Loading..." : (brands.length === 0 ? "No brands available" : "Select a brand")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {brands.map(brand => (
                          <SelectItem key={brand.id} value={brand.id.toString()}>{brand.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />}
              {isLoadingData && !suppliers.length ? <Skeleton className="h-10 w-full rounded-md" /> : <FormField
                control={form.control}
                name="supplierId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supplier</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value?.toString()} value={field.value?.toString()} disabled={isLoadingData || suppliers.length === 0}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={isLoadingData ? "Loading..." : (suppliers.length === 0 ? "No suppliers available" : "Select a supplier")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {suppliers.map(sup => (
                          <SelectItem key={sup.id} value={sup.id.toString()}>{sup.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />}
               {isLoadingData && !productStatuses.length ? <Skeleton className="h-10 w-full rounded-md" /> : <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ""} disabled={isLoadingData || productStatuses.length === 0}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={isLoadingData ? "Loading..." : (productStatuses.length === 0 ? "No statuses available" : "Select product status")} />
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
              />}
            </CardContent>
          </Card>

          <Card className="shadow-md">
             <CardHeader>
                <CardTitle>Media & Details</CardTitle>
                <CardDescription>Additional product imagery, tags, and specifications.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 md:gap-6">
              <FormField
                control={form.control}
                name="imageUrlsInput"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Image URLs</FormLabel>
                    <FormControl>
                      <Textarea rows={3} placeholder="e.g., https://example.com/image1.jpg, https://example.com/image2.png" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormDescription>Comma-separated URLs for product images.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tagsInput"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Tags</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., electronics, new, featured" {...field} value={field.value ?? ""}/>
                    </FormControl>
                    <FormDescription>Comma-separated tags for product discovery.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="weight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Weight (kg)</FormLabel>
                    <FormControl>
                       <Input type="number" step="0.01" placeholder="0.00" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} value={field.value ?? ""} />
                    </FormControl>
                    <FormDescription>Product weight for shipping.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dimensions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dimensions (e.g., LxWxH cm)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 10x5x2" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormDescription>Product dimensions for packaging.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isFeatured"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 md:col-span-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Featured Product
                      </FormLabel>
                      <FormDescription>
                        Mark this product as featured to highlight it on storefronts or special sections.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
          
          <Card className="shadow-md">
             <CardHeader>
                <CardTitle>SEO Information (Optional)</CardTitle>
                <CardDescription>Optimize product visibility for search engines.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 md:gap-6">
                 <FormField
                control={form.control}
                name="metaTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meta Title</FormLabel>
                    <FormControl>
                      <Input placeholder="SEO friendly title (max 70 chars)" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="metaDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meta Description</FormLabel>
                    <FormControl>
                      <Textarea rows={3} placeholder="Concise SEO description (max 160 chars)" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader>
                <CardTitle>Product Attributes</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">
                    Advanced product attribute management (e.g., size, color options based on selectable attributes from Settings) will be implemented in a future update.
                </p>
            </CardContent>
          </Card>

          <CardFooter className="flex flex-col sm:flex-row justify-end gap-2 pt-6">
            <Button type="button" variant="outline" onClick={() => router.back()} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting || isLoadingData} className="w-full sm:w-auto">
              {form.formState.isSubmitting ? "Creating..." : <><PackagePlus className="mr-2 h-4 w-4" /> Create Product</>}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </div>
  );
}

