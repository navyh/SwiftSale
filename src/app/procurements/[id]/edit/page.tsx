"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ItemList, ItemListCard } from "@/components/ui/item-list";
import { format } from "date-fns";
import {
  ArrowLeft, ChevronLeft, ChevronRight, Trash2, Search as SearchIcon, Loader2, X, CalendarIcon
} from "lucide-react";
import {
  fetchProcurementById,
  updateProcurement,
  searchProductsFuzzy,
  fetchProductById,
  fetchBusinessProfileById,
  type ProcurementDto,
  type UpdateProcurementRequest,
  type ProcurementItemDto,
  type ProductSearchResultDto,
  type ProductDto,
  type ProductVariantDto,
  type BusinessProfileDto
} from "@/lib/apiClient";

// Zod schema for procurement form
const procurementFormSchema = z.object({
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  invoiceAmount: z.coerce.number().min(0.01, "Invoice amount must be greater than 0"),
  creditPeriod: z.coerce.number().min(0, "Credit period must be 0 or greater"),
  invoiceDate: z.date({
    required_error: "Invoice date is required",
  }),
  receiptDate: z.date({
    required_error: "Receipt date is required",
  }),
  notes: z.string().optional(),
});

type ProcurementFormValues = z.infer<typeof procurementFormSchema>;

// Interface for procurement item display
interface ProcurementItemDisplay {
  id?: string;
  productId: string;
  productName: string;
  variantId: string;
  variantName: string;
  quantity: number;
  unitPrice: number;
}

export default function EditProcurementPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [procurement, setProcurement] = React.useState<ProcurementDto | null>(null);
  const [vendorDetails, setVendorDetails] = React.useState<BusinessProfileDto | null>(null);
  const [isLoadingVendor, setIsLoadingVendor] = React.useState(false);
  const [invoiceDateOpen, setInvoiceDateOpen] = React.useState(false);
  const [receiptDateOpen, setReceiptDateOpen] = React.useState(false);

  // Product search and selection
  const [productSearchQuery, setProductSearchQuery] = React.useState("");
  const [productSearchResults, setProductSearchResults] = React.useState<ProductSearchResultDto[]>([]);
  const [isSearchingProducts, setIsSearchingProducts] = React.useState(false);
  const [selectedProductForDetails, setSelectedProductForDetails] = React.useState<ProductDto | null>(null);
  const [isLoadingProductDetails, setIsLoadingProductDetails] = React.useState(false);
  const [selectedVariant, setSelectedVariant] = React.useState<ProductVariantDto | null>(null);
  const [selectedQuantity, setSelectedQuantity] = React.useState(1);
  const [procurementItems, setProcurementItems] = React.useState<ProcurementItemDisplay[]>([]);

  // Form for procurement details
  const procurementForm = useForm<ProcurementFormValues>({
    resolver: zodResolver(procurementFormSchema),
    defaultValues: {
      invoiceNumber: "",
      invoiceAmount: 0,
      creditPeriod: 30,
      notes: "",
    }
  });

  // Fetch procurement details
  React.useEffect(() => {
    const loadProcurement = async () => {
      setIsLoading(true);
      try {
        const data = await fetchProcurementById(params.id);
        setProcurement(data);

        // Set form values
        procurementForm.setValue("invoiceNumber", data.invoiceNumber);
        procurementForm.setValue("invoiceAmount", data.invoiceAmount);
        procurementForm.setValue("creditPeriod", data.creditPeriod);
        if (data.invoiceDate) {
          procurementForm.setValue("invoiceDate", new Date(data.invoiceDate));
        }
        if (data.receiptDate) {
          procurementForm.setValue("receiptDate", new Date(data.receiptDate));
        }
        if (data.notes) {
          procurementForm.setValue("notes", data.notes);
        }

        // Set items
        if (data.items && data.items.length > 0) {
          const itemsDisplay: ProcurementItemDisplay[] = data.items.map(item => ({
            id: item.id,
            productId: item.productId,
            productName: item.productName,
            variantId: item.variantId,
            variantName: item.variantName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          }));
          setProcurementItems(itemsDisplay);
        }
      } catch (error: any) {
        toast({
          title: "Error loading procurement",
          description: error.message || "Failed to load procurement details.",
          variant: "destructive",
        });
        router.push("/procurements");
      } finally {
        setIsLoading(false);
      }
    };

    loadProcurement();
  }, [params.id, procurementForm, router, toast]);

  // Fetch vendor details
  React.useEffect(() => {
    if (procurement && procurement.businessProfileId) {
      const loadVendorDetails = async () => {
        setIsLoadingVendor(true);
        try {
          const data = await fetchBusinessProfileById(procurement.businessProfileId);
          setVendorDetails(data);
        } catch (error: any) {
          toast({
            title: "Error loading vendor details",
            description: error.message || "Failed to load vendor details.",
            variant: "destructive",
          });
        } finally {
          setIsLoadingVendor(false);
        }
      };

      loadVendorDetails();
    }
  }, [procurement, toast]);

  // Search products
  const searchProducts = React.useCallback(async (query: string) => {
    if (!query.trim()) {
      setProductSearchResults([]);
      return;
    }

    setIsSearchingProducts(true);
    try {
      const result = await searchProductsFuzzy(query);
      setProductSearchResults(result.content);
    } catch (error: any) {
      toast({
        title: "Error searching products",
        description: error.message || "Failed to search products. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSearchingProducts(false);
    }
  }, [toast]);

  // Handle product search input change
  const handleProductSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setProductSearchQuery(value);
    searchProducts(value);
  };

  // Load product details
  const loadProductDetails = React.useCallback(async (productId: string) => {
    setIsLoadingProductDetails(true);
    try {
      const product = await fetchProductById(productId);
      setSelectedProductForDetails(product);
      // If there's only one variant, select it automatically
      if (product.variants && product.variants.length === 1) {
        setSelectedVariant(product.variants[0]);
      } else {
        setSelectedVariant(null);
      }
    } catch (error: any) {
      toast({
        title: "Error loading product details",
        description: error.message || "Failed to load product details. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingProductDetails(false);
    }
  }, [toast]);

  // Select a product for details
  const handleSelectProduct = (product: ProductSearchResultDto) => {
    setProductSearchQuery("");
    setProductSearchResults([]);
    loadProductDetails(product.id);
  };

  // Add item to procurement
  const handleAddItem = () => {
    if (!selectedVariant || !selectedProductForDetails) {
      toast({
        title: "Cannot add item",
        description: "Please select a product variant first.",
        variant: "destructive",
      });
      return;
    }

    const newItem: ProcurementItemDisplay = {
      productId: selectedProductForDetails.id,
      productName: selectedProductForDetails.name,
      variantId: selectedVariant.id,
      variantName: `${selectedVariant.color || ''} ${selectedVariant.size || ''}`.trim() || 'Default',
      quantity: selectedQuantity,
      unitPrice: selectedVariant.mrp || 0,
    };

    setProcurementItems([...procurementItems, newItem]);
    setSelectedProductForDetails(null);
    setSelectedVariant(null);
    setSelectedQuantity(1);
  };

  // Remove item from procurement
  const handleRemoveItem = (index: number) => {
    const newItems = [...procurementItems];
    newItems.splice(index, 1);
    setProcurementItems(newItems);
  };

  // Calculate total amount
  const calculateTotalAmount = () => {
    return procurementItems.reduce((total, item) => total + (item.unitPrice * item.quantity), 0);
  };

  // Update invoice amount when items change
  React.useEffect(() => {
    const totalAmount = calculateTotalAmount();
    if (totalAmount > 0) {
      procurementForm.setValue("invoiceAmount", totalAmount);
    }
  }, [procurementItems, procurementForm]);

  // Handle form submission
  const handleSubmit = async (values: ProcurementFormValues) => {
    if (!procurement) {
      toast({
        title: "Error",
        description: "Procurement data not loaded.",
        variant: "destructive",
      });
      return;
    }

    if (procurementItems.length === 0) {
      toast({
        title: "Cannot update procurement",
        description: "Please add at least one item to the procurement.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const items: ProcurementItemDto[] = procurementItems.map(item => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        variantId: item.variantId,
        variantName: item.variantName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      }));

      const procurementData: UpdateProcurementRequest = {
        invoiceNumber: values.invoiceNumber,
        invoiceAmount: values.invoiceAmount,
        creditPeriod: values.creditPeriod,
        invoiceDate: format(values.invoiceDate, 'yyyy-MM-dd'),
        receiptDate: format(values.receiptDate, 'yyyy-MM-dd'),
        notes: values.notes,
        items: items,
      };

      const result = await updateProcurement(params.id, procurementData);

      toast({
        title: "Procurement updated",
        description: "The procurement has been successfully updated.",
      });

      router.push(`/procurements/${params.id}`);
    } catch (error: any) {
      toast({
        title: "Error updating procurement",
        description: error.message || "Failed to update procurement. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!procurement) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => router.push("/procurements")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Procurement Not Found</h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">The requested procurement could not be found.</p>
            <Button className="mt-4" onClick={() => router.push("/procurements")}>
              Return to Procurements
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => router.push(`/procurements/${params.id}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Edit Procurement</h1>
          <p className="text-muted-foreground">
            Invoice #{procurement.invoiceNumber}
          </p>
        </div>
      </div>

      <form onSubmit={procurementForm.handleSubmit(handleSubmit)}>
        <div className="space-y-6">
          {/* Vendor Information (Read-only) */}
          <Card>
            <CardHeader>
              <CardTitle>Vendor</CardTitle>
              <CardDescription>Vendor information for this procurement.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingVendor ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="font-medium">{vendorDetails?.companyName || procurement.businessProfile?.companyName || "Unknown Vendor"}</p>
                  <p className="text-sm text-muted-foreground">GSTIN: {vendorDetails?.gstin || procurement.businessProfile?.gstin || "N/A"}</p>
                  {vendorDetails?.addresses && vendorDetails.addresses.length > 0 ? (
                    <div className="text-sm">
                      <p>{vendorDetails.addresses[0].line1}</p>
                      {vendorDetails.addresses[0].line2 && <p>{vendorDetails.addresses[0].line2}</p>}
                      <p>{vendorDetails.addresses[0].city}, {vendorDetails.addresses[0].state} {vendorDetails.addresses[0].postalCode}</p>
                    </div>
                  ) : procurement.businessProfile?.addresses && procurement.businessProfile.addresses.length > 0 && (
                    <div className="text-sm">
                      <p>{procurement.businessProfile.addresses[0].line1}</p>
                      {procurement.businessProfile.addresses[0].line2 && <p>{procurement.businessProfile.addresses[0].line2}</p>}
                      <p>{procurement.businessProfile.addresses[0].city}, {procurement.businessProfile.addresses[0].state} {procurement.businessProfile.addresses[0].postalCode}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader>
              <CardTitle>Procurement Items</CardTitle>
              <CardDescription>Add or remove items from this procurement.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="product-search">Add Products</Label>
                <div className="relative">
                  <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="product-search"
                    type="search"
                    placeholder="Search by product name, SKU, or barcode..."
                    className="pl-8"
                    value={productSearchQuery}
                    onChange={handleProductSearchChange}
                  />
                </div>
              </div>

              {isSearchingProducts ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : productSearchResults.length > 0 ? (
                <ScrollArea className="h-[200px] rounded-md border">
                  <div className="p-4 space-y-2">
                    {productSearchResults.map((product) => (
                      <div
                        key={product.id}
                        className="flex items-center justify-between p-2 rounded-md hover:bg-accent cursor-pointer"
                        onClick={() => handleSelectProduct(product)}
                      >
                        <div>
                          <div className="font-medium">{product.name}</div>
                          <div className="text-sm text-muted-foreground">SKU: {product.sku || 'N/A'}</div>
                        </div>
                        <Button variant="ghost" size="sm">
                          Select
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : productSearchQuery.trim() !== "" ? (
                <div className="text-center py-4 text-muted-foreground">
                  No products found matching your search.
                </div>
              ) : null}

              {/* Selected product details */}
              {isLoadingProductDetails ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : selectedProductForDetails ? (
                <Card className="mt-4">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle>{selectedProductForDetails.name}</CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedProductForDetails(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <CardDescription>
                      SKU: {selectedProductForDetails.sku || 'N/A'} | HSN: {selectedProductForDetails.hsnCode || 'N/A'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Variant selection */}
                    {selectedProductForDetails.variants && selectedProductForDetails.variants.length > 0 ? (
                      <div className="space-y-2">
                        <Label>Select Variant</Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {selectedProductForDetails.variants.map((variant) => (
                            <div
                              key={variant.id}
                              className={`p-2 border rounded-md cursor-pointer ${
                                selectedVariant?.id === variant.id ? 'border-primary bg-primary/10' : 'border-input'
                              }`}
                              onClick={() => setSelectedVariant(variant)}
                            >
                              <div className="font-medium">
                                {variant.color || ''} {variant.size || ''}
                                {!variant.color && !variant.size && 'Default'}
                              </div>
                              <div className="text-sm">MRP: ₹{variant.mrp?.toFixed(2) || '0.00'}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-2 text-muted-foreground">
                        No variants available for this product.
                      </div>
                    )}

                    {/* Quantity selection */}
                    {selectedVariant && (
                      <div className="space-y-2">
                        <Label htmlFor="quantity">Quantity</Label>
                        <Input
                          id="quantity"
                          type="number"
                          min="1"
                          value={selectedQuantity}
                          onChange={(e) => setSelectedQuantity(parseInt(e.target.value) || 1)}
                        />
                      </div>
                    )}

                    {/* Add button */}
                    {selectedVariant && (
                      <Button className="w-full" onClick={handleAddItem}>
                        Add to Procurement
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : null}

              {/* Procurement items table */}
              {procurementItems.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-medium mb-2">Current Items</h3>
                  {/* Mobile view with ItemList */}
                  <div className="block md:hidden">
                    <ItemList
                      items={procurementItems}
                      renderItem={(item, index) => {
                        const removeButton = (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveItem(index)}
                            className="hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        );

                        return (
                          <ItemListCard
                            key={item.id || index}
                            title={item.productName}
                            subtitle={item.variantName}
                            amount={`₹${(item.quantity * item.unitPrice).toFixed(2)}`}
                            date={
                              <div className="flex items-center justify-between w-full">
                                <span className="text-sm">Qty: {item.quantity}</span>
                                <span className="text-sm">₹{item.unitPrice.toFixed(2)} each</span>
                              </div>
                            }
                            actions={removeButton}
                          />
                        );
                      }}
                      emptyState={
                        <div className="text-center py-4 text-muted-foreground">
                          No items added yet. Search for products above to add them.
                        </div>
                      }
                    />
                    <div className="mt-4 border-t pt-4 flex justify-between items-center">
                      <span className="font-medium">Total Amount:</span>
                      <span className="font-bold">₹{calculateTotalAmount().toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Desktop view with Table */}
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Variant</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Unit Price</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {procurementItems.map((item, index) => (
                          <TableRow key={item.id || index}>
                            <TableCell>{item.productName}</TableCell>
                            <TableCell>{item.variantName}</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>₹{item.unitPrice.toFixed(2)}</TableCell>
                            <TableCell>₹{(item.quantity * item.unitPrice).toFixed(2)}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveItem(index)}
                                className="hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow>
                          <TableCell colSpan={4} className="text-right font-medium">Total Amount:</TableCell>
                          <TableCell colSpan={2} className="font-bold">₹{calculateTotalAmount().toFixed(2)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Invoice Details */}
          <Card>
            <CardHeader>
              <CardTitle>Invoice Details</CardTitle>
              <CardDescription>Update the invoice information for this procurement.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="invoiceNumber">Invoice Number</Label>
                  <Input
                    id="invoiceNumber"
                    {...procurementForm.register("invoiceNumber")}
                    placeholder="e.g., INV-2024-001"
                  />
                  {procurementForm.formState.errors.invoiceNumber && (
                    <p className="text-sm text-destructive">{procurementForm.formState.errors.invoiceNumber.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invoiceAmount">Invoice Amount</Label>
                  <Input
                    id="invoiceAmount"
                    type="number"
                    step="0.01"
                    {...procurementForm.register("invoiceAmount")}
                  />
                  {procurementForm.formState.errors.invoiceAmount && (
                    <p className="text-sm text-destructive">{procurementForm.formState.errors.invoiceAmount.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="creditPeriod">Credit Period (Days)</Label>
                  <Input
                    id="creditPeriod"
                    type="number"
                    {...procurementForm.register("creditPeriod")}
                  />
                  {procurementForm.formState.errors.creditPeriod && (
                    <p className="text-sm text-destructive">{procurementForm.formState.errors.creditPeriod.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Invoice Date</Label>
                  <Controller
                    control={procurementForm.control}
                    name="invoiceDate"
                    render={({ field }) => (
                      <Popover open={invoiceDateOpen} onOpenChange={setInvoiceDateOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={(date) => {
                              field.onChange(date);
                              setInvoiceDateOpen(false);
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                  />
                  {procurementForm.formState.errors.invoiceDate && (
                    <p className="text-sm text-destructive">{procurementForm.formState.errors.invoiceDate.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Receipt Date</Label>
                  <Controller
                    control={procurementForm.control}
                    name="receiptDate"
                    render={({ field }) => (
                      <Popover open={receiptDateOpen} onOpenChange={setReceiptDateOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={(date) => {
                              field.onChange(date);
                              setReceiptDateOpen(false);
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                  />
                  {procurementForm.formState.errors.receiptDate && (
                    <p className="text-sm text-destructive">{procurementForm.formState.errors.receiptDate.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  {...procurementForm.register("notes")}
                  placeholder="Add any additional notes about this procurement..."
                  rows={4}
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button type="button" variant="outline" onClick={() => router.push(`/procurements/${params.id}`)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Procurement"
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </form>
    </div>
  );
}
