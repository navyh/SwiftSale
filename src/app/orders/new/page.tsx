
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, Controller } from "react-hook-form";
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
  ChevronLeft, ChevronRight, PlusCircle, Trash2, Search as SearchIcon, UserPlus, Building, ShoppingCart, Loader2, X
} from "lucide-react";
import {
  fetchUserById, createUser, type CreateUserRequest, type UserDto,
  searchUserByPhone,
  fetchBusinessProfileById, createBusinessProfile, type CreateBusinessProfileRequest, type BusinessProfileDto,
  searchBusinessProfileByGstin, createBusinessProfileWithUser, type CreateBusinessProfileWithUserRequest, type CreateBusinessProfileWithUserResponse,
  searchProductsFuzzy, type ProductSearchResultDto, type ProductDto, fetchProductById, type ProductVariantDto,
  quickCreateProduct, type QuickCreateProductRequest, type QuickCreateProductResponse,
  type AddressCreateDto, type OrderItemRequest, type CreateOrderRequest
} from "@/lib/apiClient";

// Zod Schemas for Forms
const userCreateDialogSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Phone is required").regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone format"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  // Addresses can be added if needed in this dialog, simplified for now
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


interface OrderItemDisplay extends OrderItemRequest {
  productName: string;
  variantName: string; // e.g., "Red / M"
  totalPrice: number;
}


export default function CreateOrderPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = React.useState(1);
  const [customerType, setCustomerType] = React.useState<"B2C" | "B2B">("B2C");
  
  // Step 1 State
  const [phoneSearch, setPhoneSearch] = React.useState("");
  const [gstinSearch, setGstinSearch] = React.useState("");
  const [foundUser, setFoundUser] = React.useState<UserDto | null>(null);
  const [foundBusinessProfile, setFoundBusinessProfile] = React.useState<BusinessProfileDto | null>(null);
  const [selectedUser, setSelectedUser] = React.useState<UserDto | null>(null);
  const [selectedBusinessProfile, setSelectedBusinessProfile] = React.useState<BusinessProfileDto | null>(null);
  const [isSearchingUser, setIsSearchingUser] = React.useState(false);
  const [isSearchingBp, setIsSearchingBp] = React.useState(false);
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

  // Dialog Forms
  const userCreateForm = useForm<UserCreateDialogValues>({ resolver: zodResolver(userCreateDialogSchema) });
  const bpWithUserCreateForm = useForm<BpWithUserCreateDialogValues>({ resolver: zodResolver(bpWithUserCreateDialogSchema) });
  const quickProductCreateForm = useForm<QuickProductCreateDialogValues>({ resolver: zodResolver(quickProductCreateDialogSchema) });


  const handleUserSearch = async () => {
    if (!phoneSearch) return;
    setIsSearchingUser(true); setFoundUser(null); setSelectedUser(null);
    try {
      const user = await searchUserByPhone(phoneSearch);
      setFoundUser(user);
      if (user) setSelectedUser(user);
      else setShowUserCreateDialog(true); // Open dialog if user not found
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to search user.", variant: "destructive" });
    } finally {
      setIsSearchingUser(false);
    }
  };

  const handleBusinessProfileSearch = async () => {
    if (!gstinSearch) return;
    setIsSearchingBp(true); setFoundBusinessProfile(null); setSelectedBusinessProfile(null); setSelectedUser(null);
    try {
      const bp = await searchBusinessProfileByGstin(gstinSearch);
      setFoundBusinessProfile(bp);
      if (bp) {
        setSelectedBusinessProfile(bp);
        // Attempt to fetch and select the first linked user if available
        if (bp.userIds && bp.userIds.length > 0) {
          const user = await fetchUserById(bp.userIds[0]);
          setSelectedUser(user);
        } else {
          // If BP exists but no users linked, this scenario needs clarification.
          // For now, we might prompt to link or create a user for this BP, or assume one must exist.
          toast({ title: "Info", description: "Business profile found, but no users are linked. Please link a user via Business Profile Management.", variant: "default" });
        }
      } else {
        setShowBpWithUserCreateDialog(true); // Open dialog if BP not found
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to search business profile.", variant: "destructive" });
    } finally {
      setIsSearchingBp(false);
    }
  };

  const handleCreateUserDialogSubmit = async (data: UserCreateDialogValues) => {
    try {
      const newUser = await createUser({ name: data.name, phone: data.phone, email: data.email || undefined, status: 'ACTIVE' });
      setSelectedUser(newUser);
      setFoundUser(newUser);
      setShowUserCreateDialog(false);
      userCreateForm.reset();
      toast({ title: "Success", description: "User created successfully." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to create user.", variant: "destructive" });
    }
  };

  const handleBpWithUserCreateDialogSubmit = async (data: BpWithUserCreateDialogValues) => {
    const payload: CreateBusinessProfileWithUserRequest = {
      businessProfile: { name: data.bpName, gstin: data.bpGstin },
      user: { name: data.userName, phone: data.userPhone, email: data.userEmail || undefined }
    };
    try {
      const response = await createBusinessProfileWithUser(payload);
      setSelectedBusinessProfile(response);
      setFoundBusinessProfile(response);
      // Assuming the response.user contains the created user details
      if (response.user) {
        setSelectedUser(response.user);
        setFoundUser(response.user);
      } else if (response.userIds && response.userIds.length > 0) {
        // Fallback if only userIds are returned
        const user = await fetchUserById(response.userIds[0]);
        setSelectedUser(user);
        setFoundUser(user);
      }
      setShowBpWithUserCreateDialog(false);
      bpWithUserCreateForm.reset();
      toast({ title: "Success", description: "Business profile and user created successfully." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to create business profile with user.", variant: "destructive" });
    }
  };

  const handleProductSearch = async () => {
    if (!productSearchQuery.trim()) {
      setProductSearchResults([]);
      return;
    }
    setIsSearchingProducts(true);
    try {
      const results = await searchProductsFuzzy(productSearchQuery);
      setProductSearchResults(results);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to search products.", variant: "destructive" });
      setProductSearchResults([]);
    } finally {
      setIsSearchingProducts(false);
    }
  };

  const handleSelectSearchedProduct = async (productId: string) => {
    setIsLoadingProductDetails(true);
    setSelectedProductForDetails(null);
    setSelectedVariant(null);
    setSelectedQuantity(1);
    try {
      const product = await fetchProductById(productId);
      setSelectedProductForDetails(product);
      // Auto-select first variant if available
      if (product.variants && product.variants.length > 0) {
        setSelectedVariant(product.variants[0]);
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to fetch product details.", variant: "destructive" });
    } finally {
      setIsLoadingProductDetails(false);
    }
  };
  
  const handleQuickProductCreateDialogSubmit = async (data: QuickProductCreateDialogValues) => {
    const payload: QuickCreateProductRequest = {
      name: data.name,
      brandName: data.brandName,
      categoryName: data.categoryName,
      colorVariants: data.colors.split(',').map(c => c.trim()).filter(Boolean),
      sizeVariants: data.sizes.split(',').map(s => s.trim()).filter(Boolean),
      unitPrice: data.unitPrice,
    };
    try {
      const response = await quickCreateProduct(payload);
      setShowQuickProductDialog(false);
      quickProductCreateForm.reset();
      toast({ title: "Success", description: `Product "${response.name}" created quickly.` });
      
      // Add the first created variant to the cart
      if (response.variants && response.variants.length > 0) {
        const newVariant = response.variants[0];
        const newItem: OrderItemDisplay = {
          productId: response.id,
          variantId: newVariant.id,
          quantity: 1, // Default quantity
          unitPrice: newVariant.price || data.unitPrice, // Use variant price if available, else form price
          productName: response.name,
          variantName: `${newVariant.color || ''} / ${newVariant.size || ''}`.trim(),
          totalPrice: (newVariant.price || data.unitPrice) * 1,
        };
        setOrderItems(prevItems => [...prevItems, newItem]);
      }
       setProductSearchQuery(response.name); // Optionally prefill search to show the new product
       await handleProductSearch(); // Refresh search results
       await handleSelectSearchedProduct(response.id); // Select the newly created product

    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to quick create product.", variant: "destructive" });
    }
  };

  const handleAddOrderItem = () => {
    if (!selectedProductForDetails || !selectedVariant || selectedQuantity <= 0) {
      toast({ title: "Warning", description: "Please select a product, variant, and valid quantity.", variant: "default" });
      return;
    }
    const existingItemIndex = orderItems.findIndex(item => item.variantId === selectedVariant.id);
    
    if (existingItemIndex > -1) {
      // Update quantity if item already in cart
      const updatedItems = [...orderItems];
      updatedItems[existingItemIndex].quantity += selectedQuantity;
      updatedItems[existingItemIndex].totalPrice = updatedItems[existingItemIndex].quantity * updatedItems[existingItemIndex].unitPrice;
      setOrderItems(updatedItems);
    } else {
      // Add new item
      const newItem: OrderItemDisplay = {
        productId: selectedProductForDetails.id,
        variantId: selectedVariant.id,
        quantity: selectedQuantity,
        unitPrice: selectedVariant.price || 0,
        productName: selectedProductForDetails.name,
        variantName: `${selectedVariant.color || ''} / ${selectedVariant.size || ''}`.trim(),
        totalPrice: (selectedVariant.price || 0) * selectedQuantity,
      };
      setOrderItems(prevItems => [...prevItems, newItem]);
    }
    // Reset selection for next item
    // setSelectedProductForDetails(null); 
    // setSelectedVariant(null);
    // setProductSearchResults([]);
    // setProductSearchQuery("");
    setSelectedQuantity(1);
  };

  const handleRemoveOrderItem = (variantId: string) => {
    setOrderItems(prevItems => prevItems.filter(item => item.variantId !== variantId));
  };

  const calculateSubtotal = () => {
    return orderItems.reduce((sum, item) => sum + item.totalPrice, 0);
  };


  const nextStep = () => setCurrentStep(prev => prev + 1);
  const prevStep = () => setCurrentStep(prev => prev - 1);

  const canProceedToStep2 = selectedUser !== null;
  const canProceedToStep3 = orderItems.length > 0;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center gap-4">
        {currentStep > 1 && (
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
              setFoundUser(null); setSelectedUser(null);
              setFoundBusinessProfile(null); setSelectedBusinessProfile(null);
              setPhoneSearch(""); setGstinSearch("");
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
                    {isSearchingUser ? <Loader2 className="animate-spin mr-2"/> : <SearchIcon className="mr-2 h-4 w-4" />} Search
                  </Button>
                </div>
                {foundUser && <Card className="mt-2 p-3 bg-green-50 border-green-200"><CardDescription>Selected User: {foundUser.name} ({foundUser.phone})</CardDescription></Card>}
                 {!isSearchingUser && !foundUser && phoneSearch && (
                    <Dialog open={showUserCreateDialog} onOpenChange={setShowUserCreateDialog}>
                        <DialogTrigger asChild><Button variant="outline">Create New User</Button></DialogTrigger>
                        <DialogContent>
                        <DialogHeader><DialogTitle>Create New User</DialogTitle></DialogHeader>
                        <form onSubmit={userCreateForm.handleSubmit(handleCreateUserDialogSubmit)} className="space-y-4">
                            <Input {...userCreateForm.register("name")} placeholder="Full Name" />
                            {userCreateForm.formState.errors.name && <p className="text-xs text-destructive">{userCreateForm.formState.errors.name.message}</p>}
                            <Input {...userCreateForm.register("phone")} placeholder="Phone Number" defaultValue={phoneSearch} />
                            {userCreateForm.formState.errors.phone && <p className="text-xs text-destructive">{userCreateForm.formState.errors.phone.message}</p>}
                            <Input {...userCreateForm.register("email")} placeholder="Email (Optional)" />
                            {userCreateForm.formState.errors.email && <p className="text-xs text-destructive">{userCreateForm.formState.errors.email.message}</p>}
                            <DialogFooter><Button type="submit" disabled={userCreateForm.formState.isSubmitting}>Create User</Button></DialogFooter>
                        </form>
                        </DialogContent>
                    </Dialog>
                )}
              </div>
            )}

            {customerType === 'B2B' && (
              <div className="space-y-2">
                <Label htmlFor="gstin_search">Search by GSTIN</Label>
                <div className="flex gap-2">
                  <Input id="gstin_search" value={gstinSearch} onChange={e => setGstinSearch(e.target.value)} placeholder="Enter GSTIN" />
                  <Button onClick={handleBusinessProfileSearch} disabled={isSearchingBp || !gstinSearch}>
                     {isSearchingBp ? <Loader2 className="animate-spin mr-2"/> : <SearchIcon className="mr-2 h-4 w-4" />} Search
                  </Button>
                </div>
                {foundBusinessProfile && (
                  <Card className="mt-2 p-3 bg-green-50 border-green-200">
                    <CardDescription>Selected Business: {foundBusinessProfile.name} ({foundBusinessProfile.gstin})</CardDescription>
                    {selectedUser && <CardDescription className="mt-1">Associated User: {selectedUser.name} ({selectedUser.phone})</CardDescription>}
                  </Card>
                )}
                {!isSearchingBp && !foundBusinessProfile && gstinSearch && (
                     <Dialog open={showBpWithUserCreateDialog} onOpenChange={setShowBpWithUserCreateDialog}>
                        <DialogTrigger asChild><Button variant="outline">Create BP & New User</Button></DialogTrigger>
                        <DialogContent>
                        <DialogHeader><DialogTitle>Create Business Profile & New User</DialogTitle></DialogHeader>
                        <form onSubmit={bpWithUserCreateForm.handleSubmit(handleBpWithUserCreateDialogSubmit)} className="space-y-3">
                            <Label className="font-medium">Business Profile Details</Label>
                            <Input {...bpWithUserCreateForm.register("bpName")} placeholder="Business Name" />
                            {bpWithUserCreateForm.formState.errors.bpName && <p className="text-xs text-destructive">{bpWithUserCreateForm.formState.errors.bpName.message}</p>}
                            <Input {...bpWithUserCreateForm.register("bpGstin")} placeholder="GSTIN" defaultValue={gstinSearch} />
                            {bpWithUserCreateForm.formState.errors.bpGstin && <p className="text-xs text-destructive">{bpWithUserCreateForm.formState.errors.bpGstin.message}</p>}
                            <Label className="font-medium pt-2 block">User Details</Label>
                            <Input {...bpWithUserCreateForm.register("userName")} placeholder="User Full Name" />
                             {bpWithUserCreateForm.formState.errors.userName && <p className="text-xs text-destructive">{bpWithUserCreateForm.formState.errors.userName.message}</p>}
                            <Input {...bpWithUserCreateForm.register("userPhone")} placeholder="User Phone Number" />
                            {bpWithUserCreateForm.formState.errors.userPhone && <p className="text-xs text-destructive">{bpWithUserCreateForm.formState.errors.userPhone.message}</p>}
                            <Input {...bpWithUserCreateForm.register("userEmail")} placeholder="User Email (Optional)" />
                            {bpWithUserCreateForm.formState.errors.userEmail && <p className="text-xs text-destructive">{bpWithUserCreateForm.formState.errors.userEmail.message}</p>}
                            <DialogFooter><Button type="submit" disabled={bpWithUserCreateForm.formState.isSubmitting}>Create BP & User</Button></DialogFooter>
                        </form>
                        </DialogContent>
                    </Dialog>
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
                  <Button onClick={handleProductSearch} disabled={isSearchingProducts}>
                    {isSearchingProducts ? <Loader2 className="animate-spin mr-2"/> : <SearchIcon className="mr-2 h-4 w-4" />} Search
                  </Button>
                </div>

                {productSearchResults.length > 0 && (
                  <ScrollArea className="h-60 border rounded-md p-2">
                    <p className="text-sm text-muted-foreground mb-2">Search Results ({productSearchResults.length}):</p>
                    {productSearchResults.map(product => (
                      <Button key={product.id} variant="ghost" className="w-full justify-start mb-1 h-auto py-2" onClick={() => handleSelectSearchedProduct(product.id)}>
                        <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-xs text-muted-foreground">
                                {product.brandName && `${product.brandName} | `}
                                {product.categoryName && `${product.categoryName} | `}
                                Price: {product.unitPrice ? `$${product.unitPrice.toFixed(2)}` : 'N/A'}
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
                            <DialogTrigger asChild><Button variant="outline" className="mt-2">Quick Add Product</Button></DialogTrigger>
                            <DialogContent>
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
                                    <DialogFooter><Button type="submit" disabled={quickProductCreateForm.formState.isSubmitting}>Quick Create</Button></DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                )}

                {isLoadingProductDetails && <div className="flex items-center justify-center p-4"><Loader2 className="animate-spin h-6 w-6"/> Fetching product details...</div>}
                
                {selectedProductForDetails && !isLoadingProductDetails && (
                  <Card className="p-4 mt-4">
                    <CardTitle className="text-lg mb-2">Configure: {selectedProductForDetails.name}</CardTitle>
                    {selectedProductForDetails.variants && selectedProductForDetails.variants.length > 0 ? (
                      <div className="space-y-3">
                        <div>
                          <Label>Select Variant:</Label>
                           <RadioGroup 
                                onValueChange={(variantId) => {
                                    const v = selectedProductForDetails.variants?.find(va => va.id === variantId);
                                    setSelectedVariant(v || null);
                                }}
                                value={selectedVariant?.id || ""}
                                className="mt-1 grid grid-cols-2 md:grid-cols-3 gap-2"
                            >
                                {selectedProductForDetails.variants.map(variant => (
                                    <Label key={variant.id} htmlFor={`variant-${variant.id}`} 
                                           className={`flex items-center space-x-2 border rounded-md p-2 hover:bg-accent/50 cursor-pointer ${selectedVariant?.id === variant.id ? 'bg-accent border-primary ring-2 ring-primary' : 'border-border'}`}>
                                        <RadioGroupItem value={variant.id} id={`variant-${variant.id}`} className="sr-only"/>
                                        <div className="text-sm">
                                            <p className="font-medium">
                                                {variant.color && <span className="mr-1 p-1 text-xs rounded" style={{backgroundColor: variant.color.startsWith('#') ? variant.color : 'transparent', color: variant.color.startsWith('#') ? (parseInt(variant.color.substring(1,3),16) > 128 ? 'black' : 'white') : 'inherit'}}>{variant.color}</span>}
                                                {variant.size && <span className="border px-1.5 py-0.5 text-xs rounded">{variant.size}</span>}
                                            </p>
                                            <p>Price: ${variant.price?.toFixed(2) || 'N/A'}</p>
                                            <p>Stock: {variant.quantity}</p>
                                        </div>
                                    </Label>
                                ))}
                            </RadioGroup>
                        </div>
                        {selectedVariant && (
                            <div>
                                <Label htmlFor="quantity">Quantity:</Label>
                                <Input id="quantity" type="number" value={selectedQuantity} onChange={e => setSelectedQuantity(parseInt(e.target.value))} min="1" className="w-24 mt-1" />
                            </div>
                        )}
                        <Button onClick={handleAddOrderItem} disabled={!selectedVariant || selectedQuantity <= 0}>
                          <PlusCircle className="mr-2 h-4 w-4" /> Add to Order
                        </Button>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">This product has no variants defined.</p>
                    )}
                  </Card>
                )}
              </CardContent>
            </Card>
          </div>
          
          <div className="lg:col-span-1">
            <Card className="shadow-md sticky top-20">
              <CardHeader><CardTitle>Current Order</CardTitle></CardHeader>
              <CardContent>
                {orderItems.length === 0 ? (
                  <p className="text-muted-foreground">No items added yet.</p>
                ) : (
                  <ScrollArea className="h-80">
                    <Table>
                      <TableHeader><TableRow><TableHead>Item</TableHead><TableHead>Qty</TableHead><TableHead className="text-right">Total</TableHead><TableHead></TableHead></TableRow></TableHeader>
                      <TableBody>
                        {orderItems.map(item => (
                          <TableRow key={item.variantId}>
                            <TableCell>
                              <p className="font-medium">{item.productName}</p>
                              <p className="text-xs text-muted-foreground">{item.variantName} (@ ${item.unitPrice.toFixed(2)})</p>
                            </TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell className="text-right">${item.totalPrice.toFixed(2)}</TableCell>
                            <TableCell>
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
                    <div className="mt-4 pt-4 border-t">
                        <div className="flex justify-between font-semibold text-lg">
                            <span>Subtotal:</span>
                            <span>${calculateSubtotal().toFixed(2)}</span>
                        </div>
                    </div>
                )}
              </CardContent>
              <CardFooter className="flex-col space-y-2">
                 <Button onClick={nextStep} disabled={!canProceedToStep3} className="w-full">
                    Next: Review & Payment <ChevronRight className="h-4 w-4 ml-2" />
                 </Button>
                 <Button onClick={prevStep} variant="outline" className="w-full">
                    Back to Customer <ChevronLeft className="h-4 w-4 mr-2" />
                 </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      )}

      {/* Step 3: Review & Payment (Placeholder) */}
      {currentStep === 3 && (
        <Card className="shadow-md">
          <CardHeader><CardTitle>Step 3: Review Order & Payment</CardTitle></CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Order summary and payment options will appear here.</p>
             {/* Display orderItems summary again */}
             <div className="mt-4 space-y-2">
                <h3 className="font-semibold">Order Items:</h3>
                {orderItems.map(item => (
                    <div key={item.variantId} className="flex justify-between text-sm p-2 border-b">
                        <span>{item.productName} ({item.variantName}) x {item.quantity}</span>
                        <span>${item.totalPrice.toFixed(2)}</span>
                    </div>
                ))}
                <div className="flex justify-between font-bold text-md pt-2">
                    <span>Subtotal:</span>
                    <span>${calculateSubtotal().toFixed(2)}</span>
                </div>
            </div>
            {/* Placeholder for payment details form */}
          </CardContent>
          <CardFooter className="justify-between">
             <Button onClick={prevStep} variant="outline">
                <ChevronLeft className="h-4 w-4 mr-2" /> Back to Items
             </Button>
            <Button disabled>Place Order (Not Implemented)</Button>
          </CardFooter>
        </Card>
      )}

       {/* Step 4: Confirmation & Invoice (Placeholder) */}
      {currentStep === 4 && (
        <Card className="shadow-md">
          <CardHeader><CardTitle>Step 4: Order Confirmation</CardTitle></CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Order confirmation details and invoice options will appear here.</p>
          </CardContent>
           <CardFooter className="justify-between">
             <Button onClick={() => {router.push('/orders')}} variant="outline">
                Back to Orders List
             </Button>
            <Button onClick={() => {setCurrentStep(1); setOrderItems([]); /* Reset other states */}} >
                Create New Order <PlusCircle className="h-4 w-4 ml-2" />
             </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
