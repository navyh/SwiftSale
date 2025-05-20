
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
  fetchProductBrands,
  fetchProductCategoriesTree,
  fetchProductUnits,
  fetchProductStatuses,
  fetchSuppliers,
  type Brand,
  type ProductCategoryNode,
  type ProductUnit,
  type Supplier
} from "@/lib/apiClient";
import { PackagePlus, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

interface SelectOption {
  value: string;
  label: string;
}

// Helper to flatten category tree for select dropdown
const flattenCategories = (categories: ProductCategoryNode[], level = 0, prefix = ""): SelectOption[] => {
  let options: SelectOption[] = [];
  categories.forEach(category => {
    options.push({
      value: category.id.toString(),
      label: `${prefix}${category.name}`
    });
    if (category.children && category.children.length > 0) {
      options = options.concat(flattenCategories(category.children, level + 1, `${prefix}  `));
    }
  });
  return options;
};


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
  unitId: z.string().optional().nullable(),
  imageUrlsInput: z.string().optional().nullable(), 
  tagsInput: z.string().optional().nullable(), 
  status: z.string().optional().nullable(), // API returns strings for statuses
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
  
  const [categories, setCategories] = React.useState<SelectOption[]>([]);
  const [brands, setBrands] = React.useState<Brand[]>([]);
  const [suppliers, setSuppliers] = React.useState<Supplier[]>([]);
  const [units, setUnits] = React.useState<ProductUnit[]>([]);
  const [productStatuses, setProductStatuses] = React.useState<string[]>([]);
  
  const [isLoadingCategories, setIsLoadingCategories] = React.useState(true);
  const [isLoadingBrands, setIsLoadingBrands] = React.useState(true);
  const [isLoadingSuppliers, setIsLoadingSuppliers] = React.useState(true);
  const [isLoadingUnits, setIsLoadingUnits] = React.useState(true);
  const [isLoadingStatuses, setIsLoadingStatuses] = React.useState(true);

  const initialStatusQueryParam = searchParams.get('status') as CreateProductRequest['status'];
  
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
      unitId: undefined,
      imageUrlsInput: "",
      tagsInput: "",
      status: initialStatusQueryParam || "DRAFT",
      weight: undefined,
      dimensions: "",
      isFeatured: false,
      metaTitle: "",
      metaDescription: "",
    },
  });

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [categoriesData, brandsData, suppliersData, unitsData, statusesData] = await Promise.all([
          fetchProductCategoriesTree().finally(() => setIsLoadingCategories(false)),
          fetchProductBrands().finally(() => setIsLoadingBrands(false)),
          fetchSuppliers().finally(() => setIsLoadingSuppliers(false)), // Assuming suppliers are still from old meta or a new endpoint
          fetchProductUnits().finally(() => setIsLoadingUnits(false)),
          fetchProductStatuses().finally(() => setIsLoadingStatuses(false)),
        ]);
        setCategories(flattenCategories(categoriesData));
        setBrands(brandsData);
        setSuppliers(suppliersData);
        setUnits(unitsData);
        setProductStatuses(statusesData);

        const validInitialStatus = initialStatusQueryParam && statusesData.includes(initialStatusQueryParam)
          ? initialStatusQueryParam
          : (statusesData.includes('DRAFT') ? 'DRAFT' : statusesData[0]);
        form.reset({ ...form.getValues(), status: validInitialStatus });

      } catch (error: any) {
        toast({
          title: "Error fetching product metadata",
          description: error.message || "Could not load data for dropdowns.",
          variant: "destructive",
        });
      }
    };
    fetchData();
  }, [form, initialStatusQueryParam, toast]);


  async function onSubmit(data: ProductFormValues) {
    try {
      const productPayload: CreateProductRequest = {
        ...data,
        categoryId: data.categoryId ? parseInt(data.categoryId, 10) : null,
        brandId: data.brandId ? parseInt(data.brandId, 10) : null,
        supplierId: data.supplierId ? parseInt(data.supplierId, 10) : null,
        unitId: data.unitId ? parseInt(data.unitId, 10) : null,
        imageUrls: data.imageUrlsInput ? data.imageUrlsInput.split(',').map(url => url.trim()).filter(url => url) : null,
        tags: data.tagsInput ? data.tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag) : null,
        costPrice: data.costPrice === undefined || data.costPrice === null ? null : Number(data.costPrice),
        weight: data.weight === undefined || data.weight === null ? null : Number(data.weight),
        status: data.status as CreateProductRequest['status'] || 'DRAFT', 
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
  
  const isLoadingData = isLoadingCategories || isLoadingBrands || isLoadingSuppliers || isLoadingUnits || isLoadingStatuses;

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
            <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 md:gap-6">
              {isLoadingCategories ? <Skeleton className="h-10 w-full rounded-md" /> : <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value?.toString()} value={field.value?.toString()} disabled={categories.length === 0}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={categories.length === 0 ? "No categories available" : "Select a category"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />}
              {isLoadingBrands ? <Skeleton className="h-10 w-full rounded-md" /> : <FormField
                control={form.control}
                name="brandId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brand</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value?.toString()} value={field.value?.toString()} disabled={brands.length === 0}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={brands.length === 0 ? "No brands available" : "Select a brand"} />
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
              {isLoadingSuppliers ? <Skeleton className="h-10 w-full rounded-md" /> : <FormField
                control={form.control}
                name="supplierId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supplier</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value?.toString()} value={field.value?.toString()} disabled={suppliers.length === 0}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={suppliers.length === 0 ? "No suppliers available" : "Select a supplier"} />
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
               {isLoadingUnits ? <Skeleton className="h-10 w-full rounded-md" /> : <FormField
                control={form.control}
                name="unitId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value?.toString()} value={field.value?.toString()} disabled={units.length === 0}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={units.length === 0 ? "No units available" : "Select a unit"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {units.map(unit => (
                          <SelectItem key={unit.id} value={unit.id.toString()}>{unit.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />}
               {isLoadingStatuses ? <Skeleton className="h-10 w-full rounded-md" /> : <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
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

    