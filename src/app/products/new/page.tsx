
"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { Suspense } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { 
  createProduct,
  type CreateProductRequest,
} from "@/lib/apiClient";
import { PackagePlus, ChevronLeft, X as XIcon } from "lucide-react";
import Link from "next/link";
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
  colorVariantInput: z.string().optional().nullable().describe("Comma-separated color names"),
  sizeVariantInput: z.string().optional().nullable().describe("Comma-separated size names"),
  tagsInput: z.string().optional().nullable().describe("Comma-separated tags"),
  status: z.string().optional().nullable(),
  // Fields for removed sections are commented out or deleted below
  // sku: z.string().optional().nullable(),
  // barcode: z.string().optional().nullable(),
  // quantity: z.coerce.number({invalid_type_error: "Quantity must be a number"}).int().min(0, "Quantity must be non-negative").optional().nullable(),
  // unitPrice: z.coerce.number({invalid_type_error: "Unit price must be a number"}).min(0, "Unit price must be non-negative").optional().nullable(),
  // costPrice: z.coerce.number({invalid_type_error: "Cost price must be a number"}).min(0).optional().nullable(),
  // imageUrlsInput: z.string().optional().nullable(), 
  // weight: z.coerce.number({invalid_type_error: "Weight must be a number"}).min(0).optional().nullable(),
  // dimensions: z.string().optional().nullable(),
  // isFeatured: z.boolean().default(false).optional(),
  // metaTitle: z.string().max(70, "Meta title should be 70 characters or less").optional().nullable(),
  // metaDescription: z.string().max(160, "Meta description should be 160 characters or less").optional().nullable(),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

// Helper function for color bullet preview
const shouldShowColorBullet = (colorString?: string | null): boolean => {
  if (!colorString || typeof colorString !== 'string') return false;
  const lowerColor = colorString.trim().toLowerCase();
  if (!lowerColor) return false;
  if (['n/a', 'default', 'various', 'assorted', 'transparent', 'none', 'na', 'mixed'].includes(lowerColor) || lowerColor.length > 25) {
    return false;
  }
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


// Wrapper component that uses useSearchParams
function ProductFormWithSearchParams({ onFormReady }: { onFormReady: (initialStatus: string | null) => void }) {
  const searchParams = useSearchParams();
  const initialStatusQueryParam = searchParams.get('status');

  React.useEffect(() => {
    onFormReady(initialStatusQueryParam);
  }, [onFormReady, initialStatusQueryParam]);

  return null;
}

export default function CreateProductPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [initialStatusQueryParam, setInitialStatusQueryParam] = React.useState<string | null>(null);
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
      colorVariantInput: "",
      sizeVariantInput: "",
      tagsInput: "",
      status: initialStatusQueryParam && productStatuses.includes(initialStatusQueryParam.toUpperCase()) 
              ? initialStatusQueryParam.toUpperCase() 
              : (productStatuses.includes('DRAFT') ? 'DRAFT' : productStatuses[0]),
      // Default values for removed fields are deleted
    },
  });

  // Handler for when the search params are ready
  const handleSearchParamsReady = React.useCallback((initialStatus: string | null) => {
    setInitialStatusQueryParam(initialStatus);
  }, []);

  React.useEffect(() => {
    if (initialStatusQueryParam !== null) {
      const validInitialStatus = initialStatusQueryParam && productStatuses.includes(initialStatusQueryParam.toUpperCase())
        ? initialStatusQueryParam.toUpperCase()
        : (productStatuses.includes('DRAFT') ? 'DRAFT' : productStatuses[0]);
      if (form.getValues('status') !== validInitialStatus) {
        form.reset({ ...form.getValues(), status: validInitialStatus });
      }
    }
  }, [form, initialStatusQueryParam, productStatuses]);


  async function onSubmit(data: ProductFormValues) {
    try {
      const colorVariants = data.colorVariantInput?.split(',').map(c => c.trim()).filter(Boolean) || undefined;
      const sizeVariants = data.sizeVariantInput?.split(',').map(s => s.trim()).filter(Boolean) || undefined;
      const tags = data.tagsInput?.split(',').map(t => t.trim()).filter(Boolean) || undefined;
      // imageUrls removed from payload

      const productPayload: CreateProductRequest = {
        name: data.name,
        brand: data.brand, 
        hsnCode: data.hsnCode || undefined,
        description: data.description || undefined,
        gstTaxRate: data.gstTaxRate === undefined || data.gstTaxRate === null ? undefined : Number(data.gstTaxRate),
        category: data.category, 
        subCategory: data.subCategory || undefined,
        colorVariant: colorVariants,
        sizeVariant: sizeVariants,
        tags: tags,
        status: data.status as CreateProductRequest['status'] || 'DRAFT',

        // Fields for removed sections are removed from payload
        // sku: data.sku || undefined,
        // barcode: data.barcode || undefined,
        // quantity: data.quantity === undefined || data.quantity === null ? undefined : Number(data.quantity), 
        // unitPrice: data.unitPrice === undefined || data.unitPrice === null ? undefined : Number(data.unitPrice), 
        // costPrice: data.costPrice === undefined || data.costPrice === null ? undefined : Number(data.costPrice),
        // imageUrls: imageUrls,
        // weight: data.weight === undefined || data.weight === null ? undefined : Number(data.weight),
        // dimensions: data.dimensions || undefined,
        // isFeatured: data.isFeatured,
        // metaTitle: data.metaTitle || undefined,
        // metaDescription: data.metaDescription || undefined,
      };

      await createProduct(productPayload);
      toast({
        title: "Success",
        description: "Product created successfully.",
      });
      router.push("/products");
      router.refresh();
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
      {/* Wrap the component that uses useSearchParams in a Suspense boundary */}
      <Suspense fallback={<div>Loading...</div>}>
        <ProductFormWithSearchParams onFormReady={handleSearchParamsReady} />
      </Suspense>

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
              <CardTitle>Codes &amp; Taxes</CardTitle>
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
                <FormItem>
                    <FormLabel htmlFor="colorVariantInput">Color Names</FormLabel>
                    <Controller
                        control={form.control}
                        name="colorVariantInput"
                        render={({ field }) => (
                            <TagsInputWithPreview
                                id="colorVariantInput"
                                value={field.value ?? ""}
                                onChange={field.onChange}
                                placeholder="Type color and press Enter/Comma"
                                isColorInput
                            />
                        )}
                    />
                    <FormDescription className="mt-1">Comma-separated, e.g., Red, Blue</FormDescription>
                    <FormMessage>{form.formState.errors.colorVariantInput?.message}</FormMessage>
                </FormItem>
                <FormItem>
                    <FormLabel htmlFor="sizeVariantInput">Size Names</FormLabel>
                     <Controller
                        control={form.control}
                        name="sizeVariantInput"
                        render={({ field }) => (
                            <TagsInputWithPreview
                                id="sizeVariantInput"
                                value={field.value ?? ""}
                                onChange={field.onChange}
                                placeholder="Type size and press Enter/Comma"
                            />
                        )}
                    />
                     <FormDescription className="mt-1">Comma-separated, e.g., S, M, L</FormDescription>
                    <FormMessage>{form.formState.errors.sizeVariantInput?.message}</FormMessage>
                </FormItem>
            </CardContent>
          </Card>

          {/* Removed "Optional Base Product Details" Card */}

          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Tags &amp; Status</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 md:gap-6">
              <FormField control={form.control} name="tagsInput" render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Tags</FormLabel>
                    {/* <FormControl><Input placeholder="e.g., Cotton, Round Neck, Summer" {...field} value={field.value ?? ""}/></FormControl> */}
                    <Controller
                        control={form.control}
                        name="tagsInput"
                        render={({ field: f }) => (
                            <TagsInputWithPreview
                                id="tagsInput"
                                value={f.value ?? ""}
                                onChange={f.onChange}
                                placeholder="Type tag and press Enter/Comma"
                            />
                        )}
                    />
                    <FormDescription>Comma-separated tags.</FormDescription>
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
              {/* isFeatured Checkbox removed */}
            </CardContent>
          </Card>

          {/* Removed "SEO Information" Card */}

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
