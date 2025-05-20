
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { fetchCategories, fetchBrands, fetchSuppliers, createProduct, type Category, type Brand, type Supplier, type CreateProductRequest } from "@/lib/apiClient";
import { PackagePlus, ChevronLeft } from "lucide-react";
import Link from "next/link";

const productFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().nullable(),
  sku: z.string().optional().nullable(),
  barcode: z.string().optional().nullable(),
  quantity: z.coerce.number({invalid_type_error: "Quantity must be a number"}).int().min(0, "Quantity must be non-negative"),
  unitPrice: z.coerce.number({invalid_type_error: "Unit price must be a number"}).min(0, "Unit price must be non-negative"),
  costPrice: z.coerce.number({invalid_type_error: "Cost price must be a number"}).min(0).optional().nullable(),
  categoryId: z.string().optional().nullable(), // Stored as string from select, converted to number on submit
  brandId: z.string().optional().nullable(),    // Stored as string from select, converted to number on submit
  supplierId: z.string().optional().nullable(), // Stored as string from select, converted to number on submit
  imageUrlsInput: z.string().optional().nullable(), 
  tagsInput: z.string().optional().nullable(), 
  status: z.enum(['ACTIVE', 'DRAFT', 'ARCHIVED', 'OUT_OF_STOCK']).optional().nullable(),
  weight: z.coerce.number({invalid_type_error: "Weight must be a number"}).min(0).optional().nullable(),
  dimensions: z.string().optional().nullable(),
  isFeatured: z.boolean().optional(),
  metaTitle: z.string().optional().nullable(),
  metaDescription: z.string().optional().nullable(),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

const productStatuses: CreateProductRequest['status'][] = ['ACTIVE', 'DRAFT', 'ARCHIVED', 'OUT_OF_STOCK'];

export default function CreateProductPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [brands, setBrands] = React.useState<Brand[]>([]);
  const [suppliers, setSuppliers] = React.useState<Supplier[]>([]);
  const [isLoadingData, setIsLoadingData] = React.useState(true);

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
      status: "DRAFT",
      isFeatured: false,
    },
  });

  React.useEffect(() => {
    async function loadInitialData() {
      try {
        setIsLoadingData(true);
        const [categoriesData, brandsData, suppliersData] = await Promise.all([
          fetchCategories(),
          fetchBrands(),
          fetchSuppliers(),
        ]);
        setCategories(categoriesData);
        setBrands(brandsData);
        setSuppliers(suppliersData);
      } catch (error) {
        console.error("Failed to load initial data", error);
        toast({
          title: "Error",
          description: "Failed to load categories, brands, or suppliers. Please try again later.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingData(false);
      }
    }
    loadInitialData();
  }, [toast]);

  async function onSubmit(data: ProductFormValues) {
    try {
      const productPayload: CreateProductRequest = {
        ...data,
        categoryId: data.categoryId ? parseInt(data.categoryId, 10) : null,
        brandId: data.brandId ? parseInt(data.brandId, 10) : null,
        supplierId: data.supplierId ? parseInt(data.supplierId, 10) : null,
        imageUrls: data.imageUrlsInput ? data.imageUrlsInput.split(',').map(url => url.trim()).filter(url => url) : null,
        tags: data.tagsInput ? data.tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag) : null,
        isFeatured: data.isFeatured || null, // Ensure it's boolean or null
        costPrice: data.costPrice === undefined ? null : data.costPrice, // Ensure number or null
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
        title: "Error creating product",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/products" passHref>
          <Button variant="outline" size="icon">
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Back to Products</span>
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Create New Product</h1>
          <p className="text-muted-foreground">Fill in the details to add a new product to your inventory.</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Enter the fundamental details of the product.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
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
                      <Textarea placeholder="Detailed description of the product..." {...field} value={field.value ?? ""} />
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
            <CardContent className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity *</FormLabel>
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
                    <FormLabel>Unit Price *</FormLabel>
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
            <CardContent className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value?.toString()} disabled={isLoadingData}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={isLoadingData ? "Loading categories..." : "Select a category"} />
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
              />
              <FormField
                control={form.control}
                name="brandId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brand</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value?.toString()} disabled={isLoadingData}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={isLoadingData ? "Loading brands..." : "Select a brand"} />
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
              />
              <FormField
                control={form.control}
                name="supplierId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supplier</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value?.toString()} disabled={isLoadingData}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={isLoadingData ? "Loading suppliers..." : "Select a supplier"} />
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
              />
               <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value ?? "DRAFT"}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select product status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {productStatuses.map(status => (
                          status && <SelectItem key={status} value={status}>{status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, ' ')}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card className="shadow-md">
             <CardHeader>
                <CardTitle>Media & Details</CardTitle>
                <CardDescription>Additional product imagery, tags, and specifications.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="imageUrlsInput"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image URLs</FormLabel>
                    <FormControl>
                      <Textarea placeholder="e.g., https://example.com/image1.jpg, https://example.com/image2.png" {...field} value={field.value ?? ""} />
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
                  <FormItem>
                    <FormLabel>Tags</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., electronics, new, featured" {...field} value={field.value ?? ""}/>
                    </FormControl>
                    <FormDescription>Comma-separated tags.</FormDescription>
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
                        Mark this product as featured to highlight it.
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
            <CardContent className="grid gap-6 md:grid-cols-2">
                 <FormField
                control={form.control}
                name="metaTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meta Title</FormLabel>
                    <FormControl>
                      <Input placeholder="SEO friendly title" {...field} value={field.value ?? ""} />
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
                      <Textarea placeholder="Concise SEO description (max 160 characters)" {...field} value={field.value ?? ""} />
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
                    Advanced product attribute management (e.g., size, color options based on selectable attributes) will be implemented in a future update.
                </p>
            </CardContent>
          </Card>


          <CardFooter className="flex justify-end gap-2 pt-6">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting || isLoadingData}>
              {form.formState.isSubmitting ? "Creating..." : <><PackagePlus className="mr-2 h-4 w-4" /> Create Product</>}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </div>
  );
}

