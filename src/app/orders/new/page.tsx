
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogTrigger
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ChevronLeft, ChevronRight, PlusCircle, Trash2, Search as SearchIcon, UserPlus, Building, ShoppingCart, Loader2, X, Edit2
} from "lucide-react";
import {
  fetchUserById, createUser, type CreateUserRequest, type UserDto,
  searchUserByPhone,
  fetchBusinessProfileById, createBusinessProfile, type CreateBusinessProfileRequest, type BusinessProfileDto,
  searchBusinessProfileByGstin, createBusinessProfileWithUser, type CreateBusinessProfileWithUserRequest, type CreateBusinessProfileWithUserResponse,
  searchProductsFuzzy, type ProductSearchResultDto, type ProductDto, fetchProductById, type ProductVariantDto,
  quickCreateProduct, type QuickCreateProductRequest, type QuickCreateProductResponse,
  type AddressCreateDto, type OrderItemRequest, type CreateOrderRequest, type OrderDto, Page
} from "@/lib/apiClient";
import { Skeleton } from "@/components/ui/skeleton";

// Zod Schemas for Forms
const userCreateDialogSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Phone is required").regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone format"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
});
type UserCreateDialogValues = z.infer<typeof userCreateDialogSchema>;

const bpWithUserCreateDialogSchema = z.object({
  bpName: z.string().min(1, "Business name is required"),
  bpGstin: z.string().min(1, "GSTIN is required").regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, "Invalid GSTIN format"),
  userName: z.string().min(1, "User name is required"),
  userPhone: z.string().min(1, "User phone is required").regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone format"),
  userEmail: z.string().email("Invalid email").optional().or(z.literal("")),
});
type BpWithUserCreateDialogValues = z.infer<typeof bpWithUserCreateDialogSchema>;

const quickProductCreateDialogSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  brandName: z.string().min(1, "Brand name is required"),
  categoryName: z.string().min(1, "Category name is required"),
  colors: z.string().min(1, "At least one color is required (comma-separated)"),
  sizes: z.string().min(1, "At least one size is required (comma-separated)"),
  unitPrice: z.coerce.number().min(0.01, "Price must be greater than 0"),
});
type QuickProductCreateDialogValues = z.infer<typeof quickProductCreateDialogSchema>;


export interface OrderItemDisplay {
  productId: string;
  variantId: string;
  productName: string;
  variantName: string; // e.g., "Red / M"
  hsnCode?: string | null;
  quantity: number;
  mrp: number; 
  discountRate: number; // percentage
  discountAmount: number; // calculated
  sellingPrice: number; // calculated: mrp - discountAmount (this becomes unitPrice for API)
  gstTaxRate: number; // percentage
  gstAmount: number; // calculated
  finalItemPrice: number; // calculated: (sellingPrice * quantity) + gstAmount for the line
  unitPrice: number; // API's unitPrice is our sellingPrice (price per single item before tax)
}


export default function CreateOrderPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = React.useState(1); // Now 4 steps
  const [customerType, setCustomerType] = React.useState<"B2C" | "B2B">("B2C");
  
  // Step 1 State
  const [phoneSearch, setPhoneSearch] = React.useState("");
  const [gstinSearch, setGstinSearch] = React.useState("");
  const [searchedUsers, setSearchedUsers] = React.useState<UserDto[]>([]); 
  const [selectedUserDisplay, setSelectedUserDisplay] = React.useState<UserDto | null>(null); 
  const [foundBusinessProfile, setFoundBusinessProfile] = React.useState<BusinessProfileDto | null>(null);
  const [selectedUserId, setSelectedUserId] = React.useState<string | null>(null);
  const [selectedBusinessProfileId, setSelectedBusinessProfileId] = React.useState<string | null>(null);

  const [isSearchingUser, setIsSearchingUser] = React.useState(false);
  const [isSearchingBp, setIsSearchingBp] = React.useState(false);
  const [isUserCreateSubmitting, setIsUserCreateSubmitting] = React.useState(false);
  const [isBpWithUserCreateSubmitting, setIsBpWithUserCreateSubmitting] = React.useState(false);
  const [showUserCreateDialog, setShowUserCreateDialog] = React.useState(false);
  const [showBpWithUserCreateDialog, setShowBpWithUserCreateDialog] = React.useState(false);

  // Step 2 State
  const [productSearchQuery, setProductSearchQuery] = React.useState("");
  const [productSearchResults, setProductSearchResults] = React.useState<ProductSearchResultDto[]>([]);
  const [isSearchingProducts, setIsSearchingProducts] = React.useState(false);
  const [selectedProductForDetails, setSelectedProductForDetails] = React.useState<ProductDto | null>(null);
  const [isLoadingProductDetails, setIsLoadingProductDetails] = React.useState(false);
  const [selectedVariant, setSelectedVariant] = React.useState<ProductVariantDto | null>(null);
  const [selectedQuantity, setSelectedQuantity] = React.useState(1);
  const [orderItems, setOrderItems] = React.useState<OrderItemDisplay[]>([]);
  const [showQuickProductDialog, setShowQuickProductDialog] = React.useState(false);
  const [isQuickProductSubmitting, setIsQuickProductSubmitting] = React.useState(false);

  const userCreateForm = useForm<UserCreateDialogValues>({ resolver: zodResolver(userCreateDialogSchema) });
  const bpWithUserCreateForm = useForm<BpWithUserCreateDialogValues>({ resolver: zodResolver(bpWithUserCreateDialogSchema) });
  const quickProductCreateForm = useForm<QuickProductCreateDialogValues>({ resolver: zodResolver(quickProductCreateDialogSchema) });

  const handleUserSearch = async () => {
    if (!phoneSearch) return;
    setIsSearchingUser(true); 
    setSearchedUsers([]); 
    setSelectedUserId(null); 
    setSelectedUserDisplay(null);
    try {
      const users = await searchUserByPhone(phoneSearch);
      setSearchedUsers(users);
      if (users.length === 0) {
        setShowUserCreateDialog(true);
        userCreateForm.setValue("phone", phoneSearch); 
      }
    } catch (error: any) {
      toast({ title: "Error Searching User", description: error.message || "Failed to search user.", variant: "destructive" });
    } finally {
      setIsSearchingUser(false);
    }
  };

  const handleSelectUserFromList = (user: UserDto) => {
    setSelectedUserId(user.id);
    setSelectedUserDisplay(user);
    setSearchedUsers([]); 
  };

  const handleBusinessProfileSearch = async () => {
    if (!gstinSearch) return;
    setIsSearchingBp(true); 
    setFoundBusinessProfile(null); 
    setSelectedBusinessProfileId(null); 
    setSelectedUserId(null); 
    setSelectedUserDisplay(null);
    try {
      const bp = await searchBusinessProfileByGstin(gstinSearch);
      setFoundBusinessProfile(bp);
      if (bp && bp.id) {
        setSelectedBusinessProfileId(bp.id);
        if (bp.userIds && bp.userIds.length > 0 && bp.userIds[0]) {
          const user = await fetchUserById(bp.userIds[0]); 
          setSelectedUserDisplay(user); 
          if (user && user.id) setSelectedUserId(user.id);
        } else {
           toast({ title: "Info", description: "Business profile found, but no primary user linked. Order can proceed, or link user via BP Management.", variant: "default" });
        }
      } else {
        setShowBpWithUserCreateDialog(true);
        bpWithUserCreateForm.setValue("bpGstin", gstinSearch); 
      }
    } catch (error: any) {
      toast({ title: "Error Searching BP", description: error.message || "Failed to search business profile.", variant: "destructive" });
    } finally {
      setIsSearchingBp(false);
    }
  };

  const handleCreateUserDialogSubmit = async (data: UserCreateDialogValues) => {
    setIsUserCreateSubmitting(true);
    try {
      const newUser = await createUser({ name: data.name, phone: data.phone, email: data.email || undefined, status: 'ACTIVE' });
      setSelectedUserDisplay(newUser);
      if (newUser && newUser.id) setSelectedUserId(newUser.id);
      setShowUserCreateDialog(false);
      userCreateForm.reset();
      setPhoneSearch(""); 
      toast({ title: "Success", description: "User created successfully." });
    } catch (error: any) {
      toast({ title: "Error Creating User", description: error.message || "Failed to create user.", variant: "destructive" });
    } finally {
      setIsUserCreateSubmitting(false);
    }
  };

  const handleBpWithUserCreateDialogSubmit = async (data: BpWithUserCreateDialogValues) => {
    setIsBpWithUserCreateSubmitting(true);
    const payload: CreateBusinessProfileWithUserRequest = {
      businessProfile: { name: data.bpName, gstin: data.bpGstin, status: 'ACTIVE' },
      user: { name: data.userName, phone: data.userPhone, email: data.userEmail || undefined, status: 'ACTIVE' }
    };
    try {
      const response = await createBusinessProfileWithUser(payload);
      setFoundBusinessProfile(response); 
      if (response && response.id) setSelectedBusinessProfileId(response.id);
      
      const createdUserInResponse = response.user; 
      if (createdUserInResponse && createdUserInResponse.id) {
        setSelectedUserDisplay(createdUserInResponse);
        setSelectedUserId(createdUserInResponse.id);
      } else if (response.userIds && response.userIds.length > 0 && response.userIds[0]) { 
        const user = await fetchUserById(response.userIds[0]);
        setSelectedUserDisplay(user);
        if (user && user.id) setSelectedUserId(user.id);
      }
      setShowBpWithUserCreateDialog(false);
      bpWithUserCreateForm.reset();
      setGstinSearch(""); 
      toast({ title: "Success", description: "Business profile and user created successfully." });
    } catch (error: any) {
      toast({ title: "Error Creating BP & User", description: error.message || "Failed to create business profile with user.", variant: "destructive" });
    } finally {
      setIsBpWithUserCreateSubmitting(false);
    }
  };

  const handleProductSearch = React.useCallback(async () => {
    if (!productSearchQuery.trim()) {
      setProductSearchResults([]);
      return;
    }
    setIsSearchingProducts(true);
    try {
      const resultsPage: Page<ProductSearchResultDto> = await searchProductsFuzzy(productSearchQuery, 0, 20, 'name,asc');
      setProductSearchResults(resultsPage.content);
    } catch (error: any) {
      toast({ title: "Error Searching Products", description: error.message || "Failed to search products.", variant: "destructive" });
      setProductSearchResults([]);
    } finally {
      setIsSearchingProducts(false);
    }
  }, [productSearchQuery, toast]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
        if (productSearchQuery) handleProductSearch();
        else setProductSearchResults([]);
    }, 500); 
    return () => clearTimeout(timer);
  }, [productSearchQuery, handleProductSearch]);


  const handleSelectSearchedProduct = async (productId: string) => {
    setIsLoadingProductDetails(true);
    setSelectedProductForDetails(null);
    setSelectedVariant(null);
    setSelectedQuantity(1);
    try {
      const product = await fetchProductById(productId);
      setSelectedProductForDetails(product);
      if (!product.variants || product.variants.length === 0) {
        toast({title: "Info", description: "This product has no variants defined.", variant: "default"});
      }
    } catch (error: any) {
      toast({ title: "Error Fetching Product", description: error.message || "Failed to fetch product details.", variant: "destructive" });
    } finally {
      setIsLoadingProductDetails(false);
    }
  };
  
  const handleQuickProductCreateDialogSubmit = async (data: QuickProductCreateDialogValues) => {
    setIsQuickProductSubmitting(true);
    const payload: QuickCreateProductRequest = {
      name: data.name,
      brandName: data.brandName,
      categoryName: data.categoryName,
      colorVariants: data.colors.split(',').map(c => c.trim()).filter(Boolean),
      sizeVariants: data.sizes.split(',').map(s => s.trim()).filter(Boolean),
      unitPrice: data.unitPrice, 
    };
    try {
      const responseProduct = await quickCreateProduct(payload); 
      setShowQuickProductDialog(false);
      quickProductCreateForm.reset();
      toast({ title: "Success", description: `Product "${responseProduct.name}" created quickly.` });
      
      if (responseProduct.id && responseProduct.variants && responseProduct.variants.length > 0 && responseProduct.variants[0]?.id) {
        const newVariant = responseProduct.variants[0];
        const mrp = newVariant.mrp ?? newVariant.compareAtPrice ?? newVariant.price ?? responseProduct.unitPrice ?? data.unitPrice; 
        const sellingPrice = newVariant.sellingPrice ?? newVariant.price ?? responseProduct.unitPrice ?? data.unitPrice;
        const discountAmount = mrp - sellingPrice;
        const discountRate = mrp > 0 ? (discountAmount / mrp) * 100 : 0;
        const gstTaxRate = responseProduct.gstTaxRate ?? 0; 
        const gstAmount = sellingPrice * (gstTaxRate / 100);

        const newItem: OrderItemDisplay = {
          productId: responseProduct.id,
          variantId: newVariant.id,
          productName: responseProduct.name ?? "Unknown Product",
          variantName: `${newVariant.color || ''}${newVariant.color && newVariant.size ? ' / ' : ''}${newVariant.size || ''}`.trim() || 'Default',
          hsnCode: responseProduct.hsnCode,
          quantity: 1, // Default quantity
          mrp: mrp,
          discountRate: discountRate,
          discountAmount: discountAmount, // Per unit
          sellingPrice: sellingPrice,    // Per unit, after discount
          unitPrice: sellingPrice,       // API's unitPrice is our sellingPrice before tax
          gstTaxRate: gstTaxRate,
          gstAmount: gstAmount,          // Per unit
          finalItemPrice: (sellingPrice + gstAmount) * 1, // For one unit initially
        };
        setOrderItems(prevItems => [...prevItems, newItem]);
        setSelectedProductForDetails(null); // Clear selection area after adding
        setSelectedVariant(null);
        setSelectedQuantity(1);
        setProductSearchQuery(""); 
        setProductSearchResults([]);
      } else {
         toast({ title: "Warning", description: "Quick created product has no variants or missing IDs to add to cart.", variant: "default"});
      }
    } catch (error: any) {
      toast({ title: "Error Quick Creating Product", description: error.message || "Failed to quick create product.", variant: "destructive" });
    } finally {
      setIsQuickProductSubmitting(false);
    }
  };

  const handleAddOrderItem = () => {
    if (!selectedProductForDetails || !selectedProductForDetails.id || !selectedVariant || !selectedVariant.id || selectedQuantity <= 0) {
      toast({ title: "Warning", description: "Please select a product, variant, and valid quantity.", variant: "default" });
      return;
    }
    
    const existingItemIndex = orderItems.findIndex(item => item.variantId === selectedVariant!.id);
    
    const mrp = selectedVariant.mrp ?? selectedVariant.compareAtPrice ?? selectedVariant.price ?? selectedProductForDetails.unitPrice ?? 0;
    const sellingPrice = selectedVariant.sellingPrice ?? selectedVariant.price ?? selectedProductForDetails.unitPrice ?? 0;
    const discountAmount = mrp - sellingPrice; // per unit
    const discountRate = mrp > 0 ? (discountAmount / mrp) * 100 : 0;
    const gstTaxRate = selectedProductForDetails.gstTaxRate ?? 0; 
    const gstAmount = sellingPrice * (gstTaxRate / 100); // per unit

    if (existingItemIndex > -1) {
      const updatedItems = [...orderItems];
      const currentItem = updatedItems[existingItemIndex];
      currentItem.quantity += selectedQuantity;
      // Recalculate amounts based on new quantity for the line item
      currentItem.discountAmount = (currentItem.mrp - currentItem.sellingPrice) * currentItem.quantity; // total discount for line
      currentItem.gstAmount = currentItem.sellingPrice * (currentItem.gstTaxRate / 100) * currentItem.quantity; // total GST for line
      currentItem.finalItemPrice = (currentItem.sellingPrice * (1 + currentItem.gstTaxRate / 100)) * currentItem.quantity;
      setOrderItems(updatedItems);
    } else {
      const newItem: OrderItemDisplay = {
        productId: selectedProductForDetails.id,
        variantId: selectedVariant.id,
        productName: selectedProductForDetails.name ?? "Unknown Product",
        variantName: `${selectedVariant.color || ''}${selectedVariant.color && selectedVariant.size ? ' / ' : ''}${selectedVariant.size || ''}`.trim() || 'Default',
        hsnCode: selectedProductForDetails.hsnCode,
        quantity: selectedQuantity,
        mrp: mrp,
        discountRate: discountRate,
        discountAmount: discountAmount * selectedQuantity, // For total quantity
        sellingPrice: sellingPrice, // Per unit selling price
        unitPrice: sellingPrice,    // API's unitPrice
        gstTaxRate: gstTaxRate,
        gstAmount: gstAmount * selectedQuantity,         // For total quantity
        finalItemPrice: (sellingPrice + gstAmount) * selectedQuantity,
      };
      setOrderItems(prevItems => [...prevItems, newItem]);
    }
    
    // Reset selection area after adding
    setSelectedProductForDetails(null);
    setSelectedVariant(null);
    setSelectedQuantity(1);
    setProductSearchQuery("");
    setProductSearchResults([]);
    toast({ title: "Item Added", description: `${selectedProductForDetails.name} (${selectedVariant.color || 'N/A'}/${selectedVariant.size || 'N/A'}) added to order.`});
  };

  const handleRemoveOrderItem = (variantIdToRemove: string) => {
    setOrderItems(prevItems => prevItems.filter(item => item.variantId !== variantIdToRemove));
  };
  
  const handleOrderItemQuantityChangeStep2 = (variantId: string, newQuantity: number) => {
     setOrderItems(prevItems => 
      prevItems.map(item => {
        if (item.variantId === variantId) {
          const qty = Math.max(1, newQuantity);
          // Recalculate based on existing per-unit prices from when item was added
          const lineDiscountAmount = (item.mrp - item.sellingPrice) * qty;
          const lineGstAmount = item.sellingPrice * (item.gstTaxRate / 100) * qty;
          const lineFinalPrice = (item.sellingPrice * (1 + item.gstTaxRate / 100)) * qty;

          return {
            ...item,
            quantity: qty,
            discountAmount: lineDiscountAmount,
            gstAmount: lineGstAmount,
            finalItemPrice: lineFinalPrice,
          };
        }
        return item;
      })
    );
  }
  
  const handleOrderItemDetailChangeStep3 = (variantId: string, field: keyof OrderItemDisplay, value: string) => {
    setOrderItems(prevItems => 
      prevItems.map(item => {
        if (item.variantId === variantId) {
          let updatedItem = { ...item };

          if (field === 'quantity') updatedItem.quantity = Math.max(1, parseInt(value, 10) || 1);
          else if (field === 'mrp') updatedItem.mrp = parseFloat(value) || 0;
          else if (field === 'discountRate') updatedItem.discountRate = parseFloat(value) || 0;
          else if (field === 'gstTaxRate') updatedItem.gstTaxRate = parseFloat(value) || 0;

          // Recalculate pricing based on potentially changed MRP, DiscountRate, GSTRate
          updatedItem.discountAmount = updatedItem.mrp * (updatedItem.discountRate / 100); // per unit
          updatedItem.sellingPrice = updatedItem.mrp - updatedItem.discountAmount; // per unit
          updatedItem.unitPrice = updatedItem.sellingPrice; // API unit price is selling price
          
          // Line item totals
          const totalDiscountForLine = updatedItem.discountAmount * updatedItem.quantity;
          const totalGstForLine = updatedItem.sellingPrice * (updatedItem.gstTaxRate / 100) * updatedItem.quantity;
          const finalPriceForLine = (updatedItem.sellingPrice * (1 + updatedItem.gstTaxRate/100)) * updatedItem.quantity;

          return {
            ...updatedItem,
            discountAmount: totalDiscountForLine, // Store total discount for the line
            gstAmount: totalGstForLine,           // Store total GST for the line
            finalItemPrice: finalPriceForLine,    // Store final price for the line
          };
        }
        return item;
      })
    );
  };


  const calculateOrderSubtotal = (): number => { // Sum of (sellingPrice * quantity) for all items
    return orderItems.reduce((sum, item) => sum + item.sellingPrice * item.quantity, 0);
  };
  const calculateTotalDiscount = (): number => { // Sum of discountAmount for all items (which is already line total discount)
    return orderItems.reduce((sum, item) => sum + item.discountAmount, 0);
  }
  const calculateTotalGst = (): number => { // Sum of gstAmount for all items (which is already line total GST)
    return orderItems.reduce((sum, item) => sum + item.gstAmount, 0);
  };
  const calculateGrandTotal = (): number => { // Sum of finalItemPrice for all items
    return orderItems.reduce((sum, item) => sum + item.finalItemPrice, 0);
  };


  const nextStep = () => setCurrentStep(prev => prev + 1);
  const prevStep = () => setCurrentStep(prev => prev - 1);

  const canProceedToStep2 = selectedUserId !== null && (customerType === 'B2C' || (customerType === 'B2B' && selectedBusinessProfileId !== null));
  const canProceedToStep3Pricing = orderItems.length > 0; // To Step 3 (Pricing)
  const canProceedToStep4Review = orderItems.length > 0; // From Step 3 (Pricing) to Step 4 (Review)


  const handleSubmitOrder = async () => {
    if (!selectedUserId || orderItems.length === 0) {
      toast({ title: "Error", description: "User and order items are required.", variant: "destructive" });
      return;
    }

    // Construct customerDetails
    const customerDetailsPayload: CreateOrderRequest['customerDetails'] = {
      userId: selectedUserId,
      name: selectedUserDisplay?.name || undefined,
      phone: selectedUserDisplay?.phone || undefined,
      email: selectedUserDisplay?.email || undefined,
      // TODO: Populate addresses from selectedUserDisplay or foundBusinessProfile if needed
      // For now, sending minimal details. Full address mapping needed later.
      billingAddress: undefined, 
      shippingAddress: undefined,
    };

    if (customerType === 'B2B' && foundBusinessProfile) {
      customerDetailsPayload.businessProfileId = foundBusinessProfile.id;
      customerDetailsPayload.companyName = foundBusinessProfile.name;
      customerDetailsPayload.gstin = foundBusinessProfile.gstin;
      // customerDetailsPayload.stateCode = foundBusinessProfile.addresses?.[0]?.state; // Example
    }
    
    const orderPayload: CreateOrderRequest = {
      placedByUserId: selectedUserId, // Assuming POS user ID, might need a different source for this
      businessProfileId: customerType === 'B2B' ? selectedBusinessProfileId : undefined,
      customerDetails: customerDetailsPayload,
      items: orderItems.map(item => ({
        productId: item.productId,
        variantId: item.variantId,
        size: item.variantName.split(' / ')[1] || undefined, // Infer from variantName
        color: item.variantName.split(' / ')[0] || undefined, // Infer from variantName
        quantity: item.quantity,
        unitPrice: item.unitPrice, // This is sellingPrice before tax
        discountRate: item.discountRate,
        discountAmount: item.discountAmount / item.quantity, // API expects per unit discount amount
        hsnCode: item.hsnCode,
        gstTaxRate: item.gstTaxRate,
      })),
      paymentMethod: "PENDING", // Placeholder
      status: "PENDING",       // Placeholder
      notes: "",               // Placeholder
    };

    console.log("Submitting Order:", JSON.stringify(orderPayload, null, 2)); // For debugging

    try {
      setIsSubmitting(true); // Assuming you have an isSubmitting state for Step 4
      const createdOrder = await createOrder(orderPayload);
      toast({ title: "Success", description: `Order ${createdOrder.id} created successfully!` });
      // router.push(`/orders/${createdOrder.id}`); // Navigate to order detail page
      router.push('/orders'); // Or back to orders list
    } catch (error: any) {
      toast({ title: "Error Creating Order", description: error.message || "Failed to create order.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center gap-4">
        {(currentStep > 1) && (
          <Button variant="outline" size="icon" onClick={prevStep} aria-label="Previous Step">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
        <h1 className="text-2xl font-bold tracking-tight">Create New Order - Step {currentStep} of 4</h1>
      </div>

      {/* Step 1: Customer Selection */}
      {currentStep === 1 && (
        <Card className="shadow-md">
          <CardHeader><CardTitle>Step 1: Select or Create Customer</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <RadioGroup value={customerType} onValueChange={(value: "B2C" | "B2B") => {
              setCustomerType(value);
              setSelectedUserDisplay(null); setSelectedUserId(null);
              setFoundBusinessProfile(null); setSelectedBusinessProfileId(null);
              setPhoneSearch(""); setGstinSearch(""); setSearchedUsers([]);
            }} className="flex gap-4">
              <div className="flex items-center space-x-2"><RadioGroupItem value="B2C" id="r_b2c" /><Label htmlFor="r_b2c">Retail Customer (B2C)</Label></div>
              <div className="flex items-center space-x-2"><RadioGroupItem value="B2B" id="r_b2b" /><Label htmlFor="r_b2b">Business Customer (B2B)</Label></div>
            </RadioGroup>

            {customerType === 'B2C' && (
              <div className="space-y-2">
                <Label htmlFor="phone_search">Search by Phone</Label>
                <div className="flex gap-2">
                  <Input id="phone_search" value={phoneSearch} onChange={e => setPhoneSearch(e.target.value)} placeholder="Enter phone number" />
                  <Button onClick={handleUserSearch} disabled={isSearchingUser || !phoneSearch}>
                    {isSearchingUser ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : <SearchIcon className="mr-2 h-4 w-4" />} Search
                  </Button>
                </div>
                
                {isSearchingUser && <div className="text-sm text-muted-foreground p-2"><Loader2 className="animate-spin mr-2 h-3 w-3 inline-block"/>Searching users...</div>}

                {searchedUsers.length > 0 && !isSearchingUser && (
                  <Card className="mt-2 p-2 bg-secondary/30">
                    <CardDescription className="mb-1 text-xs px-2">Multiple users found. Please select one:</CardDescription>
                    <ScrollArea className="h-40">
                      {searchedUsers.map(user => (
                        <Button key={user.id} variant="ghost" className="w-full justify-start text-left h-auto py-1.5 px-2 mb-1" onClick={() => handleSelectUserFromList(user)}>
                          {user.name} ({user.phone}) {user.email && `- ${user.email}`}
                        </Button>
                      ))}
                    </ScrollArea>
                  </Card>
                )}
                 {!isSearchingUser && searchedUsers.length === 0 && phoneSearch && !selectedUserDisplay && (
                    <Dialog open={showUserCreateDialog} onOpenChange={setShowUserCreateDialog}>
                        <DialogTrigger asChild><Button variant="outline" className="mt-2"><UserPlus className="mr-2 h-4 w-4" />Create New User</Button></DialogTrigger>
                        <DialogContent>
                        <DialogHeader><DialogTitle>Create New User</DialogTitle></DialogHeader>
                        <form onSubmit={userCreateForm.handleSubmit(handleCreateUserDialogSubmit)} className="space-y-4">
                            <Input {...userCreateForm.register("name")} placeholder="Full Name" />
                            {userCreateForm.formState.errors.name && <p className="text-xs text-destructive">{userCreateForm.formState.errors.name.message}</p>}
                            <Input {...userCreateForm.register("phone")} placeholder="Phone Number" />
                            {userCreateForm.formState.errors.phone && <p className="text-xs text-destructive">{userCreateForm.formState.errors.phone.message}</p>}
                            <Input {...userCreateForm.register("email")} placeholder="Email (Optional)" />
                            {userCreateForm.formState.errors.email && <p className="text-xs text-destructive">{userCreateForm.formState.errors.email.message}</p>}
                            <DialogFooter><DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose><Button type="submit" disabled={isUserCreateSubmitting}>
                               {isUserCreateSubmitting ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : null} Create User</Button></DialogFooter>
                        </form>
                        </DialogContent>
                    </Dialog>
                )}
                {selectedUserDisplay && (
                    <Card className="mt-2 p-3 bg-green-50 border-green-200 shadow-sm">
                        <CardDescription className="font-medium text-green-700">Selected User:</CardDescription>
                        <p className="text-sm text-green-800">{selectedUserDisplay.name} ({selectedUserDisplay.phone})</p>
                        {selectedUserDisplay.email && <p className="text-xs text-green-600">{selectedUserDisplay.email}</p>}
                    </Card>
                )}
              </div>
            )}

            {customerType === 'B2B' && (
              <div className="space-y-2">
                <Label htmlFor="gstin_search">Search by GSTIN</Label>
                <div className="flex gap-2">
                  <Input id="gstin_search" value={gstinSearch} onChange={e => setGstinSearch(e.target.value)} placeholder="Enter GSTIN" />
                  <Button onClick={handleBusinessProfileSearch} disabled={isSearchingBp || !gstinSearch}>
                     {isSearchingBp ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : <Building className="mr-2 h-4 w-4" />} Search BP
                  </Button>
                </div>
                 {isSearchingBp && <div className="text-sm text-muted-foreground p-2"><Loader2 className="animate-spin mr-2 h-3 w-3 inline-block"/>Searching business profile...</div>}
                
                {!isSearchingBp && !foundBusinessProfile && gstinSearch && (
                     <Dialog open={showBpWithUserCreateDialog} onOpenChange={setShowBpWithUserCreateDialog}>
                        <DialogTrigger asChild><Button variant="outline" className="mt-2"><Building className="mr-2 h-4 w-4" /><UserPlus className="mr-1 h-4 w-4"/>Create BP & New User</Button></DialogTrigger>
                        <DialogContent className="max-h-[80vh] overflow-y-auto">
                        <DialogHeader><DialogTitle>Create Business Profile & New User</DialogTitle></DialogHeader>
                        <form onSubmit={bpWithUserCreateForm.handleSubmit(handleBpWithUserCreateDialogSubmit)} className="space-y-3">
                            <Label className="font-medium">Business Profile Details</Label>
                            <Input {...bpWithUserCreateForm.register("bpName")} placeholder="Business Name" />
                            {bpWithUserCreateForm.formState.errors.bpName && <p className="text-xs text-destructive">{bpWithUserCreateForm.formState.errors.bpName.message}</p>}
                            <Input {...bpWithUserCreateForm.register("bpGstin")} placeholder="GSTIN" />
                            {bpWithUserCreateForm.formState.errors.bpGstin && <p className="text-xs text-destructive">{bpWithUserCreateForm.formState.errors.bpGstin.message}</p>}
                            <Label className="font-medium pt-2 block">User Details</Label>
                            <Input {...bpWithUserCreateForm.register("userName")} placeholder="User Full Name" />
                             {bpWithUserCreateForm.formState.errors.userName && <p className="text-xs text-destructive">{bpWithUserCreateForm.formState.errors.userName.message}</p>}
                            <Input {...bpWithUserCreateForm.register("userPhone")} placeholder="User Phone Number" />
                            {bpWithUserCreateForm.formState.errors.userPhone && <p className="text-xs text-destructive">{bpWithUserCreateForm.formState.errors.userPhone.message}</p>}
                            <Input {...bpWithUserCreateForm.register("userEmail")} placeholder="User Email (Optional)" />
                            {bpWithUserCreateForm.formState.errors.userEmail && <p className="text-xs text-destructive">{bpWithUserCreateForm.formState.errors.userEmail.message}</p>}
                            <DialogFooter><DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose><Button type="submit" disabled={isBpWithUserCreateSubmitting}>
                              {isBpWithUserCreateSubmitting ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : null}  Create BP & User</Button></DialogFooter>
                        </form>
                        </DialogContent>
                    </Dialog>
                )}
                {foundBusinessProfile && (
                  <Card className="mt-2 p-3 bg-green-50 border-green-200 shadow-sm">
                    <CardDescription className="font-medium text-green-700">Selected Business:</CardDescription>
                    <p className="text-sm text-green-800">{foundBusinessProfile.name} ({foundBusinessProfile.gstin})</p>
                    {selectedUserDisplay && <p className="mt-1 text-xs text-green-600">Associated User: {selectedUserDisplay.name} ({selectedUserDisplay.phone})</p>}
                     {!selectedUserDisplay && foundBusinessProfile.userIds && foundBusinessProfile.userIds.length === 0 && <p className="mt-1 text-xs text-orange-600">No primary user linked. Order can proceed, or link user via BP Management.</p>}
                  </Card>
                )}
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button onClick={nextStep} disabled={!canProceedToStep2}>
              Next: Add Items <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step 2: Add Order Items */}
      {currentStep === 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="shadow-md">
              <CardHeader><CardTitle>Step 2: Add Items to Order</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2 items-end">
                  <div className="flex-grow">
                    <Label htmlFor="product_search">Search Products</Label>
                    <Input id="product_search" value={productSearchQuery} onChange={e => setProductSearchQuery(e.target.value)} placeholder="Enter product name, SKU, etc." />
                  </div>
                </div>

                {isSearchingProducts && <div className="flex items-center justify-center p-4 text-muted-foreground"><Loader2 className="animate-spin h-5 w-5 mr-2"/>Searching products...</div>}
                
                {productSearchResults.length > 0 && !isSearchingProducts && (
                  <ScrollArea className="h-60 border rounded-md p-2 bg-secondary/20">
                    <p className="text-sm text-muted-foreground mb-2 px-2">Search Results ({productSearchResults.length}):</p>
                    {productSearchResults.map(product => (
                      <Button key={product.id} variant="ghost" className="w-full justify-start mb-1 h-auto py-2 px-2 text-left" onClick={() => handleSelectSearchedProduct(product.id)}>
                        <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-xs text-muted-foreground">
                                {product.brand && `${product.brand} | `}
                                {product.category && `${product.category} | `}
                                {product.sku && `SKU: ${product.sku}`}
                            </p>
                        </div>
                      </Button>
                    ))}
                  </ScrollArea>
                )}
                 {!isSearchingProducts && productSearchQuery && productSearchResults.length === 0 && (
                    <div className="text-center py-4">
                        <p className="text-muted-foreground">No products found matching "{productSearchQuery}".</p>
                        <Dialog open={showQuickProductDialog} onOpenChange={setShowQuickProductDialog}>
                            <DialogTrigger asChild><Button variant="outline" className="mt-2"><PlusCircle className="mr-2 h-4 w-4" />Quick Add Product</Button></DialogTrigger>
                            <DialogContent className="max-h-[80vh] overflow-y-auto">
                                <DialogHeader><DialogTitle>Quick Add New Product</DialogTitle></DialogHeader>
                                <form onSubmit={quickProductCreateForm.handleSubmit(handleQuickProductCreateDialogSubmit)} className="space-y-3">
                                    <Input {...quickProductCreateForm.register("name")} placeholder="Product Name *" />
                                    {quickProductCreateForm.formState.errors.name && <p className="text-xs text-destructive">{quickProductCreateForm.formState.errors.name.message}</p>}
                                    <Input {...quickProductCreateForm.register("brandName")} placeholder="Brand Name *" />
                                    {quickProductCreateForm.formState.errors.brandName && <p className="text-xs text-destructive">{quickProductCreateForm.formState.errors.brandName.message}</p>}
                                    <Input {...quickProductCreateForm.register("categoryName")} placeholder="Category Name *" />
                                    {quickProductCreateForm.formState.errors.categoryName && <p className="text-xs text-destructive">{quickProductCreateForm.formState.errors.categoryName.message}</p>}
                                    <Input {...quickProductCreateForm.register("colors")} placeholder="Colors (comma-separated) *" />
                                    {quickProductCreateForm.formState.errors.colors && <p className="text-xs text-destructive">{quickProductCreateForm.formState.errors.colors.message}</p>}
                                    <Input {...quickProductCreateForm.register("sizes")} placeholder="Sizes (comma-separated) *" />
                                     {quickProductCreateForm.formState.errors.sizes && <p className="text-xs text-destructive">{quickProductCreateForm.formState.errors.sizes.message}</p>}
                                    <Input type="number" step="0.01" {...quickProductCreateForm.register("unitPrice")} placeholder="Unit Price *" />
                                    {quickProductCreateForm.formState.errors.unitPrice && <p className="text-xs text-destructive">{quickProductCreateForm.formState.errors.unitPrice.message}</p>}
                                    <DialogFooter><DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose><Button type="submit" disabled={isQuickProductSubmitting}>
                                      {isQuickProductSubmitting ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : null} Quick Create</Button></DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                )}

                {isLoadingProductDetails && <div className="flex items-center justify-center p-4 text-muted-foreground"><Loader2 className="animate-spin h-6 w-6 mr-2"/> Fetching product details...</div>}
                
                {selectedProductForDetails && !isLoadingProductDetails && (
                  <Card className="p-4 mt-4 shadow-sm border">
                    <CardTitle className="text-lg mb-3">Configure: {selectedProductForDetails.name}</CardTitle>
                    {selectedProductForDetails.variants && selectedProductForDetails.variants.length > 0 ? (
                      <div className="space-y-4">
                        <div>
                          <Label className="font-medium text-sm">Select Variant:</Label>
                           <RadioGroup 
                                onValueChange={(variantId) => {
                                    const v = selectedProductForDetails.variants?.find(va => va.id === variantId);
                                    setSelectedVariant(v || null);
                                }}
                                value={selectedVariant?.id || ""}
                                className="mt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2"
                            >
                                {selectedProductForDetails.variants.map(variant => (
                                    <Label key={variant.id} htmlFor={`variant-${variant.id}`} 
                                           className={`flex flex-col items-start justify-between border rounded-md p-3 hover:bg-accent/50 cursor-pointer ${selectedVariant?.id === variant.id ? 'bg-accent border-primary ring-2 ring-primary' : 'border-border'}`}>
                                        <RadioGroupItem value={variant.id} id={`variant-${variant.id}`} className="sr-only"/>
                                        <div className="text-sm w-full">
                                            <div className="flex justify-between items-center">
                                                <p className="font-medium flex-grow">
                                                    {variant.color && <span className="mr-1.5 p-1 text-xs rounded bg-gray-200 text-gray-700">{variant.color}</span>}
                                                    {variant.size && <span className="border px-1.5 py-0.5 text-xs rounded">{variant.size}</span>}
                                                    {(!variant.color && !variant.size) && <span className="text-xs text-muted-foreground italic">Default</span>}
                                                </p>
                                            </div>
                                            <p className="mt-1">Price: ₹{(variant.sellingPrice || variant.price || selectedProductForDetails.unitPrice || 0).toFixed(2)}</p>
                                            <p className="text-xs text-muted-foreground">Stock: {variant.quantity ?? 'N/A'}</p>
                                        </div>
                                    </Label>
                                ))}
                            </RadioGroup>
                        </div>
                        {selectedVariant && (
                            <div className="flex items-end gap-3 pt-2 border-t border-dashed">
                                <div className="flex-grow">
                                    <Label htmlFor="quantity" className="font-medium text-sm">Quantity:</Label>
                                    <Input id="quantity" type="number" value={selectedQuantity} onChange={e => setSelectedQuantity(parseInt(e.target.value) > 0 ? parseInt(e.target.value) : 1)} min="1" className="w-24 mt-1 h-9" />
                                </div>
                                <Button onClick={handleAddOrderItem} disabled={!selectedVariant || selectedQuantity <= 0} className="h-9">
                                  <PlusCircle className="mr-2 h-4 w-4" /> Add to Order
                                </Button>
                            </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-muted-foreground py-3">This product has no variants defined or available.</p>
                    )}
                  </Card>
                )}
              </CardContent>
            </Card>
          </div>
          
          <div className="lg:col-span-1">
            <Card className="shadow-md sticky top-20">
              <CardHeader><CardTitle>Current Order Items</CardTitle></CardHeader>
              <CardContent className="-mx-1">
                {orderItems.length === 0 ? (
                  <div className="text-center py-10 px-6">
                    <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
                    <p className="mt-2 text-sm text-muted-foreground">Your order is empty.</p>
                    <p className="text-xs text-muted-foreground">Add products using the search panel.</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[calc(100vh-35rem)] max-h-[500px]"> 
                    <Table className="text-xs">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="p-2">Item</TableHead>
                          <TableHead className="w-16 p-2 text-center">Qty</TableHead>
                          <TableHead className="w-20 p-2 text-right">Price</TableHead>
                          <TableHead className="w-10 p-2"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orderItems.map(item => (
                          <TableRow key={item.variantId}>
                            <TableCell className="py-1 px-2">
                              <p className="font-medium text-xs">{item.productName}</p>
                              <p className="text-[11px] text-muted-foreground">{item.variantName}</p>
                            </TableCell>
                            <TableCell className="py-1 px-2 text-center">
                              <Input type="number" value={item.quantity} 
                                     onChange={(e) => handleOrderItemQuantityChangeStep2(item.variantId, parseInt(e.target.value))}
                                     className="h-8 w-14 text-xs p-1 text-center" min="1"/>
                            </TableCell>
                            <TableCell className="py-1 px-2 text-right font-medium">₹{(item.sellingPrice * item.quantity).toFixed(2)}</TableCell>
                            <TableCell className="py-1 px-1">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRemoveOrderItem(item.variantId)}>
                                    <X className="h-3.5 w-3.5 text-destructive"/>
                                </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
                {orderItems.length > 0 && (
                    <div className="mt-4 pt-4 border-t px-6">
                        <div className="flex justify-between font-semibold text-base">
                            <span>Subtotal:</span>
                            <span>₹{orderItems.reduce((sum, item) => sum + item.sellingPrice * item.quantity, 0).toFixed(2)}</span>
                        </div>
                    </div>
                )}
              </CardContent>
              <CardFooter className="flex-col items-stretch space-y-2 pt-4">
                 <Button onClick={nextStep} disabled={!canProceedToStep3Pricing} className="w-full">
                    Next: Adjust Pricing <ChevronRight className="h-4 w-4 ml-2" />
                 </Button>
                 <Button onClick={prevStep} variant="outline" className="w-full">
                    <ChevronLeft className="h-4 w-4 mr-2" /> Back to Customer 
                 </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      )}

      {/* Step 3: Review & Adjust Item Pricing */}
      {currentStep === 3 && (
        <Card className="shadow-md">
          <CardHeader><CardTitle>Step 3: Review & Adjust Item Pricing</CardTitle></CardHeader>
          <CardContent>
             {orderItems.length === 0 ? (
                <p className="text-muted-foreground text-center py-6">No items in order to adjust pricing for.</p>
             ) : (
                <ScrollArea className="max-h-[60vh]">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="min-w-[150px]">Item</TableHead>
                                <TableHead className="w-20">Qty</TableHead>
                                <TableHead className="w-24">MRP</TableHead>
                                <TableHead className="w-28">Disc. Rate (%)</TableHead>
                                <TableHead className="w-24">Selling Price</TableHead>
                                <TableHead className="w-28">GST Rate (%)</TableHead>
                                <TableHead className="w-28 text-right">Final Price</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {orderItems.map(item => (
                                <TableRow key={item.variantId}>
                                    <TableCell>
                                        <p className="font-medium text-sm">{item.productName}</p>
                                        <p className="text-xs text-muted-foreground">{item.variantName}</p>
                                    </TableCell>
                                    <TableCell>
                                        <Input type="number" value={item.quantity} min="1"
                                               onChange={(e) => handleOrderItemDetailChangeStep3(item.variantId, 'quantity', e.target.value)}
                                               className="h-9 w-full text-sm p-2"/>
                                    </TableCell>
                                    <TableCell>
                                        <Input type="number" step="0.01" value={item.mrp.toFixed(2)}
                                               onChange={(e) => handleOrderItemDetailChangeStep3(item.variantId, 'mrp', e.target.value)}
                                               className="h-9 w-full text-sm p-2"/>
                                    </TableCell>
                                    <TableCell>
                                        <Input type="number" step="0.01" value={item.discountRate.toFixed(2)}
                                               onChange={(e) => handleOrderItemDetailChangeStep3(item.variantId, 'discountRate', e.target.value)}
                                               className="h-9 w-full text-sm p-2"/>
                                        <p className="text-xs text-muted-foreground mt-1">Disc: ₹{(item.mrp * item.quantity * (item.discountRate / 100)).toFixed(2)}</p>
                                    </TableCell>
                                    <TableCell>
                                        <Input type="number" step="0.01" value={item.sellingPrice.toFixed(2)} readOnly disabled
                                               className="h-9 w-full text-sm p-2 bg-muted/50"/>
                                    </TableCell>
                                     <TableCell>
                                        <Input type="number" step="0.01" value={item.gstTaxRate.toFixed(2)}
                                               onChange={(e) => handleOrderItemDetailChangeStep3(item.variantId, 'gstTaxRate', e.target.value)}
                                               className="h-9 w-full text-sm p-2"/>
                                        <p className="text-xs text-muted-foreground mt-1">GST: ₹{(item.sellingPrice * item.quantity * (item.gstTaxRate / 100)).toFixed(2)}</p>
                                    </TableCell>
                                    <TableCell className="text-right font-semibold">
                                        ₹{item.finalItemPrice.toFixed(2)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </ScrollArea>
             )}
             {orderItems.length > 0 && (
                <div className="mt-6 pt-4 border-t">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm font-medium">
                        <p>Subtotal (Pre-tax):</p><p className="text-right">₹{calculateOrderSubtotal().toFixed(2)}</p>
                        <p>Total Discount:</p><p className="text-right text-green-600">- ₹{calculateTotalDiscount().toFixed(2)}</p>
                        <p>Total GST:</p><p className="text-right">₹{calculateTotalGst().toFixed(2)}</p>
                        <p className="text-lg font-semibold mt-1">Grand Total:</p><p className="text-lg font-semibold text-right mt-1">₹{calculateGrandTotal().toFixed(2)}</p>
                    </div>
                </div>
             )}
          </CardContent>
          <CardFooter className="flex justify-between mt-6">
             <Button onClick={prevStep} variant="outline">
                <ChevronLeft className="h-4 w-4 mr-2" /> Back to Add Items
             </Button>
             <Button onClick={nextStep} disabled={!canProceedToStep4Review}>
                Next: Final Review & Payment <ChevronRight className="h-4 w-4 ml-2" />
             </Button>
          </CardFooter>
        </Card>
      )}


      {/* Step 4: Final Review & Payment */}
      {currentStep === 4 && (
        <Card className="shadow-md">
          <CardHeader><CardTitle>Step 4: Final Review & Payment</CardTitle></CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">Please review your order items before proceeding to payment.</p>
             <div className="mt-4 space-y-2">
                <h3 className="font-semibold text-lg mb-2">Order Summary:</h3>
                <Card className="p-4 bg-secondary/30">
                  <ScrollArea className="h-auto max-h-60">
                    {orderItems.map(item => (
                        <div key={item.variantId} className="flex justify-between items-start text-sm py-2 border-b last:border-b-0">
                            <div>
                                <p className="font-medium">{item.productName} <span className="text-xs text-muted-foreground">({item.variantName})</span></p>
                                <p className="text-xs">Qty: {item.quantity} @ ₹{item.sellingPrice.toFixed(2)}/unit (MRP: ₹{item.mrp.toFixed(2)})</p>
                                <p className="text-xs text-muted-foreground">Discount: {item.discountRate.toFixed(1)}% | GST: {item.gstTaxRate.toFixed(1)}%</p>
                            </div>
                            <p className="font-medium">₹{item.finalItemPrice.toFixed(2)}</p>
                        </div>
                    ))}
                  </ScrollArea>
                  <div className="mt-3 pt-3 border-t">
                    <div className="flex justify-between text-sm"><span>Subtotal (Pre-tax):</span><span>₹{calculateOrderSubtotal().toFixed(2)}</span></div>
                    <div className="flex justify-between text-sm"><span>Total Discount:</span><span className="text-green-600">- ₹{calculateTotalDiscount().toFixed(2)}</span></div>
                    <div className="flex justify-between text-sm"><span>Total GST:</span><span>₹{calculateTotalGst().toFixed(2)}</span></div>
                    <div className="flex justify-between font-bold text-xl mt-1">
                        <span>Grand Total:</span>
                        <span>₹{calculateGrandTotal().toFixed(2)}</span>
                    </div>
                  </div>
                </Card>
            </div>
            <div className="mt-6">
              <h3 className="font-semibold text-lg mb-2">Payment Details</h3>
              <p className="text-muted-foreground">Payment gateway integration or manual payment recording will appear here.</p>
              {/* Placeholder for payment form/options */}
            </div>
          </CardContent>
          <CardFooter className="justify-between mt-6">
             <Button onClick={prevStep} variant="outline">
                <ChevronLeft className="h-4 w-4 mr-2" /> Back to Adjust Pricing
             </Button>
            <Button onClick={handleSubmitOrder} disabled={isSubmitting || orderItems.length === 0}>
               {isSubmitting ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : null}
               Place Order
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}


    