"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogTrigger
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import {
  ChevronLeft, ChevronRight, PlusCircle, Trash2, Search as SearchIcon, Building, ShoppingCart, Loader2, X, Edit2, CalendarIcon
} from "lucide-react";
import {
  searchBusinessProfilesByName, type BusinessProfileDto,
  searchProductsFuzzy, type ProductSearchResultDto, type ProductDto, fetchProductById, type ProductVariantDto,
  createProcurement, type CreateProcurementRequest, type ProcurementItemDto,
  fetchBusinessProfileById
} from "@/lib/apiClient";

// Zod schema for procurement form
const procurementFormSchema = z.object({
  businessProfileId: z.string().min(1, "Vendor is required"),
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
  productId: string;
  productName: string;
  variantId: string;
  variantName: string;
  quantity: number;
  unitPrice: number;
}

export default function CreateProcurementPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = React.useState(1);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Business profile (vendor) search and selection
  const [businessNameSearch, setBusinessNameSearch] = React.useState("");
  const [searchedBusinessProfiles, setSearchedBusinessProfiles] = React.useState<BusinessProfileDto[]>([]);
  const [isSearchingBp, setIsSearchingBp] = React.useState(false);
  const [selectedBusinessProfile, setSelectedBusinessProfile] = React.useState<BusinessProfileDto | null>(null);

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
      creditPeriod: 30,
      notes: "",
    }
  });

  // Search business profiles by name
  const searchBusinessProfiles = React.useCallback(async (name: string) => {
    if (!name.trim()) {
      setSearchedBusinessProfiles([]);
      return;
    }

    setIsSearchingBp(true);
    try {
      const results = await searchBusinessProfilesByName(name);
      console.log(results);
      setSearchedBusinessProfiles(results.content);
    } catch (error: any) {
      toast({
        title: "Error searching vendors",
        description: error.message || "Failed to search vendors. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSearchingBp(false);
    }
  }, [toast]);

  // Handle business profile search input change
  const handleBusinessNameSearchChange = (value: string) => {
    setBusinessNameSearch(value);
    searchBusinessProfiles(value);
  };

  // Select a business profile
  const handleSelectBusinessProfile = async (profile: BusinessProfileDto) => {
    setSelectedBusinessProfile(profile);
    procurementForm.setValue("businessProfileId", profile.id);
    setBusinessNameSearch("");
  };

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

    setIsSubmitting(true);
    try {
      // Items are optional, so only include them if there are any
      const procurementData: CreateProcurementRequest = {
        businessProfileId: values.businessProfileId,
        invoiceNumber: values.invoiceNumber,
        invoiceAmount: values.invoiceAmount,
        creditPeriod: values.creditPeriod,
        invoiceDate: format(values.invoiceDate, 'yyyy-MM-dd'),
        receiptDate: format(values.receiptDate, 'yyyy-MM-dd'),
        notes: values.notes,
      };

      // Only add items if there are any
      if (procurementItems.length > 0) {
        const items: ProcurementItemDto[] = procurementItems.map(item => ({
          productId: item.productId,
          productName: item.productName,
          variantId: item.variantId,
          variantName: item.variantName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        }));
        procurementData.items = items;
      }

      const result = await createProcurement(procurementData);

      toast({
        title: "Procurement created",
        description: "The procurement has been successfully created.",
      });

      router.push(`/procurements/${result.id}`);
    } catch (error: any) {
      toast({
        title: "Error creating procurement",
        description: error.message || "Failed to create procurement. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Go to next step
  const goToNextStep = () => {
    if (currentStep === 1) {
      // Validate vendor selection
      if (!selectedBusinessProfile) {
        toast({
          title: "Vendor required",
          description: "Please select a vendor before proceeding.",
          variant: "destructive",
        });
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      setCurrentStep(3);
    }
  };

  // Go to previous step
  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Create Procurement</h1>
          <p className="text-muted-foreground">Add a new vendor procurement order.</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-2">
          <div className={`rounded-full h-8 w-8 flex items-center justify-center ${currentStep >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>1</div>
          <div className="text-sm font-medium">Select Vendor</div>
        </div>
        <div className="h-0.5 w-10 bg-muted"></div>
        <div className="flex items-center space-x-2">
          <div className={`rounded-full h-8 w-8 flex items-center justify-center ${currentStep >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>2</div>
          <div className="text-sm font-medium">Add Items</div>
        </div>
        <div className="h-0.5 w-10 bg-muted"></div>
        <div className="flex items-center space-x-2">
          <div className={`rounded-full h-8 w-8 flex items-center justify-center ${currentStep >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>3</div>
          <div className="text-sm font-medium">Invoice Details</div>
        </div>
      </div>

      {/* Step 1: Select Vendor */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Vendor</CardTitle>
            <CardDescription>Choose the vendor for this procurement.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="vendor-search">Search Vendors</Label>
              <div className="relative">
                <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="vendor-search"
                  type="search"
                  placeholder="Search by vendor name..."
                  className="pl-8"
                  value={businessNameSearch}
                  onChange={(e) => handleBusinessNameSearchChange(e.target.value)}
                />
              </div>
            </div>

            {isSearchingBp ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : searchedBusinessProfiles.length > 0 ? (
              <ScrollArea className="h-[300px] rounded-md border">
                <div className="p-4 space-y-2">
                  {searchedBusinessProfiles.map((profile) => (
                    <div
                      key={profile.id}
                      className="flex items-center justify-between p-2 rounded-md hover:bg-accent cursor-pointer"
                      onClick={() => handleSelectBusinessProfile(profile)}
                    >
                      <div>
                        <div className="font-medium">{profile.companyName}</div>
                        <div className="text-sm text-muted-foreground">{profile.gstin}</div>
                      </div>
                      <Button variant="ghost" size="sm">
                        Select
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : businessNameSearch.trim() !== "" ? (
              <div className="text-center py-4 text-muted-foreground">
                No vendors found matching your search.
              </div>
            ) : null}

            {selectedBusinessProfile && (
              <div className="mt-6">
                <h3 className="text-lg font-medium mb-2">Selected Vendor</h3>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold">{selectedBusinessProfile.companyName}</h4>
                        <p className="text-sm text-muted-foreground">GSTIN: {selectedBusinessProfile.gstin}</p>
                        {selectedBusinessProfile.addresses && selectedBusinessProfile.addresses.length > 0 && (
                          <div className="mt-2 text-sm">
                            <p>{selectedBusinessProfile.addresses[0].line1}</p>
                            {selectedBusinessProfile.addresses[0].line2 && <p>{selectedBusinessProfile.addresses[0].line2}</p>}
                            <p>{selectedBusinessProfile.addresses[0].city}, {selectedBusinessProfile.addresses[0].state} {selectedBusinessProfile.addresses[0].postalCode}</p>
                          </div>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedBusinessProfile(null);
                          procurementForm.setValue("businessProfileId", "");
                        }}
                      >
                        Change
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => router.push('/procurements')}>
              Cancel
            </Button>
            <Button onClick={goToNextStep} disabled={!selectedBusinessProfile}>
              Next Step
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step 2: Add Items */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Add Items (Optional)</CardTitle>
            <CardDescription>Add products to this procurement if needed. Items are optional as we primarily want to track invoices and payments.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="product-search">Search Products</Label>
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
                <h3 className="text-lg font-medium mb-2">Procurement Items</h3>
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
                      <TableRow key={index}>
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
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={goToPreviousStep}>
              Previous Step
            </Button>
            <Button onClick={goToNextStep}>
              Next Step
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step 3: Invoice Details */}
      {currentStep === 3 && (
        <form onSubmit={procurementForm.handleSubmit(handleSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle>Invoice Details</CardTitle>
              <CardDescription>Enter the invoice information for this procurement.</CardDescription>
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
                      <Popover>
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
                            onSelect={field.onChange}
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
                      <Popover>
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
                            onSelect={field.onChange}
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

              {/* Summary */}
              <Card className="bg-muted/50">
                <CardHeader className="pb-2">
                  <CardTitle>Procurement Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt className="font-medium">Vendor:</dt>
                      <dd>{selectedBusinessProfile?.companyName}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="font-medium">Items:</dt>
                      <dd>{procurementItems.length}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="font-medium">Total Amount:</dt>
                      <dd className="font-bold">₹{calculateTotalAmount().toFixed(2)}</dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button type="button" variant="outline" onClick={goToPreviousStep}>
                Previous Step
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Procurement"
                )}
              </Button>
            </CardFooter>
          </Card>
        </form>
      )}
    </div>
  );
}
