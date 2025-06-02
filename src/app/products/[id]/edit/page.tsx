
"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  fetchProductById,
  updateProduct,
  addMultipleVariants,
  updateProductVariant,
  type UpdateProductRequest,
  type ProductDto,
  type ProductVariantDto,
  type AddProductVariantsRequest,
  type UpdateVariantRequest,
} from "@/lib/apiClient";
import { ChevronLeft, Save, PlusCircle, Loader2, Trash2, X as XIcon, Edit3, Image as ImageIcon, Weight, ScanBarcode, Palette, Ruler, ShoppingBasket, List, Edit, Settings2, Info, DollarSign, Archive, Shirt } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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

const editVariantFormSchema = z.object({
  sku: z.string().optional().nullable(),
  barcode: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  size: z.string().optional().nullable(),
  status: z.string().min(1, "Status is required"),
  mrp: z.coerce.number({invalid_type_error: "MRP must be a number"}).min(0, "MRP must be non-negative").optional().nullable(),
  sellingPrice: z.coerce.number({invalid_type_error: "Selling price must be a number"}).min(0, "Selling price must be non-negative").optional().nullable(),
  quantity: z.coerce.number({invalid_type_error: "Quantity must be a number"}).int().min(0, "Quantity must be non-negative").optional().nullable(),
  capacity: z.string().optional().nullable(),
  dimensionLength: z.coerce.number().min(0).optional().nullable(),
  dimensionWidth: z.coerce.number().min(0).optional().nullable(),
  dimensionHeight: z.coerce.number().min(0).optional().nullable(),
  dimensionUnit: z.string().optional().nullable(),
  weight: z.coerce.number().min(0).optional().nullable(),
  purchaseCostMrp: z.coerce.number({invalid_type_error: "MRP must be a number"}).min(0).optional().nullable(),
  purchaseCostConsumerDiscountRate: z.coerce.number({invalid_type_error: "Rate must be a number"}).min(0).max(100).optional().nullable(),
  purchaseCostTraderDiscountRate: z.coerce.number({invalid_type_error: "Rate must be a number"}).min(0).max(100).optional().nullable(),
  purchaseCostCashDiscountRate: z.coerce.number({invalid_type_error: "Rate must be a number"}).min(0).max(100).optional().nullable(),
  purchaseCostCostPrice: z.coerce.number({invalid_type_error: "Cost price must be a number"}).min(0).optional().nullable(),
  imageUrlsInput: z.string().optional().nullable(),
});
type EditVariantFormValues = z.infer<typeof editVariantFormSchema>;


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

function EditVariantCostCalculator({control, setValue}: {control: any, setValue: any}) {
  const purchaseMrp = useWatch({ control, name: "purchaseCostMrp" });
  const consumerDiscRate = useWatch({ control, name: "purchaseCostConsumerDiscountRate" });
  const traderDiscRate = useWatch({ control, name: "purchaseCostTraderDiscountRate" });
  const cashDiscRate = useWatch({ control, name: "purchaseCostCashDiscountRate" });

  React.useEffect(() => {
    const mrp = parseFloat(purchaseMrp) || 0;
    const cdr = parseFloat(consumerDiscRate) || 0;
    const tdr = parseFloat(traderDiscRate) || 0;
    const cashdr = parseFloat(cashDiscRate) || 0;

    if (mrp > 0) {
      let cost = mrp;
      cost = cost * (1 - cdr / 100);
      cost = cost * (1 - tdr / 100);
      cost = cost * (1 - cashdr / 100);
      setValue("purchaseCostCostPrice", parseFloat(cost.toFixed(2)), { shouldValidate: true });
    } else {
       setValue("purchaseCostCostPrice", 0, { shouldValidate: true });
    }
  }, [purchaseMrp, consumerDiscRate, traderDiscRate, cashDiscRate, setValue]);

  return null; // This component only performs calculations
}


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

  const [showEditVariantModal, setShowEditVariantModal] = React.useState(false);
  const [editingVariant, setEditingVariant] = React.useState<ProductVariantDto | null>(null);
  const [isSubmittingVariant, setIsSubmittingVariant] = React.useState(false);

  const productStatuses = hardcodedProductStatuses;

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "", brand: "", category: "", subCategory: "", hsnCode: "", description: "",
      gstTaxRate: undefined, status: "DRAFT", tagsInput: "",
    },
  });

  const addVariantsForm = useForm<AddVariantsFormValues>({
    resolver: zodResolver(addVariantsFormSchema),
    defaultValues: { colors: "", sizes: "" },
  });

  const editVariantForm = useForm<EditVariantFormValues>({
    resolver: zodResolver(editVariantFormSchema),
    defaultValues: {
      sku: "", barcode: "", title: "", color: "", size: "",
      status: "ACTIVE", mrp: undefined, sellingPrice: undefined, quantity: undefined,
      capacity: "", dimensionLength: undefined, dimensionWidth: undefined, dimensionHeight: undefined,
      dimensionUnit: "MM", weight: undefined, purchaseCostMrp: undefined,
      purchaseCostConsumerDiscountRate: undefined, purchaseCostTraderDiscountRate: undefined,
      purchaseCostCashDiscountRate: undefined, purchaseCostCostPrice: undefined, imageUrlsInput: ""
    }
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
  }, [productId, router, toast, form, productStatuses]);

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

      const payload: UpdateProductRequest = {
        name: data.name, brand: data.brand, category: data.category,
        subCategory: data.subCategory || undefined, hsnCode: data.hsnCode || undefined,
        description: data.description || undefined,
        gstTaxRate: data.gstTaxRate === undefined || data.gstTaxRate === null ? undefined : Number(data.gstTaxRate),
        status: data.status as UpdateProductRequest['status'] || undefined,
        tags: tags,
      };

      await updateProduct(productId, payload);
      toast({ title: "Success", description: "Product updated successfully." });
      fetchProductData();
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

  const handleOpenEditVariantModal = (variant: ProductVariantDto) => {
    setEditingVariant(variant);
    editVariantForm.reset({
      sku: variant.sku ?? "",
      barcode: variant.barcode ?? "",
      title: variant.title ?? "",
      color: variant.color ?? "",
      size: variant.size ?? "",
      status: (variant.status?.toUpperCase() && productStatuses.includes(variant.status.toUpperCase()) ? variant.status.toUpperCase() : "ACTIVE") as EditVariantFormValues['status'],
      mrp: variant.mrp === null || variant.mrp === undefined ? undefined : variant.mrp,
      sellingPrice: variant.sellingPrice === null || variant.sellingPrice === undefined ? undefined : variant.sellingPrice,
      quantity: variant.quantity === null || variant.quantity === undefined ? undefined : variant.quantity,
      capacity: variant.capacity ?? "",
      dimensionLength: variant.dimension?.length ?? undefined,
      dimensionWidth: variant.dimension?.width ?? undefined,
      dimensionHeight: variant.dimension?.height ?? undefined,
      dimensionUnit: variant.dimension?.unit ?? "MM",
      weight: variant.weight ?? undefined,
      purchaseCostMrp: variant.purchaseCost?.mrp ?? undefined,
      purchaseCostConsumerDiscountRate: variant.purchaseCost?.consumerDiscountRate ?? undefined,
      purchaseCostTraderDiscountRate: variant.purchaseCost?.traderDiscountRate ?? undefined,
      purchaseCostCashDiscountRate: variant.purchaseCost?.cashDiscountRate ?? undefined,
      purchaseCostCostPrice: variant.purchaseCost?.costPrice ?? undefined,
      imageUrlsInput: variant.images?.join(", ") ?? "",
    });
    setShowEditVariantModal(true);
  };

  async function handleEditVariantSubmit(data: EditVariantFormValues) {
    if (!productId || !editingVariant) return;
    setIsSubmittingVariant(true);
    try {
      const dimension = (data.dimensionLength !== undefined || data.dimensionWidth !== undefined || data.dimensionHeight !== undefined)
        ? {
            length: data.dimensionLength,
            width: data.dimensionWidth,
            height: data.dimensionHeight,
            unit: data.dimensionUnit || "MM",
          }
        : undefined;

      const purchaseCost = (data.purchaseCostMrp !== undefined || data.purchaseCostConsumerDiscountRate !== undefined || data.purchaseCostTraderDiscountRate !== undefined || data.purchaseCostCashDiscountRate !== undefined || data.purchaseCostCostPrice !== undefined)
        ? {
            mrp: data.purchaseCostMrp,
            consumerDiscountRate: data.purchaseCostConsumerDiscountRate,
            traderDiscountRate: data.purchaseCostTraderDiscountRate,
            cashDiscountRate: data.purchaseCostCashDiscountRate,
            costPrice: data.purchaseCostCostPrice,
          }
        : undefined;

      const imageUrls = data.imageUrlsInput?.split(',').map(url => url.trim()).filter(Boolean) || undefined;

      const payload: UpdateVariantRequest = {
        sku: data.sku || undefined,
        barcode: data.barcode || undefined,
        title: data.title || undefined,
        color: data.color || undefined,
        size: data.size || undefined,
        status: data.status as UpdateVariantRequest['status'],
        mrp: data.mrp === undefined || data.mrp === null ? undefined : Number(data.mrp),
        sellingPrice: data.sellingPrice === undefined || data.sellingPrice === null ? undefined : Number(data.sellingPrice),
        quantity: data.quantity === undefined || data.quantity === null ? undefined : Number(data.quantity),
        capacity: data.capacity || undefined,
        dimension: dimension,
        weight: data.weight === undefined || data.weight === null ? undefined : Number(data.weight),
        purchaseCost: purchaseCost,
        imageUrls: imageUrls,
        allowCriticalFieldUpdates: false, // Keep this as false generally
      };
      await updateProductVariant(productId, editingVariant.id, payload);
      toast({ title: "Success", description: "Variant updated successfully." });
      setShowEditVariantModal(false);
      setEditingVariant(null);
      fetchProductData();
    } catch (error: any) {
      toast({
        title: "Error Updating Variant",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingVariant(false);
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
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Edit Product: {form.watch("name") || product.name}</h1>
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
              <FormItem>
                <FormLabel>Base SKU (Read-only)</FormLabel>
                <FormControl><Input value={product.sku ?? "N/A"} readOnly disabled /></FormControl>
                <FormDescription>Base product SKU. Variant SKUs are managed per variant.</FormDescription>
              </FormItem>
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
            <CardHeader><CardTitle>Existing Variants</CardTitle><CardDescription>Manage existing product variants.</CardDescription></CardHeader>
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
                        <TableCell>{variant.quantity ?? 'N/A'}</TableCell>
                        <TableCell className="text-right">
                          <Button type="button" variant="outline" size="sm" onClick={() => handleOpenEditVariantModal(variant)}>
                            <Edit3 className="mr-1 h-3 w-3" /> Edit
                          </Button>
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
                                            <Label htmlFor={`add-variants-colors`}>Color Names (Optional)</Label>
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
                                            <Label htmlFor={`add-variants-sizes`}>Size Names (Optional)</Label>
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
            <CardHeader><CardTitle>Other Properties</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 md:gap-6">
              <FormItem className="md:col-span-2">
                <FormLabel htmlFor="tagsInput-edit">Tags</FormLabel>
                <Controller
                    control={form.control}
                    name="tagsInput"
                    render={({ field: f }) => (
                        <TagsInputWithPreview
                            id="tagsInput-edit"
                            value={f.value ?? ""}
                            onChange={f.onChange}
                            placeholder="Type tag and press Enter/Comma"
                        />
                    )}
                />
                <FormDescription>Comma-separated tags.</FormDescription>
                <FormMessage />
              </FormItem>
               <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} value={field.value ?? ""}><FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl><SelectContent>{productStatuses.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
            </CardContent>
          </Card>

          <CardFooter className="flex flex-col sm:flex-row justify-end gap-2 pt-6">
            <Button type="button" variant="outline" onClick={() => router.push("/products")} className="w-full sm:w-auto">Cancel</Button>
            <Button type="submit" disabled={isSubmitting || isLoading} className="w-full sm:w-auto">
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving Product...</> : <><Save className="mr-2 h-4 w-4" /> Save Product Changes</>}
            </Button>
          </CardFooter>
        </form>
      </Form>

      {/* Edit Variant Modal */}
      <Dialog open={showEditVariantModal} onOpenChange={(isOpen) => {
        if (!isOpen) {
          setEditingVariant(null);
          editVariantForm.reset();
        }
        setShowEditVariantModal(isOpen);
      }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Variant: {editingVariant?.title || editingVariant?.sku || "Variant"}</DialogTitle>
            <CardDescription>Modify the details for this specific product variant.</CardDescription>
          </DialogHeader>
          <Form {...editVariantForm}>
            <form onSubmit={editVariantForm.handleSubmit(handleEditVariantSubmit)} className="flex flex-col flex-grow overflow-hidden">
              <ScrollArea className="flex-grow pr-3 -mr-3 mb-4"> {/* Scroll area for modal content */}
                <EditVariantCostCalculator control={editVariantForm.control} setValue={editVariantForm.setValue} />
                <Tabs defaultValue="general" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 md:grid-cols-5 mb-4 sticky top-0 bg-background z-10">
                    <TabsTrigger value="general"><Info className="mr-1 h-4 w-4 md:hidden"/>General</TabsTrigger>
                    <TabsTrigger value="pricing"><DollarSign className="mr-1 h-4 w-4 md:hidden"/>Pricing</TabsTrigger>
                    <TabsTrigger value="purchase"><Archive className="mr-1 h-4 w-4 md:hidden"/>Purchase</TabsTrigger>
                    <TabsTrigger value="physical"><Shirt className="mr-1 h-4 w-4 md:hidden"/>Physical</TabsTrigger>
                    <TabsTrigger value="images"><ImageIcon className="mr-1 h-4 w-4 md:hidden"/>Images</TabsTrigger>
                  </TabsList>

                  <div className="space-y-4 py-2">
                    <TabsContent value="general" className="space-y-4 mt-0">
                      <FormField control={editVariantForm.control} name="title" render={({ field }) => (<FormItem><FormLabel>Variant Title</FormLabel><FormControl><Input placeholder="e.g., Red - Medium" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={editVariantForm.control} name="color" render={({ field }) => (<FormItem><FormLabel>Color</FormLabel><FormControl><Input placeholder="e.g., Red" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={editVariantForm.control} name="size" render={({ field }) => (<FormItem><FormLabel>Size</FormLabel><FormControl><Input placeholder="e.g., M" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={editVariantForm.control} name="sku" render={({ field }) => (<FormItem><FormLabel>SKU</FormLabel><FormControl><Input placeholder="Variant SKU" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={editVariantForm.control} name="barcode" render={({ field }) => (<FormItem><FormLabel>Barcode (EAN/UPC)</FormLabel><FormControl><Input placeholder="Variant Barcode" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                      </div>
                      <FormField control={editVariantForm.control} name="status" render={({ field }) => (<FormItem><FormLabel>Status *</FormLabel><Select onValueChange={field.onChange} value={field.value ?? "ACTIVE"}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{productStatuses.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                    </TabsContent>

                    <TabsContent value="pricing" className="space-y-4 mt-0">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField control={editVariantForm.control} name="mrp" render={({ field }) => (<FormItem><FormLabel>MRP (₹)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="e.g., 1299" {...field} onChange={e => field.onChange(e.target.value === '' ? null : +e.target.value)} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                          <FormField control={editVariantForm.control} name="sellingPrice" render={({ field }) => (<FormItem><FormLabel>Selling Price (₹)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="e.g., 999" {...field} onChange={e => field.onChange(e.target.value === '' ? null : +e.target.value)} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                      </div>
                      <FormField control={editVariantForm.control} name="quantity" render={({ field }) => (<FormItem><FormLabel>Stock Quantity</FormLabel><FormControl><Input type="number" placeholder="e.g., 100" {...field} onChange={e => field.onChange(e.target.value === '' ? null : +e.target.value)} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                    </TabsContent>

                    <TabsContent value="purchase" className="space-y-4 mt-0">
                       <FormField control={editVariantForm.control} name="purchaseCostMrp" render={({ field }) => (<FormItem><FormLabel>Purchase MRP (₹)</FormLabel><FormControl><Input type="number" step="0.01" {...field} onChange={e => field.onChange(e.target.value === '' ? null : +e.target.value)} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <FormField control={editVariantForm.control} name="purchaseCostConsumerDiscountRate" render={({ field }) => (<FormItem><FormLabel>Consumer Disc. (%)</FormLabel><FormControl><Input type="number" step="0.01" {...field} onChange={e => field.onChange(e.target.value === '' ? null : +e.target.value)} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                          <FormField control={editVariantForm.control} name="purchaseCostTraderDiscountRate" render={({ field }) => (<FormItem><FormLabel>Trader Disc. (%)</FormLabel><FormControl><Input type="number" step="0.01" {...field} onChange={e => field.onChange(e.target.value === '' ? null : +e.target.value)} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                          <FormField control={editVariantForm.control} name="purchaseCostCashDiscountRate" render={({ field }) => (<FormItem><FormLabel>Cash Disc. (%)</FormLabel><FormControl><Input type="number" step="0.01" {...field} onChange={e => field.onChange(e.target.value === '' ? null : +e.target.value)} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                       </div>
                       <FormField control={editVariantForm.control} name="purchaseCostCostPrice" render={({ field }) => (<FormItem><FormLabel>Actual Cost Price (₹)</FormLabel><FormControl><Input type="number" step="0.01" {...field} onChange={e => field.onChange(e.target.value === '' ? null : +e.target.value)} value={field.value ?? ""} readOnly /></FormControl><FormDescription>Auto-calculated based on MRP and discounts.</FormDescription><FormMessage /></FormItem>)} />
                    </TabsContent>

                    <TabsContent value="physical" className="space-y-4 mt-0">
                      <FormField control={editVariantForm.control} name="capacity" render={({ field }) => (<FormItem><FormLabel>Capacity</FormLabel><FormControl><Input placeholder="e.g., 250ml, 1kg" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={editVariantForm.control} name="weight" render={({ field }) => (<FormItem><FormLabel>Weight (g)</FormLabel><FormControl><Input type="number" step="0.001" placeholder="e.g., 250" {...field} onChange={e => field.onChange(e.target.value === '' ? null : +e.target.value)} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                      <FormLabel>Dimensions</FormLabel>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
                          <FormField control={editVariantForm.control} name="dimensionLength" render={({ field }) => (<FormItem><FormLabel className="text-xs">Length</FormLabel><FormControl><Input type="number" step="0.1" {...field} onChange={e => field.onChange(e.target.value === '' ? null : +e.target.value)} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                          <FormField control={editVariantForm.control} name="dimensionWidth" render={({ field }) => (<FormItem><FormLabel className="text-xs">Width</FormLabel><FormControl><Input type="number" step="0.1" {...field} onChange={e => field.onChange(e.target.value === '' ? null : +e.target.value)} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                          <FormField control={editVariantForm.control} name="dimensionHeight" render={({ field }) => (<FormItem><FormLabel className="text-xs">Height</FormLabel><FormControl><Input type="number" step="0.1" {...field} onChange={e => field.onChange(e.target.value === '' ? null : +e.target.value)} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                          <FormField control={editVariantForm.control} name="dimensionUnit" render={({ field }) => (<FormItem><FormLabel className="text-xs">Unit</FormLabel><Select onValueChange={field.onChange} value={field.value ?? "MM"}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="MM">MM</SelectItem><SelectItem value="CM">CM</SelectItem><SelectItem value="IN">IN</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                      </div>
                    </TabsContent>

                     <TabsContent value="images" className="space-y-4 mt-0">
                      <FormField
                          control={editVariantForm.control}
                          name="imageUrlsInput"
                          render={({ field }) => (
                              <FormItem>
                                  <FormLabel>Variant Image URLs</FormLabel>
                                  <TagsInputWithPreview
                                      id="variant-imageUrlsInput"
                                      value={field.value ?? ""}
                                      onChange={field.onChange}
                                      placeholder="Paste URL and press Enter/Comma"
                                  />
                                  <FormDescription>Comma-separated image URLs specific to this variant.</FormDescription>
                                  <FormMessage />
                              </FormItem>
                          )}
                      />
                    </TabsContent>
                  </div>
                </Tabs>
              </ScrollArea>
              <DialogFooter className="pt-4 mt-auto border-t">
                <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                <Button type="submit" disabled={isSubmittingVariant}>
                  {isSubmittingVariant ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving Variant...</> : <><Save className="mr-2 h-4 w-4" /> Save Variant</>}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
