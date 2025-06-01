
"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, useFieldArray, Controller } from "react-hook-form";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  fetchProductById,
  updateProduct,
  addMultipleVariants,
  type UpdateProductRequest,
  type ProductDto,
  type ProductVariantDto,
  type AddProductVariantsRequest
} from "@/lib/apiClient";
import { ChevronLeft, Save, PlusCircle, Loader2, Trash2, X as XIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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
  tagsInput: z.string().optional().nullable(),
  sku: z.string().optional().nullable(),
  barcode: z.string().optional().nullable(),
  costPrice: z.coerce.number({invalid_type_error: "Cost price must be a number"}).min(0).optional().nullable(),
  imageUrlsInput: z.string().optional().nullable(),
  weight: z.coerce.number({invalid_type_error: "Weight must be a number"}).min(0).optional().nullable(),
  dimensions: z.string().optional().nullable(),
  isFeatured: z.boolean().default(false).optional(),
  metaTitle: z.string().max(70).optional().nullable(),
  metaDescription: z.string().max(160).optional().nullable(),
  status: z.string().optional().nullable(),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

const addVariantsFormSchema = z.object({
  colors: z.string().optional().nullable(),
  sizes: z.string().optional().nullable(),
}).refine(data => data.colors || data.sizes, {
  message: "At least one color or size must be provided.",
  path: ["colors"],
});
type AddVariantsFormValues = z.infer<typeof addVariantsFormSchema>;


// Helper function for color bullet preview
const shouldShowColorBullet = (colorString?: string | null): boolean => {
  if (!colorString || typeof colorString !== 'string') return false;
  const lowerColor = colorString.trim().toLowerCase();
  if (!lowerColor) return false;
  // Avoid common non-color descriptive terms or overly long strings
  if (['n/a', 'default', 'various', 'assorted', 'transparent', 'none', 'na', 'mixed'].includes(lowerColor) || lowerColor.length > 25) {
    return false;
  }
  // Avoid if it has too many spaces (likely a description not a color), unless it's an rgb/hsl string
  if (lowerColor.includes(' ') && lowerColor.split(' ').length > 3 && !['rgb', 'hsl'].some(prefix => lowerColor.startsWith(prefix))) {
      return false;
  }
  return true;
};

interface TagsInputWithPreviewProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  isColorInput?: boolean;
  id?: string;
}

const TagsInputWithPreview: React.FC<TagsInputWithPreviewProps> = ({
  value,
  onChange,
  placeholder,
  isColorInput = false,
  id
}) => {
  const [inputValue, setInputValue] = React.useState('');
  const [tags, setTags] = React.useState<string[]>([]);

  React.useEffect(() => {
    setTags(value ? value.split(',').map(tag => tag.trim()).filter(tag => tag) : []);
  }, [value]);

  const updateFormValue = (newTags: string[]) => {
    onChange(newTags.join(','));
  };

  const addTag = (tagToAdd: string) => {
    const trimmedTag = tagToAdd.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      const newTags = [...tags, trimmedTag];
      setTags(newTags);
      updateFormValue(newTags);
    }
    setInputValue('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (['Enter', ',', 'Tab'].includes(e.key)) {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && inputValue === '' && tags.length > 0) {
      e.preventDefault();
      const newTags = tags.slice(0, -1);
      setTags(newTags);
      updateFormValue(newTags);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const newTags = tags.filter(tag => tag !== tagToRemove);
    setTags(newTags);
    updateFormValue(newTags);
  };
  
  const handleInputBlur = () => {
    addTag(inputValue);
  };

  return (
    <div id={id}>
      <div className="flex flex-wrap gap-2 mb-2 min-h-[2.25rem] items-center">
        {tags.map((tag, index) => (
          <Badge key={index} variant="secondary" className="py-1 px-2 text-sm flex items-center gap-1.5">
            {isColorInput && shouldShowColorBullet(tag) && (
              <span
                className="inline-block h-3 w-3 rounded-full border border-gray-400 shrink-0"
                style={{ backgroundColor: tag }}
                title={tag}
              />
            )}
            <span>{tag}</span>
            <button
              type="button"
              onClick={() => handleRemoveTag(tag)}
              className="ml-1 text-muted-foreground hover:text-foreground"
              aria-label={`Remove ${tag}`}
            >
              <XIcon className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      <Input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onBlur={handleInputBlur}
        placeholder={tags.length === 0 ? placeholder : "Add more..."}
        className="w-full"
      />
    </div>
  );
};


export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const productId = params.id as string;

  const [product, setProduct] = React.useState<ProductDto | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showAddVariantsModal, setShowAddVariantsModal] = React.useState(false);
  const [isAddingVariants, setIsAddingVariants] = React.useState(false);

  const productStatuses = hardcodedProductStatuses;

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "", brand: "", category: "", subCategory: "", hsnCode: "", description: "",
      gstTaxRate: undefined, status: "DRAFT", tagsInput: "", sku: "", barcode: "",
      costPrice: undefined, imageUrlsInput: "", weight: undefined, dimensions: "",
      isFeatured: false, metaTitle: "", metaDescription: "",
    },
  });

  const addVariantsForm = useForm<AddVariantsFormValues>({
    resolver: zodResolver(addVariantsFormSchema),
    defaultValues: { colors: "", sizes: "" },
  });

  const fetchProductData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedProduct = await fetchProductById(productId);
      setProduct(fetchedProduct);

      const currentStatus = fetchedProduct.status?.toUpperCase();
      const validStatus = productStatuses.includes(currentStatus as any) ? currentStatus : "DRAFT";
      
      form.reset({
        name: fetchedProduct.name || "", brand: fetchedProduct.brand || "", 
        category: fetchedProduct.category || "", subCategory: fetchedProduct.subCategory ?? "",
        hsnCode: fetchedProduct.hsnCode ?? "", description: fetchedProduct.description ?? "",
        gstTaxRate: fetchedProduct.gstTaxRate === null ? undefined : fetchedProduct.gstTaxRate,
        status: validStatus, tagsInput: fetchedProduct.tags?.join(", ") ?? "",
        sku: fetchedProduct.sku ?? "", barcode: fetchedProduct.barcode ?? "", 
        costPrice: fetchedProduct.costPrice === null ? undefined : fetchedProduct.costPrice,
        imageUrlsInput: fetchedProduct.imageUrls?.join(", ") ?? "",
        weight: fetchedProduct.weight === null ? undefined : fetchedProduct.weight,
        dimensions: fetchedProduct.dimensions ?? "", isFeatured: fetchedProduct.isFeatured ?? false,
        metaTitle: fetchedProduct.metaTitle ?? "", metaDescription: fetchedProduct.metaDescription ?? "",
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
  }, [productId, router, toast, form]);

  React.useEffect(() => {
    if (!productId) {
      toast({ title: "Error", description: "Invalid product ID.", variant: "destructive" });
      router.push("/products");
      return;
    }
    fetchProductData();
  }, [productId, router, toast, fetchProductData]);


  async function onSubmit(data: ProductFormValues) {
    if (!productId) return;
    setIsSubmitting(true);
    try {
      const tags = data.tagsInput?.split(',').map(t => t.trim()).filter(Boolean) || undefined;
      const imageUrls = data.imageUrlsInput?.split(',').map(url => url.trim()).filter(Boolean) || undefined;

      const payload: UpdateProductRequest = {
        name: data.name, brand: data.brand, category: data.category, 
        subCategory: data.subCategory || undefined, hsnCode: data.hsnCode || undefined,
        description: data.description || undefined,
        gstTaxRate: data.gstTaxRate === undefined || data.gstTaxRate === null ? undefined : Number(data.gstTaxRate),
        status: data.status as UpdateProductRequest['status'] || undefined,
        tags: tags, sku: data.sku || undefined, barcode: data.barcode || undefined,
        costPrice: data.costPrice === undefined || data.costPrice === null ? undefined : Number(data.costPrice),
        imageUrls: imageUrls,
        weight: data.weight === undefined || data.weight === null ? undefined : Number(data.weight),
        dimensions: data.dimensions || undefined, isFeatured: data.isFeatured,
        metaTitle: data.metaTitle || undefined, metaDescription: data.metaDescription || undefined,
      };

      await updateProduct(productId, payload);
      toast({ title: "Success", description: "Product updated successfully." });
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

  async function onAddVariantsSubmit(data: AddVariantsFormValues) {
    if (!productId) return;
    setIsAddingVariants(true);
    try {
      const colorsArray = data.colors?.split(',').map(c => c.trim()).filter(Boolean);
      const sizesArray = data.sizes?.split(',').map(s => s.trim()).filter(Boolean);

      const payload: AddProductVariantsRequest = {};
      if (colorsArray && colorsArray.length > 0) payload.color = colorsArray;
      if (sizesArray && sizesArray.length > 0) payload.size = sizesArray;
      
      if (!payload.color && !payload.size) {
        addVariantsForm.setError("colors", { type: "manual", message: "Please provide at least one color or size." });
        setIsAddingVariants(false);
        return;
      }

      await addMultipleVariants(productId, payload);
      toast({ title: "Success", description: "New variants added successfully." });
      setShowAddVariantsModal(false);
      addVariantsForm.reset({ colors: "", sizes: "" });
      fetchProductData(); 
    } catch (error: any) {
      toast({
        title: "Error Adding Variants",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsAddingVariants(false);
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
                    <FormControl><Input {...field} /></FormControl><FormMessage />
                  </FormItem> )} />
              <FormField control={form.control} name="brand" render={({ field }) => (
                  <FormItem><FormLabel>Brand Name *</FormLabel><FormControl><Input placeholder="e.g., Nike" {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="category" render={({ field }) => (
                  <FormItem><FormLabel>Category Name *</FormLabel><FormControl><Input placeholder="e.g., Apparel" {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="subCategory" render={({ field }) => (
                  <FormItem><FormLabel>Sub-Category Name</FormLabel><FormControl><Input placeholder="e.g., T-Shirts" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem className="md:col-span-2"><FormLabel>Description</FormLabel><FormControl><Textarea rows={3} {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem> )} />
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader><CardTitle>Codes & Taxes</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 md:gap-6">
              <FormField control={form.control} name="hsnCode" render={({ field }) => (
                  <FormItem><FormLabel>HSN Code</FormLabel><FormControl><Input placeholder="e.g., 61091000" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="gstTaxRate" render={({ field }) => (
                  <FormItem><FormLabel>GST Tax Rate (%)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="e.g., 18" {...field} onChange={e => field.onChange(e.target.value === '' ? null : +e.target.value)} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem> )} />
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader><CardTitle>Optional Base Product Details</CardTitle><CardDescription>Base values if product has no variants or as default. API may use variant-specific data.</CardDescription></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 md:gap-6">
                <FormField control={form.control} name="sku" render={({ field }) => (<FormItem><FormLabel>Base SKU</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="barcode" render={({ field }) => ( <FormItem><FormLabel>Base Barcode</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="costPrice" render={({ field }) => ( <FormItem><FormLabel>Base Cost Price</FormLabel><FormControl><Input type="number" step="0.01" {...field} onChange={e => field.onChange(e.target.value === '' ? null : +e.target.value)} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem> )} />
            </CardContent>
          </Card>
          
          <Card className="shadow-md">
            <CardHeader><CardTitle>Existing Variants</CardTitle><CardDescription>Manage existing product variants. Price and stock updates here will use specific variant update APIs.</CardDescription></CardHeader>
            <CardContent>
              {(!product.variants || product.variants.length === 0) ? (
                <p className="text-muted-foreground">No variants found for this product.</p>
              ) : (
                <Table>
                  <TableHeader><TableRow><TableHead>SKU</TableHead><TableHead>Color</TableHead><TableHead>Size</TableHead><TableHead>Selling Price</TableHead><TableHead>MRP</TableHead><TableHead>Stock</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
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
                 <Dialog open={showAddVariantsModal} onOpenChange={setShowAddVariantsModal}>
                    <DialogTrigger asChild>
                        <Button type="button" variant="outline">
                            <PlusCircle className="mr-2 h-4 w-4" /> Add New Variants (Combinations)
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Add New Variant Combinations</DialogTitle></DialogHeader>
                        <Form {...addVariantsForm}>
                            <form onSubmit={addVariantsForm.handleSubmit(onAddVariantsSubmit)} className="space-y-4">
                                <Controller
                                    control={addVariantsForm.control}
                                    name="colors"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel htmlFor={`add-variants-colors`}>Color Names (Optional)</FormLabel>
                                            <TagsInputWithPreview
                                                id={`add-variants-colors`}
                                                value={field.value ?? ""}
                                                onChange={field.onChange}
                                                placeholder="Type color and press Enter/Comma"
                                                isColorInput
                                            />
                                            <FormDescription>Comma-separated color names. Leave blank if not applicable.</FormDescription>
                                            <FormMessage>{addVariantsForm.formState.errors.colors?.message}</FormMessage>
                                        </FormItem>
                                    )}
                                />
                                <Controller
                                    control={addVariantsForm.control}
                                    name="sizes"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel htmlFor={`add-variants-sizes`}>Size Names (Optional)</FormLabel>
                                             <TagsInputWithPreview
                                                id={`add-variants-sizes`}
                                                value={field.value ?? ""}
                                                onChange={field.onChange}
                                                placeholder="Type size and press Enter/Comma"
                                            />
                                            <FormDescription>Comma-separated size names. Leave blank if not applicable.</FormDescription>
                                            <FormMessage>{addVariantsForm.formState.errors.sizes?.message}</FormMessage>
                                        </FormItem>
                                    )}
                                />
                                {addVariantsForm.formState.errors.colors && !addVariantsForm.formState.errors.sizes && <p className="text-sm font-medium text-destructive">{addVariantsForm.formState.errors.colors.message}</p>}
                                <DialogFooter>
                                    <DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose>
                                    <Button type="submit" disabled={isAddingVariants}>
                                        {isAddingVariants ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Adding...</> : "Add Variants"}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-md">
            <CardHeader><CardTitle>Media, Status & Other Details</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 md:gap-6">
              <FormField control={form.control} name="tagsInput" render={({ field }) => (
                  <FormItem className="md:col-span-2"><FormLabel>Tags</FormLabel><FormControl><Input placeholder="e.g., electronics, new, featured" {...field} value={field.value ?? ""}/></FormControl><FormDescription>Comma-separated tags.</FormDescription><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="imageUrlsInput" render={({ field }) => (
                  <FormItem className="md:col-span-2"><FormLabel>Image URLs</FormLabel><FormControl><Textarea rows={3} placeholder="e.g., https://example.com/image1.jpg" {...field} value={field.value ?? ""} /></FormControl><FormDescription>Comma-separated product-level image URLs.</FormDescription><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="weight" render={({ field }) => (
                  <FormItem><FormLabel>Weight (kg)</FormLabel><FormControl><Input type="number" step="0.01" {...field} onChange={e => field.onChange(e.target.value === '' ? null : +e.target.value)} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="dimensions" render={({ field }) => (
                  <FormItem><FormLabel>Dimensions (LxWxH cm)</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem> )} />
               <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} value={field.value ?? ""}><FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl><SelectContent>{productStatuses.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="isFeatured" render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 md:col-span-2"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><div className="space-y-1 leading-none"><FormLabel>Featured Product</FormLabel><FormDescription>Mark this product as featured.</FormDescription></div></FormItem> )} />
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader><CardTitle>SEO Information</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <FormField control={form.control} name="metaTitle" render={({ field }) => ( <FormItem><FormLabel>Meta Title</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="metaDescription" render={({ field }) => ( <FormItem><FormLabel>Meta Description</FormLabel><FormControl><Textarea rows={3} {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
            </CardContent>
          </Card>

          <CardFooter className="flex flex-col sm:flex-row justify-end gap-2 pt-6">
            <Button type="button" variant="outline" onClick={() => router.back()} className="w-full sm:w-auto">Cancel</Button>
            <Button type="submit" disabled={isSubmitting || isLoading} className="w-full sm:w-auto">
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : <><Save className="mr-2 h-4 w-4" /> Save Changes</>}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </div>
  );
}
