
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
  ChevronLeft, ChevronRight, PlusCircle, Trash2, Search as SearchIcon, UserPlus, Building, ShoppingCart, Loader2, X, Edit2, Edit
} from "lucide-react";
import {
  fetchUserById, createUser, type CreateUserRequest, type UserDto,
  searchUserByPhone, searchUsersByName,
  fetchBusinessProfileById, createBusinessProfile, type CreateBusinessProfileRequest, type BusinessProfileDto,
  searchBusinessProfileByGstin, searchBusinessProfilesByName, createBusinessProfileWithUser, type CreateBusinessProfileWithUserRequest,
  searchProductsFuzzy, type ProductSearchResultDto, type ProductDto, fetchProductById, type ProductVariantDto,
  quickCreateProduct, type QuickCreateProductRequest, type QuickCreateProductResponse,
  createOrder, type CreateOrderRequest, type OrderItemRequest, type CustomerDetailsDto, type AddressCreateDto, type AddressDto as ApiAddressDto,
  type Page
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
  unitPrice: z.coerce.number().min(0.01, "Unit Price (GST-Inclusive) must be greater than 0"),
});
type QuickProductCreateDialogValues = z.infer<typeof quickProductCreateDialogSchema>;


export interface OrderItemDisplay {
  productId: string;
  variantId: string;
  productName: string;
  variantName: string; // e.g., "Red / S"
  hsnCode?: string | null;
  quantity: number;
  mrp: number; // GST-INCLUSIVE MRP
  discountRate: number; // percentage
  discountAmount: number; // calculated (on pre-GST value): (preTaxMrp * (discountRate/100))
  sellingPrice: number; // GST-INCLUSIVE selling price per unit (user input or derived)
  unitPrice: number; // PRE-TAX selling price per unit (for API payload & internal calcs)
  gstTaxRate: number; // percentage from select
  gstAmount: number; // calculated total GST for the line item: (unitPrice * quantity) * (gstTaxRate / 100)
  igstAmount: number;
  sgstAmount: number;
  cgstAmount: number;
  finalItemPrice: number; // calculated: sellingPrice (inclusive) * quantity
}

const SELLER_STATE_CODE = "KA"; 
const STANDARD_GST_RATES = [0, 5, 12, 18, 28];
const DEFAULT_GST_FOR_QUICK_CREATE = 18;

interface EditPricingModalState {
  isOpen: boolean;
  item: OrderItemDisplay | null;
  tempQuantityString: string;
  tempMrpString: string; // GST-Inclusive MRP as string
  tempDiscountRateString: string;
  tempSellingPriceString: string; // GST-INCLUSIVE Selling Price as string
  tempGstTaxRate: number;
  previousGstRateInModal: number;
}

const initialEditPricingModalState: EditPricingModalState = {
  isOpen: false,
  item: null,
  tempQuantityString: "1",
  tempMrpString: "0.00",
  tempDiscountRateString: "0.00",
  tempSellingPriceString: "0.00",
  tempGstTaxRate: 0,
  previousGstRateInModal: 0,
};

export default function CreateOrderPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = React.useState(1);
  const [customerType, setCustomerType] = React.useState<"B2C" | "B2B">("B2C");

  const [phoneSearch, setPhoneSearch] = React.useState("");
  const [userNameSearch, setUserNameSearch] = React.useState("");
  const [gstinSearch, setGstinSearch] = React.useState("");
  const [businessNameSearch, setBusinessNameSearch] = React.useState("");

  const [searchedUsers, setSearchedUsers] = React.useState<UserDto[]>([]);
  const [searchedBusinessProfiles, setSearchedBusinessProfiles] = React.useState<BusinessProfileDto[]>([]);
  
  const [selectedUserDisplay, setSelectedUserDisplay] = React.useState<UserDto | null>(null);
  const [foundBusinessProfile, setFoundBusinessProfile] = React.useState<BusinessProfileDto | null>(null);
  const [selectedUserId, setSelectedUserId] = React.useState<string | null>(null); // Ensure string
  const [selectedBusinessProfileId, setSelectedBusinessProfileId] = React.useState<string | null>(null); // Ensure string

  const [customerStateCode, setCustomerStateCode] = React.useState<string | null>(SELLER_STATE_CODE);

  const [isSearchingUser, setIsSearchingUser] = React.useState(false);
  const [isSearchingUserByName, setIsSearchingUserByName] = React.useState(false);
  const [isSearchingBp, setIsSearchingBp] = React.useState(false);
  const [isSearchingBpByName, setIsSearchingBpByName] = React.useState(false);
  const [isUserCreateSubmitting, setIsUserCreateSubmitting] = React.useState(false);
  const [isBpWithUserCreateSubmitting, setIsBpWithUserCreateSubmitting] = React.useState(false);
  const [showUserCreateDialog, setShowUserCreateDialog] = React.useState(false);
  const [showBpWithUserCreateDialog, setShowBpWithUserCreateDialog] = React.useState(false);

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

  const [editPricingModal, setEditPricingModal] = React.useState<EditPricingModalState>(initialEditPricingModalState);
  
  const [orderNotes, setOrderNotes] = React.useState("");
  const [paymentMethod, setPaymentMethod] = React.useState("PENDING");


  const userCreateForm = useForm<UserCreateDialogValues>({ resolver: zodResolver(userCreateDialogSchema) });
  const bpWithUserCreateForm = useForm<BpWithUserCreateDialogValues>({ resolver: zodResolver(bpWithUserCreateDialogSchema) });
  const quickProductCreateForm = useForm<QuickProductCreateDialogValues>({ resolver: zodResolver(quickProductCreateDialogSchema) });

  const [isSubmittingOrder, setIsSubmittingOrder] = React.useState(false);

  React.useEffect(() => {
    let determinedStateCode: string | null = null;
    let targetAddresses: ApiAddressDto[] = [];

    if (customerType === "B2C" && selectedUserDisplay?.addresses) {
        targetAddresses = selectedUserDisplay.addresses;
    } else if (customerType === "B2B" && foundBusinessProfile?.addresses) {
        targetAddresses = foundBusinessProfile.addresses;
    }

    const defaultBilling = targetAddresses.find(a => a.isDefault && a.type === "BILLING");
    const anyBilling = targetAddresses.find(a => a.type === "BILLING");
    const firstAddress = targetAddresses.length > 0 ? targetAddresses[0] : null;

    const stateFromAddress = defaultBilling?.state || anyBilling?.state || firstAddress?.state || null;
    
    const newCustomerStateCode = stateFromAddress || SELLER_STATE_CODE;
    setCustomerStateCode(newCustomerStateCode); 
    
    if (orderItems.length > 0) {
      setOrderItems(prevItems => prevItems.map(item => {
        const preTaxTotalForLine = item.unitPrice * item.quantity;
        const lineGstAmount = preTaxTotalForLine * (item.gstTaxRate / 100);
        return {
          ...item,
          gstAmount: lineGstAmount,
          igstAmount: (newCustomerStateCode !== SELLER_STATE_CODE) ? lineGstAmount : 0,
          sgstAmount: (newCustomerStateCode === SELLER_STATE_CODE) ? lineGstAmount / 2 : 0,
          cgstAmount: (newCustomerStateCode === SELLER_STATE_CODE) ? lineGstAmount / 2 : 0,
        };
      }));
    }
  }, [selectedUserDisplay, foundBusinessProfile, customerType, orderItems.length]); // Added orderItems.length


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

  const handleUserNameSearch = async () => {
    if (!userNameSearch.trim()) return;
    setIsSearchingUserByName(true);
    setSearchedUsers([]);
    setSelectedUserId(null);
    setSelectedUserDisplay(null);
    try {
      const usersPage = await searchUsersByName(userNameSearch.trim());
      setSearchedUsers(usersPage.content);
      if (usersPage.content.length === 0) {
         toast({ title: "Info", description: "No users found by that name. Try phone search or create new.", variant: "default" });
         setShowUserCreateDialog(true); // Prompt to create if not found by name either
         userCreateForm.setValue("name", userNameSearch.trim());
         userCreateForm.setValue("phone", ""); // Clear phone if name search led here
      }
    } catch (error: any) {
      toast({ title: "Error Searching User by Name", description: error.message || "Failed to search user.", variant: "destructive" });
    } finally {
      setIsSearchingUserByName(false);
    }
  };

  const handleSelectUserFromList = (user: UserDto) => {
    setSelectedUserId(user.id); // ID is string
    setSelectedUserDisplay(user);
    setSearchedUsers([]);
    setPhoneSearch("");
    setUserNameSearch("");
  };

  const handleBusinessProfileSearch = async () => {
    if (!gstinSearch) return;
    setIsSearchingBp(true);
    setSearchedBusinessProfiles([]);
    setFoundBusinessProfile(null);
    setSelectedBusinessProfileId(null);
    setSelectedUserId(null); 
    setSelectedUserDisplay(null);
    try {
      const bp = await searchBusinessProfileByGstin(gstinSearch);
      if (bp && bp.id) {
        // setSearchedBusinessProfiles([bp]); // API returns single object or null, not array
        handleSelectBusinessProfileFromList(bp); // Directly select if found
      } else {
        setShowBpWithUserCreateDialog(true);
        bpWithUserCreateForm.setValue("bpGstin", gstinSearch);
      }
    } catch (error: any) {
      toast({ title: "Error Searching BP by GSTIN", description: error.message || "Failed to search business profile.", variant: "destructive" });
    } finally {
      setIsSearchingBp(false);
    }
  };
  
  const handleBusinessNameSearch = async () => {
    if (!businessNameSearch.trim()) return;
    setIsSearchingBpByName(true);
    setSearchedBusinessProfiles([]);
    setFoundBusinessProfile(null);
    setSelectedBusinessProfileId(null);
    setSelectedUserId(null);
    setSelectedUserDisplay(null);
    try {
      const bpPage = await searchBusinessProfilesByName(businessNameSearch.trim());
      setSearchedBusinessProfiles(bpPage.content);
      if (bpPage.content.length === 0) {
        toast({ title: "Info", description: "No business profiles found by that name. Try GSTIN search or create new.", variant: "default" });
        setShowBpWithUserCreateDialog(true); // Prompt to create if not found by name
        bpWithUserCreateForm.setValue("bpName", businessNameSearch.trim());
        bpWithUserCreateForm.setValue("bpGstin", ""); // Clear GSTIN
      }
    } catch (error: any) {
      toast({ title: "Error Searching BP by Name", description: error.message || "Failed to search business profile.", variant: "destructive" });
    } finally {
      setIsSearchingBpByName(false);
    }
  };

  const handleSelectBusinessProfileFromList = async (bp: BusinessProfileDto) => {
    setFoundBusinessProfile(bp);
    setSelectedBusinessProfileId(bp.id); // ID is string
    if (bp.userIds && bp.userIds.length > 0 && bp.userIds[0]) {
      try {
        const user = await fetchUserById(bp.userIds[0]); // userId is string
        setSelectedUserDisplay(user);
        if (user && user.id) setSelectedUserId(user.id); // userId is string
      } catch (userError: any) {
         toast({ title: "Warning", description: `Could not fetch primary user for BP: ${userError.message}`, variant: "default" });
      }
    } else {
      toast({ title: "Info", description: "Business profile selected, but no primary user linked. Order can proceed, or link user via BP Management.", variant: "default", duration: 7000 });
    }
    setSearchedBusinessProfiles([]);
    setGstinSearch("");
    setBusinessNameSearch("");
  };


  const handleCreateUserDialogSubmit = async (data: UserCreateDialogValues) => {
    setIsUserCreateSubmitting(true);
    try {
      const newUser = await createUser({ name: data.name, phone: data.phone, email: data.email || undefined, status: 'ACTIVE' });
      setSelectedUserDisplay(newUser);
      if (newUser && newUser.id) setSelectedUserId(newUser.id); // ID is string
      setShowUserCreateDialog(false);
      userCreateForm.reset();
      setPhoneSearch("");
      setUserNameSearch("");
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
      if (response && response.id) setSelectedBusinessProfileId(response.id); // ID is string

      const createdUserInResponse = response.user;
      if (createdUserInResponse && createdUserInResponse.id) {
        setSelectedUserDisplay(createdUserInResponse);
        setSelectedUserId(createdUserInResponse.id); // ID is string
      } else if (response.userIds && response.userIds.length > 0 && response.userIds[0]) {
        const user = await fetchUserById(response.userIds[0]); // userId is string
        setSelectedUserDisplay(user);
        if (user && user.id) setSelectedUserId(user.id); // ID is string
      }
      setShowBpWithUserCreateDialog(false);
      bpWithUserCreateForm.reset();
      setGstinSearch("");
      setBusinessNameSearch("");
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
      const resultsPage: Page<ProductSearchResultDto> = await searchProductsFuzzy(productSearchQuery, 0, 20);
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


  const handleSelectSearchedProduct = async (productId: string) => { // ID is string
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

    const inclusiveUnitPriceFromForm = data.unitPrice; 
    const gstRateForQuickCreate = DEFAULT_GST_FOR_QUICK_CREATE;
    
    const preTaxUnitPriceForApi = gstRateForQuickCreate > 0
        ? inclusiveUnitPriceFromForm / (1 + (gstRateForQuickCreate / 100))
        : inclusiveUnitPriceFromForm;
    
    const payload: QuickCreateProductRequest = {
      name: data.name,
      brandName: data.brandName,
      categoryName: data.categoryName,
      colorVariants: data.colors.split(',').map(c => c.trim()).filter(Boolean),
      sizeVariants: data.sizes.split(',').map(s => s.trim()).filter(Boolean),
      unitPrice: preTaxUnitPriceForApi, 
    };

    try {
      const responseProduct = await quickCreateProduct(payload);
      setShowQuickProductDialog(false);
      quickProductCreateForm.reset();
      toast({ title: "Success", description: `Product "${responseProduct.name}" created quickly.` });

      if (responseProduct.id && responseProduct.variants && responseProduct.variants.length > 0 && responseProduct.variants[0]?.id) {
        const newVariant = responseProduct.variants[0];
        const variantGstRate = responseProduct.gstTaxRate ?? DEFAULT_GST_FOR_QUICK_CREATE;
        
        const variantInclusiveSellingPrice = inclusiveUnitPriceFromForm; // Use the user-inputted inclusive price
        const variantPreTaxSellingPrice = preTaxUnitPriceForApi;

        const variantInclusiveMrp = variantInclusiveSellingPrice; // Default MRP to selling price

        const preTaxMrpForCalc = variantPreTaxSellingPrice; // Since MRP is same as selling price here
        const discountAmountPerUnit = 0; // No discount on quick add
        const discountRate = 0;

        const linePreTaxTotal = variantPreTaxSellingPrice * 1;
        const lineGstAmount = linePreTaxTotal * (variantGstRate / 100);
        const derivedCustomerState = customerStateCode || SELLER_STATE_CODE;

        const newItem: OrderItemDisplay = {
          productId: responseProduct.id,
          variantId: newVariant.id,
          productName: responseProduct.name ?? "Unknown Product",
          variantName: `${newVariant.color || ''}${newVariant.color && newVariant.size ? ' / ' : ''}${newVariant.size || ''}`.trim() || 'Default',
          hsnCode: responseProduct.hsnCode,
          quantity: 1,
          mrp: variantInclusiveMrp, 
          discountRate: discountRate,
          discountAmount: discountAmountPerUnit, 
          sellingPrice: variantInclusiveSellingPrice,
          unitPrice: variantPreTaxSellingPrice, 
          gstTaxRate: variantGstRate,
          gstAmount: lineGstAmount, 
          igstAmount: derivedCustomerState !== SELLER_STATE_CODE ? lineGstAmount : 0,
          sgstAmount: derivedCustomerState === SELLER_STATE_CODE ? lineGstAmount / 2 : 0,
          cgstAmount: derivedCustomerState === SELLER_STATE_CODE ? lineGstAmount / 2 : 0,
          finalItemPrice: variantInclusiveSellingPrice * 1,
        };
        setOrderItems(prevItems => [...prevItems, newItem]);
        setSelectedProductForDetails(null); setSelectedVariant(null); setSelectedQuantity(1);
        setProductSearchQuery(""); setProductSearchResults([]);
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
    const productGstRate = selectedProductForDetails.gstTaxRate ?? 0;
  
    const variantInclusiveSellingPrice = selectedVariant.sellingPrice ?? selectedVariant.price ?? 0;
    const variantInclusiveMrp = selectedVariant.mrp ?? selectedVariant.compareAtPrice ?? variantInclusiveSellingPrice;

    const preTaxSellingPriceForCalc = productGstRate > 0 ? variantInclusiveSellingPrice / (1 + (productGstRate / 100)) : variantInclusiveSellingPrice;
    const preTaxMrpForCalc = productGstRate > 0 ? variantInclusiveMrp / (1 + (productGstRate / 100)) : variantInclusiveMrp;

    const discountAmountPerUnit = preTaxMrpForCalc - preTaxSellingPriceForCalc;
    const discountRate = preTaxMrpForCalc > 0 ? (discountAmountPerUnit / preTaxMrpForCalc) * 100 : 0;
    
    if (existingItemIndex > -1) {
      const updatedItems = [...orderItems];
      const currentItem = updatedItems[existingItemIndex];
      const newQuantity = currentItem.quantity + selectedQuantity;
      
      currentItem.quantity = newQuantity;
      currentItem.finalItemPrice = currentItem.sellingPrice * newQuantity; 
      currentItem.discountAmount = ( (currentMediaItem.mrp / (1 + currentItem.gstTaxRate/100)) - currentItem.unitPrice) * newQuantity; 
      currentItem.gstAmount = (currentItem.sellingPrice / (1 + currentItem.gstTaxRate / 100)) * newQuantity * (currentItem.gstTaxRate / 100);


      const derivedCustomerState = customerStateCode || SELLER_STATE_CODE;
      currentItem.igstAmount = (derivedCustomerState !== SELLER_STATE_CODE) ? currentItem.gstAmount : 0;
      currentItem.sgstAmount = (derivedCustomerState === SELLER_STATE_CODE) ? currentItem.gstAmount / 2 : 0;
      currentItem.cgstAmount = (derivedCustomerState === SELLER_STATE_CODE) ? currentItem.gstAmount / 2 : 0;

      setOrderItems(updatedItems);
    } else {
      const linePreTaxTotal = preTaxSellingPriceForCalc * selectedQuantity;
      const lineGstAmount = linePreTaxTotal * (productGstRate / 100);
      const lineFinalPrice = variantInclusiveSellingPrice * selectedQuantity;
      const lineDiscountAmountTotal = discountAmountPerUnit * selectedQuantity;
      const derivedCustomerState = customerStateCode || SELLER_STATE_CODE;

      const newItem: OrderItemDisplay = {
        productId: selectedProductForDetails.id,
        variantId: selectedVariant.id,
        productName: selectedProductForDetails.name ?? "Unknown Product",
        variantName: `${selectedVariant.color || ''}${selectedVariant.color && selectedVariant.size ? ' / ' : ''}${selectedVariant.size || ''}`.trim() || 'Default',
        hsnCode: selectedProductForDetails.hsnCode,
        quantity: selectedQuantity,
        mrp: variantInclusiveMrp, 
        discountRate: discountRate,
        discountAmount: lineDiscountAmountTotal,
        sellingPrice: variantInclusiveSellingPrice, 
        unitPrice: preTaxSellingPriceForCalc, 
        gstTaxRate: productGstRate,
        gstAmount: lineGstAmount,
        igstAmount: (derivedCustomerState !== SELLER_STATE_CODE) ? lineGstAmount : 0,
        sgstAmount: (derivedCustomerState === SELLER_STATE_CODE) ? lineGstAmount / 2 : 0,
        cgstAmount: (derivedCustomerState === SELLER_STATE_CODE) ? lineGstAmount / 2 : 0,
        finalItemPrice: lineFinalPrice,
      };
      setOrderItems(prevItems => [...prevItems, newItem]);
    }
  
    setSelectedProductForDetails(null); setSelectedVariant(null); setSelectedQuantity(1);
    setProductSearchQuery(""); setProductSearchResults([]);
    toast({ title: "Item Added", description: `${selectedProductForDetails.name} added to order.`});
  };

  const handleRemoveOrderItem = (variantIdToRemove: string) => { // ID is string
    setOrderItems(prevItems => prevItems.filter(item => item.variantId !== variantIdToRemove));
  };
  
  const updateOrderItemPricing = (
    variantId: string, // ID is string
    updates: {
      quantity: number;
      mrp: number; // GST-INCLUSIVE MRP from modal
      discountRate: number; 
      sellingPrice: number; // GST-INCLUSIVE Selling Price from modal
      gstTaxRate: number;
    }
  ) => {
    setOrderItems(prevItems =>
      prevItems.map(item => {
        if (item.variantId === variantId) {
          const { quantity, mrp: inclusiveMrpFromModal, discountRate: newDiscountRate, sellingPrice: inclusiveSellingPriceFromModal, gstTaxRate: newGstTaxRate } = updates;
          
          const preTaxSellingPrice = newGstTaxRate > 0 ? inclusiveSellingPriceFromModal / (1 + (newGstTaxRate / 100)) : inclusiveSellingPriceFromModal;
          const preTaxMrp = newGstTaxRate > 0 ? inclusiveMrpFromModal / (1 + (newGstTaxRate / 100)) : inclusiveMrpFromModal;
          
          const actualDiscountAmountPerUnit = preTaxMrp - preTaxSellingPrice; // Discount on pre-tax
          const lineDiscountAmountTotal = actualDiscountAmountPerUnit * quantity;

          const totalGstAmountForLine = preTaxSellingPrice * quantity * (newGstTaxRate / 100);
          const finalItemPriceForLine = inclusiveSellingPriceFromModal * quantity;
          const derivedCustomerState = customerStateCode || SELLER_STATE_CODE;

          return {
            ...item,
            quantity,
            mrp: inclusiveMrpFromModal, 
            discountRate: newDiscountRate, 
            discountAmount: lineDiscountAmountTotal, // Total discount for the line
            sellingPrice: inclusiveSellingPriceFromModal, 
            unitPrice: preTaxSellingPrice, 
            gstTaxRate: newGstTaxRate,
            gstAmount: totalGstAmountForLine,
            finalItemPrice: finalItemPriceForLine,
            igstAmount: (derivedCustomerState !== SELLER_STATE_CODE) ? totalGstAmountForLine : 0,
            sgstAmount: (derivedCustomerState === SELLER_STATE_CODE) ? totalGstAmountForLine / 2 : 0,
            cgstAmount: (derivedCustomerState === SELLER_STATE_CODE) ? totalGstAmountForLine / 2 : 0,
          };
        }
        return item;
      })
    );
  };


  const openEditPricingModal = (itemToEdit: OrderItemDisplay) => {
    setEditPricingModal({
      isOpen: true,
      item: itemToEdit,
      tempQuantityString: itemToEdit.quantity.toString(),
      tempMrpString: itemToEdit.mrp.toFixed(2), 
      tempDiscountRateString: itemToEdit.discountRate.toFixed(2),
      tempSellingPriceString: itemToEdit.sellingPrice.toFixed(2), 
      tempGstTaxRate: itemToEdit.gstTaxRate,
      previousGstRateInModal: itemToEdit.gstTaxRate,
    });
  };

  const handleSavePricingModal = () => {
    if (!editPricingModal.item) return;

    const quantity = parseInt(editPricingModal.tempQuantityString) || 1;
    const inclusiveMrp = parseFloat(editPricingModal.tempMrpString) || 0;
    const discountRate = parseFloat(editPricingModal.tempDiscountRateString) || 0;
    const inclusiveSellingPrice = parseFloat(editPricingModal.tempSellingPriceString) || 0;
    const gstTaxRate = editPricingModal.tempGstTaxRate;
    
    updateOrderItemPricing(editPricingModal.item.variantId, {
      quantity,
      mrp: inclusiveMrp,
      discountRate: discountRate,
      sellingPrice: inclusiveSellingPrice,
      gstTaxRate,
    });
    setEditPricingModal(initialEditPricingModalState);
  };
  
  const handleOrderItemQuantityChangeStep2 = (variantId: string, newQuantity: number) => { // ID is string
    setOrderItems(prevItems =>
     prevItems.map(item => {
       if (item.variantId === variantId) {
         const qty = Math.max(1, newQuantity);
         const inclusiveSellingPrice = item.sellingPrice; // This is GST-inclusive
         const gstRate = item.gstTaxRate;
         const preTaxSellingPrice = gstRate > 0 ? inclusiveSellingPrice / (1 + gstRate / 100) : inclusiveSellingPrice;
         
         const inclusiveMrp = item.mrp;
         const preTaxMrp = gstRate > 0 ? inclusiveMrp / (1 + gstRate / 100) : inclusiveMrp;

         const discountAmountPerUnit = preTaxMrp - preTaxSellingPrice;

         const lineDiscountAmountTotal = discountAmountPerUnit * qty;
         const totalGstAmountForLine = preTaxSellingPrice * qty * (gstRate / 100);
         const finalItemPriceForLine = inclusiveSellingPrice * qty; 
         const derivedCustomerState = customerStateCode || SELLER_STATE_CODE;

         return {
           ...item,
           quantity: qty,
           discountAmount: lineDiscountAmountTotal,
           gstAmount: totalGstAmountForLine,
           finalItemPrice: finalItemPriceForLine,
           igstAmount: (derivedCustomerState !== SELLER_STATE_CODE) ? totalGstAmountForLine : 0,
           sgstAmount: (derivedCustomerState === SELLER_STATE_CODE) ? totalGstAmountForLine / 2 : 0,
           cgstAmount: (derivedCustomerState === SELLER_STATE_CODE) ? totalGstAmountForLine / 2 : 0,
         };
       }
       return item;
     })
   );
  };

  const calculateOrderSubtotalPreTax = (): number => {
    return orderItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  };
  const calculateTotalLineDiscountPreTax = (): number => {
    return orderItems.reduce((sum, item) => sum + item.discountAmount, 0);
  }
  const calculateTotalOrderGst = (): number => {
    return orderItems.reduce((sum, item) => sum + item.gstAmount, 0);
  };
  const calculateGrandTotal = (): number => {
    return orderItems.reduce((sum, item) => sum + item.finalItemPrice, 0);
  };

  const nextStep = () => setCurrentStep(prev => prev + 1);
  const prevStep = () => setCurrentStep(prev => prev - 1);

  const canProceedToStep2 = selectedUserId !== null || (customerType === 'B2B' && selectedBusinessProfileId !== null);
  const canProceedToStep3Pricing = orderItems.length > 0;
  const canProceedToStep4Review = orderItems.length > 0;


  const handleSubmitOrder = async () => {
    if (!selectedUserId) {
      toast({ title: "Error", description: "Customer selection is required to place an order.", variant: "destructive" });
      return;
    }
    if (orderItems.length === 0) {
      toast({ title: "Error", description: "Order items are required.", variant: "destructive" });
      return;
    }

    let finalBillingAddress: AddressCreateDto | null = null;
    let finalShippingAddress: AddressCreateDto | null = null;
    let targetAddresses: ApiAddressDto[] = [];

    if (customerType === 'B2C' && selectedUserDisplay?.addresses) {
        targetAddresses = selectedUserDisplay.addresses;
    } else if (customerType === 'B2B' && foundBusinessProfile?.addresses) {
        targetAddresses = foundBusinessProfile.addresses;
    }

    const defaultBilling = targetAddresses.find(a => a.isDefault && a.type === "BILLING");
    const anyBilling = targetAddresses.find(a => a.type === "BILLING");
    const defaultShipping = targetAddresses.find(a => a.isDefault && a.type === "SHIPPING");
    const anyShipping = targetAddresses.find(a => a.type === "SHIPPING");
    const firstAddress = targetAddresses.length > 0 ? targetAddresses[0] : null;

    const getAddressCreateDto = (addr?: ApiAddressDto | null): AddressCreateDto | null => {
        if (!addr) return null;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, ...rest } = addr; 
        return rest;
    };

    finalBillingAddress = getAddressCreateDto(defaultBilling || anyBilling || firstAddress);
    finalShippingAddress = getAddressCreateDto(defaultShipping || anyShipping || firstAddress || finalBillingAddress);

    if (!finalBillingAddress) {
        toast({ title: "Error", description: "Billing address is required. Please add/select an address for the customer/business.", variant: "destructive", duration: 7000 });
        return;
    }
    if (!finalShippingAddress) {
        finalShippingAddress = finalBillingAddress;
    }

    const customerDetailsPayload: CustomerDetailsDto = {
      userId: selectedUserId,
      name: selectedUserDisplay?.name || undefined,
      phone: selectedUserDisplay?.phone || undefined,
      email: selectedUserDisplay?.email || undefined,
      billingAddress: finalBillingAddress,
      shippingAddress: finalShippingAddress,
      stateCode: customerStateCode || SELLER_STATE_CODE,
    };

    if (customerType === 'B2B' && foundBusinessProfile) {
      customerDetailsPayload.businessProfileId = foundBusinessProfile.id; // ID is string
      customerDetailsPayload.companyName = foundBusinessProfile.name;
      customerDetailsPayload.gstin = foundBusinessProfile.gstin;
    }

    const orderPayload: CreateOrderRequest = {
      placedByUserId: selectedUserId!, // ID is string
      businessProfileId: customerType === 'B2B' && selectedBusinessProfileId ? selectedBusinessProfileId : undefined, // ID is string
      customerDetails: customerDetailsPayload,
      items: orderItems.map(item => {
        const variantParts = item.variantName.split(' / ');
        const color = variantParts[0]?.trim() || undefined;
        const size = variantParts[1]?.trim() || undefined;
        
        const perUnitPreTaxDiscount = item.mrp / (1 + item.gstTaxRate/100) - item.unitPrice;

        return {
            productId: item.productId, // ID is string
            variantId: item.variantId, // ID is string
            size: size,
            color: color,
            quantity: item.quantity,
            unitPrice: item.unitPrice, // This is pre-tax selling price
            discountRate: parseFloat(item.discountRate.toFixed(2)),
            discountAmount: parseFloat(perUnitPreTaxDiscount.toFixed(2)), 
            hsnCode: item.hsnCode,
            gstTaxRate: item.gstTaxRate,
        };
      }),
      paymentMethod: paymentMethod || "PENDING",
      status: "PENDING", 
      notes: orderNotes || undefined,
    };

    try {
      setIsSubmittingOrder(true);
      const createdOrder = await createOrder(orderPayload);
      toast({ title: "Success", description: `Order ${createdOrder.id} created successfully!` });
      router.push('/orders');
    } catch (error: any) {
      toast({ title: "Error Creating Order", description: error.message || "Failed to create order.", variant: "destructive" });
    } finally {
      setIsSubmittingOrder(false);
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
        <h1 className="text-xl md:text-2xl font-bold tracking-tight">Create New Order - Step {currentStep} of 4</h1>
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
              setPhoneSearch(""); setGstinSearch(""); setUserNameSearch(""); setBusinessNameSearch("");
              setSearchedUsers([]); setSearchedBusinessProfiles([]);
              setCustomerStateCode(SELLER_STATE_CODE); 
            }} className="flex gap-4">
              <div className="flex items-center space-x-2"><RadioGroupItem value="B2C" id="r_b2c" /><Label htmlFor="r_b2c">Retail Customer (B2C)</Label></div>
              <div className="flex items-center space-x-2"><RadioGroupItem value="B2B" id="r_b2b" /><Label htmlFor="r_b2b">Business Customer (B2B)</Label></div>
            </RadioGroup>

            {customerType === 'B2C' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone_search">Search by Phone</Label>
                    <div className="flex gap-2 mt-1">
                      <Input id="phone_search" value={phoneSearch} onChange={e => setPhoneSearch(e.target.value)} placeholder="Enter phone number" />
                      <Button onClick={handleUserSearch} disabled={isSearchingUser || !phoneSearch} className="shrink-0">
                        {isSearchingUser ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : <SearchIcon className="mr-2 h-4 w-4" />} Search
                      </Button>
                    </div>
                  </div>
                   <div>
                    <Label htmlFor="user_name_search">Search by User Name</Label>
                    <div className="flex gap-2 mt-1">
                      <Input id="user_name_search" value={userNameSearch} onChange={e => setUserNameSearch(e.target.value)} placeholder="Enter user name" />
                      <Button onClick={handleUserNameSearch} disabled={isSearchingUserByName || !userNameSearch} className="shrink-0">
                        {isSearchingUserByName ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : <SearchIcon className="mr-2 h-4 w-4" />} Search
                      </Button>
                    </div>
                  </div>
                </div>

                {(isSearchingUser || isSearchingUserByName) && <div className="text-sm text-muted-foreground p-2 flex items-center"><Loader2 className="animate-spin mr-2 h-3 w-3"/>Searching users...</div>}

                {searchedUsers.length > 0 && !isSearchingUser && !isSearchingUserByName && (
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
                 {!isSearchingUser && !isSearchingUserByName && searchedUsers.length === 0 && (phoneSearch || userNameSearch) && !selectedUserDisplay && (
                    <Dialog open={showUserCreateDialog} onOpenChange={setShowUserCreateDialog}>
                        <DialogTrigger asChild><Button variant="outline" className="mt-2"><UserPlus className="mr-2 h-4 w-4" />Create New User</Button></DialogTrigger>
                        <DialogContent>
                        <DialogHeader><DialogTitle>Create New User</DialogTitle></DialogHeader>
                        <form onSubmit={userCreateForm.handleSubmit(handleCreateUserDialogSubmit)} className="space-y-4">
                            <Input {...userCreateForm.register("name")} placeholder="Full Name" defaultValue={userNameSearch} />
                            {userCreateForm.formState.errors.name && <p className="text-xs text-destructive">{userCreateForm.formState.errors.name.message}</p>}
                            <Input {...userCreateForm.register("phone")} placeholder="Phone Number" defaultValue={phoneSearch} />
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
                        <div className="flex justify-between items-start">
                            <div>
                                <CardDescription className="font-medium text-green-700">Selected User:</CardDescription>
                                <p className="text-sm text-green-800">{selectedUserDisplay.name} ({selectedUserDisplay.phone})</p>
                                {selectedUserDisplay.email && <p className="text-xs text-green-600">{selectedUserDisplay.email}</p>}
                                <p className="text-xs text-green-600 mt-0.5">Customer State for GST: {customerStateCode || 'N/A (Using Seller State)'}</p>
                            </div>
                            <Button variant="ghost" size="icon" className="h-7 w-7 -mt-1 -mr-1" onClick={() => {setSelectedUserDisplay(null); setSelectedUserId(null);}}>
                                <X className="h-4 w-4 text-green-700"/>
                            </Button>
                        </div>
                    </Card>
                )}
              </div>
            )}

            {customerType === 'B2B' && (
              <div className="space-y-4">
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="gstin_search">Search by GSTIN</Label>
                      <div className="flex gap-2 mt-1">
                        <Input id="gstin_search" value={gstinSearch} onChange={e => setGstinSearch(e.target.value)} placeholder="Enter GSTIN" />
                        <Button onClick={handleBusinessProfileSearch} disabled={isSearchingBp || !gstinSearch} className="shrink-0">
                          {isSearchingBp ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : <Building className="mr-2 h-4 w-4" />} Search
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="bp_name_search">Search by Business Name</Label>
                      <div className="flex gap-2 mt-1">
                        <Input id="bp_name_search" value={businessNameSearch} onChange={e => setBusinessNameSearch(e.target.value)} placeholder="Enter business name" />
                        <Button onClick={handleBusinessNameSearch} disabled={isSearchingBpByName || !businessNameSearch} className="shrink-0">
                          {isSearchingBpByName ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : <Building className="mr-2 h-4 w-4" />} Search
                        </Button>
                      </div>
                    </div>
                 </div>
                 {(isSearchingBp || isSearchingBpByName) && <div className="text-sm text-muted-foreground p-2 flex items-center"><Loader2 className="animate-spin mr-2 h-3 w-3"/>Searching business profiles...</div>}

                {searchedBusinessProfiles.length > 0 && !isSearchingBp && !isSearchingBpByName && (
                  <Card className="mt-2 p-2 bg-secondary/30">
                    <CardDescription className="mb-1 text-xs px-2">Multiple business profiles found. Please select one:</CardDescription>
                    <ScrollArea className="h-40">
                      {searchedBusinessProfiles.map(bp => (
                        <Button key={bp.id} variant="ghost" className="w-full justify-start text-left h-auto py-1.5 px-2 mb-1" onClick={() => handleSelectBusinessProfileFromList(bp)}>
                          {bp.name} ({bp.gstin})
                        </Button>
                      ))}
                    </ScrollArea>
                  </Card>
                )}

                {!isSearchingBp && !isSearchingBpByName && searchedBusinessProfiles.length === 0 && (gstinSearch || businessNameSearch) && !foundBusinessProfile && (
                     <Dialog open={showBpWithUserCreateDialog} onOpenChange={setShowBpWithUserCreateDialog}>
                        <DialogTrigger asChild><Button variant="outline" className="mt-2"><Building className="mr-2 h-4 w-4" /><UserPlus className="mr-1 h-4 w-4"/>Create BP & New User</Button></DialogTrigger>
                        <DialogContent className="max-h-[80vh] overflow-y-auto">
                        <DialogHeader><DialogTitle>Create Business Profile & New User</DialogTitle></DialogHeader>
                        <form onSubmit={bpWithUserCreateForm.handleSubmit(handleBpWithUserCreateDialogSubmit)} className="space-y-3">
                            <Label className="font-medium">Business Profile Details</Label>
                            <Input {...bpWithUserCreateForm.register("bpName")} placeholder="Business Name" defaultValue={businessNameSearch}/>
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
                            <DialogFooter><DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose><Button type="submit" disabled={isBpWithUserCreateSubmitting}>
                              {isBpWithUserCreateSubmitting ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : null}  Create BP & User</Button></DialogFooter>
                        </form>
                        </DialogContent>
                    </Dialog>
                )}
                {foundBusinessProfile && (
                  <Card className="mt-2 p-3 bg-green-50 border-green-200 shadow-sm">
                     <div className="flex justify-between items-start">
                        <div>
                            <CardDescription className="font-medium text-green-700">Selected Business:</CardDescription>
                            <p className="text-sm text-green-800">{foundBusinessProfile.name} ({foundBusinessProfile.gstin})</p>
                            {selectedUserDisplay && <p className="mt-1 text-xs text-green-600">Associated User: {selectedUserDisplay.name} ({selectedUserDisplay.phone})</p>}
                            {!selectedUserDisplay && foundBusinessProfile.userIds && foundBusinessProfile.userIds.length === 0 && <p className="mt-1 text-xs text-orange-600">No primary user linked. Order can proceed, or link user via BP Management.</p>}
                            <p className="text-xs text-green-600 mt-0.5">Customer State for GST: {customerStateCode || 'N/A (Using Seller State)'}</p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 -mt-1 -mr-1" onClick={() => {setFoundBusinessProfile(null); setSelectedBusinessProfileId(null); setSelectedUserDisplay(null); setSelectedUserId(null);}}>
                            <X className="h-4 w-4 text-green-700"/>
                        </Button>
                    </div>
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
                                {product.category && `${product.category}`}
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
                                    <div>
                                      <Label htmlFor="quick_product_unit_price">Unit Price (GST-Inclusive) *</Label>
                                      <Input id="quick_product_unit_price" type="number" step="0.01" {...quickProductCreateForm.register("unitPrice")} placeholder="GST-Inclusive unit price" />
                                    </div>
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
                                            <p className="mt-1">Price: ₹{(variant.sellingPrice ?? variant.price ?? 0).toFixed(2)}</p>
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
                            <TableCell className="py-1 px-2 text-right font-medium">₹{item.finalItemPrice.toFixed(2)}</TableCell>
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
                            <span>Subtotal (Incl. Tax):</span>
                            <span>₹{orderItems.reduce((sum, item) => sum + item.finalItemPrice, 0).toFixed(2)}</span>
                        </div>
                         <p className="text-xs text-muted-foreground text-right">Further adjustments in next step.</p>
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
                <div className="space-y-3">
                    {orderItems.map(item => (
                    <Card key={item.variantId} className="p-3 shadow-sm">
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                            <div className="flex-grow space-y-0.5">
                                <div className="flex justify-between items-baseline">
                                    <p className="font-semibold text-base">{item.productName}</p>
                                    <p className="text-sm">Qty: {item.quantity}</p>
                                </div>
                                <p className="text-xs text-muted-foreground -mt-1">({item.variantName})</p>
                                
                                <div className="mt-1.5 text-xs">
                                  <p>MRP: <span className="font-medium">₹{item.mrp.toFixed(2)}</span> | Disc: <span className="font-medium">{item.discountRate.toFixed(1)}%</span></p>
                                  <p>Unit S.Price (Incl. GST): <span className="font-medium">₹{item.sellingPrice.toFixed(2)}</span></p>
                                  <p>GST Rate: <span className="font-medium">{item.gstTaxRate.toFixed(0)}%</span> | GST Amt: <span className="font-medium">₹{item.gstAmount.toFixed(2)}</span>
                                    <span className="text-muted-foreground text-[10px] ml-1">
                                        ({customerStateCode !== SELLER_STATE_CODE ? `IGST: ₹${item.igstAmount.toFixed(2)}` : `SGST: ₹${item.sgstAmount.toFixed(2)}, CGST: ₹${item.cgstAmount.toFixed(2)}`})
                                    </span>
                                  </p>
                                </div>
                            </div>
                            <div className="flex flex-col items-end justify-between sm:ml-4 shrink-0 space-y-1 sm:space-y-0 mt-2 sm:mt-0 w-full sm:w-auto">
                                <p className="font-semibold text-lg text-right">₹{item.finalItemPrice.toFixed(2)}</p>
                                <Button size="sm" variant="outline" onClick={() => openEditPricingModal(item)} className="mt-1 sm:mt-0 self-end w-full sm:w-auto">
                                    <Edit className="mr-1.5 h-3 w-3" /> Edit Pricing
                                </Button>
                            </div>
                        </div>
                    </Card>
                    ))}
                </div>
                )}
                {orderItems.length > 0 && (
                <div className="mt-6 pt-4 border-t">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                        <p>Subtotal (Excl. Tax):</p><p className="text-right font-medium">₹{calculateOrderSubtotalPreTax().toFixed(2)}</p>
                        <p>Total Discount (on Pre-Tax):</p><p className="text-right font-medium text-green-600">- ₹{calculateTotalLineDiscountPreTax().toFixed(2)}</p>
                        <p>Total GST ({customerStateCode !== SELLER_STATE_CODE ? 'IGST' : 'SGST+CGST'}):</p><p className="text-right font-medium">₹{calculateTotalOrderGst().toFixed(2)}</p>
                        <p className="text-lg font-semibold mt-1">Grand Total (Incl. Tax):</p><p className="text-lg font-semibold text-right mt-1">₹{calculateGrandTotal().toFixed(2)}</p>
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

      {/* Edit Pricing Modal */}
      <Dialog open={editPricingModal.isOpen} onOpenChange={(isOpen) => setEditPricingModal(prev => ({ ...prev, isOpen }))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Pricing: {editPricingModal.item?.productName}</DialogTitle>
            <CardDescription>{editPricingModal.item?.variantName}</CardDescription>
          </DialogHeader>
          {editPricingModal.item && (
            <div className="space-y-3 py-2">
              <div>
                <Label htmlFor="modal_qty">Quantity</Label>
                <Input id="modal_qty" type="number" min="1"
                       value={editPricingModal.tempQuantityString}
                       onChange={(e) => setEditPricingModal(prev => ({ ...prev, tempQuantityString: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="modal_mrp">MRP (₹) (GST-Inclusive)</Label>
                <Input id="modal_mrp" type="text" inputMode="decimal"
                       value={editPricingModal.tempMrpString}
                       onChange={(e) => {
                           const newMrpString = e.target.value;
                           if (/^\d*\.?\d{0,2}$/.test(newMrpString) || newMrpString === "") {
                               const inclusiveMrp = parseFloat(newMrpString) || 0;
                               const currentGstRate = editPricingModal.tempGstTaxRate;
                               const currentDiscountRate = parseFloat(editPricingModal.tempDiscountRateString) || 0;

                               const preTaxMrp = currentGstRate > 0 ? inclusiveMrp / (1 + (currentGstRate / 100)) : inclusiveMrp;
                               const preTaxSellingPrice = preTaxMrp * (1 - (currentDiscountRate / 100));
                               const newInclusiveSellingPrice = preTaxSellingPrice * (1 + (currentGstRate / 100));

                               setEditPricingModal(prev => ({
                                   ...prev,
                                   tempMrpString: newMrpString,
                                   tempSellingPriceString: isNaN(newInclusiveSellingPrice) ? "0.00" : newInclusiveSellingPrice.toFixed(2),
                               }));
                           }
                       }} />
              </div>
              <div>
                <Label htmlFor="modal_discount_rate">Discount Rate (%)</Label>
                <Input id="modal_discount_rate" type="text" inputMode="decimal"
                       value={editPricingModal.tempDiscountRateString}
                       onChange={(e) => {
                           const newDiscRateString = e.target.value;
                            if (/^\d*\.?\d{0,2}$/.test(newDiscRateString) || newDiscRateString === "") {
                               const newDiscountRate = parseFloat(newDiscRateString) || 0;
                               const currentInclusiveMrp = parseFloat(editPricingModal.tempMrpString) || 0;
                               const currentGstRate = editPricingModal.tempGstTaxRate;

                               const preTaxMrp = currentGstRate > 0 ? currentInclusiveMrp / (1 + (currentGstRate / 100)) : currentInclusiveMrp;
                               const preTaxSellingPrice = preTaxMrp * (1 - (newDiscountRate / 100));
                               const newInclusiveSellingPrice = preTaxSellingPrice * (1 + (currentGstRate / 100));

                               setEditPricingModal(prev => ({
                                   ...prev,
                                   tempDiscountRateString: newDiscRateString,
                                   tempSellingPriceString: isNaN(newInclusiveSellingPrice) ? "0.00" : newInclusiveSellingPrice.toFixed(2),
                               }));
                           }
                       }} />
              </div>
               <div>
                <Label htmlFor="modal_selling_price">Selling Price (₹) (GST-Inclusive)</Label>
                <Input id="modal_selling_price" type="text" inputMode="decimal"
                       value={editPricingModal.tempSellingPriceString}
                       onChange={(e) => {
                           const newSellingPriceString = e.target.value;
                           if (/^\d*\.?\d{0,2}$/.test(newSellingPriceString) || newSellingPriceString === "") {
                               const newInclusiveSellingPrice = parseFloat(newSellingPriceString) || 0;
                               const currentInclusiveMrp = parseFloat(editPricingModal.tempMrpString) || 0;
                               const currentGstRate = editPricingModal.tempGstTaxRate;

                               let newDiscountRate = 0;
                               if (currentInclusiveMrp > 0) { // Check if MRP is greater than 0 before calculating discount
                                   const preTaxMrp = currentGstRate > 0 ? currentInclusiveMrp / (1 + (currentGstRate / 100)) : currentInclusiveMrp;
                                   const preTaxSellingPrice = currentGstRate > 0 ? newInclusiveSellingPrice / (1 + (currentGstRate / 100)) : newInclusiveSellingPrice;
                                   if (preTaxSellingPrice <= preTaxMrp && preTaxMrp > 0) { 
                                     const unitDiscount = preTaxMrp - preTaxSellingPrice;
                                     newDiscountRate = (unitDiscount / preTaxMrp) * 100;
                                   }
                               }
                               
                               setEditPricingModal(prev => ({
                                   ...prev,
                                   tempSellingPriceString: newSellingPriceString,
                                   tempDiscountRateString: isNaN(newDiscountRate) ? "0.00" : Math.max(0, Math.min(100, newDiscountRate)).toFixed(2), // Clamp discount rate 0-100
                               }));
                           }
                       }} />
              </div>
              <div>
                <Label htmlFor="modal_gst_rate">GST Rate (%)</Label>
                <Select
                    value={editPricingModal.tempGstTaxRate.toString()}
                    onValueChange={(value) => {
                        const newGstRate = parseInt(value) || 0;
                        const previousGstRateInModal = editPricingModal.previousGstRateInModal; // Use the stored previous rate
                        const currentInclusiveSellingPriceString = editPricingModal.tempSellingPriceString; // Current inclusive selling price from modal state
                        const currentInclusiveSellingPrice = parseFloat(currentInclusiveSellingPriceString) || 0;
                        
                        let preTaxEquivalent = currentInclusiveSellingPrice; // Assume it's pre-tax if old GST was 0
                        if (previousGstRateInModal > 0) { 
                            preTaxEquivalent = currentInclusiveSellingPrice / (1 + (previousGstRateInModal / 100));
                        }
                        
                        const newCalculatedInclusiveSellingPrice = preTaxEquivalent * (1 + (newGstRate / 100));

                        setEditPricingModal(prev => ({
                            ...prev,
                            tempGstTaxRate: newGstRate,
                            tempSellingPriceString: newCalculatedInclusiveSellingPrice.toFixed(2), // Update inclusive selling price
                            previousGstRateInModal: newGstRate, // Store the new rate as previous for next change
                        }));
                    }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STANDARD_GST_RATES.map(rate => <SelectItem key={rate} value={rate.toString()}>{rate}%</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPricingModal(initialEditPricingModalState)}>Cancel</Button>
            <Button onClick={handleSavePricingModal}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Step 4: Final Review & Payment */}
      {currentStep === 4 && (
        <Card className="shadow-md">
          <CardHeader><CardTitle>Step 4: Final Review & Payment</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
                <Card className="p-4 bg-secondary/30">
                    <CardTitle className="text-lg mb-2">Customer Details</CardTitle>
                    {customerType === "B2C" && selectedUserDisplay && (
                        <>
                            <p><span className="font-medium">Name:</span> {selectedUserDisplay.name}</p>
                            <p><span className="font-medium">Phone:</span> {selectedUserDisplay.phone}</p>
                            {selectedUserDisplay.email && <p><span className="font-medium">Email:</span> {selectedUserDisplay.email}</p>}
                        </>
                    )}
                    {customerType === "B2B" && foundBusinessProfile && (
                        <>
                            <p><span className="font-medium">Company:</span> {foundBusinessProfile.name}</p>
                            <p><span className="font-medium">GSTIN:</span> {foundBusinessProfile.gstin}</p>
                            {selectedUserDisplay && <p><span className="font-medium">Contact:</span> {selectedUserDisplay.name} ({selectedUserDisplay.phone})</p>}
                        </>
                    )}
                    <p className="text-sm mt-1"><span className="font-medium">State for GST:</span> {customerStateCode} ({customerStateCode !== SELLER_STATE_CODE ? "Inter-State" : "Intra-State"})</p>
                </Card>

                <div>
                    <h3 className="font-semibold text-lg mb-2">Order Summary:</h3>
                    <div className="space-y-3">
                        {orderItems.map(item => (
                          <Card key={item.variantId} className="p-3 shadow-sm">
                            <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                                <div className="flex-grow space-y-0.5">
                                    <div className="flex justify-between items-baseline">
                                        <p className="font-semibold text-base">{item.productName}</p>
                                        <p className="text-sm">Qty: {item.quantity}</p>
                                    </div>
                                    <p className="text-xs text-muted-foreground -mt-1">({item.variantName})</p>
                                    
                                    <div className="mt-1.5 text-xs">
                                      <p>MRP: <span className="font-medium">₹{item.mrp.toFixed(2)}</span> | Disc: <span className="font-medium">{item.discountRate.toFixed(1)}%</span></p>
                                      <p>Unit S.Price (Incl. GST): <span className="font-medium">₹{item.sellingPrice.toFixed(2)}</span></p>
                                      <p>GST Rate: <span className="font-medium">{item.gstTaxRate.toFixed(0)}%</span> | GST Amt: <span className="font-medium">₹{item.gstAmount.toFixed(2)}</span>
                                        <span className="text-muted-foreground text-[10px] ml-1">
                                            ({customerStateCode !== SELLER_STATE_CODE ? `IGST: ₹${item.igstAmount.toFixed(2)}` : `SGST: ₹${item.sgstAmount.toFixed(2)}, CGST: ₹${item.cgstAmount.toFixed(2)}`})
                                        </span>
                                      </p>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end justify-between sm:ml-4 shrink-0 mt-2 sm:mt-0 w-full sm:w-auto">
                                    <p className="font-semibold text-lg text-right">₹{item.finalItemPrice.toFixed(2)}</p>
                                </div>
                            </div>
                          </Card>
                        ))}
                    </div>
                </div>
                  <div className="mt-4 pt-4 border-t">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                        <p>Subtotal (Excl. Tax):</p><p className="text-right font-medium">₹{calculateOrderSubtotalPreTax().toFixed(2)}</p>
                        <p>Total Discount (on Pre-Tax):</p><p className="text-right font-medium text-green-600">- ₹{calculateTotalLineDiscountPreTax().toFixed(2)}</p>
                        <p>Total GST ({customerStateCode !== SELLER_STATE_CODE ? 'IGST' : 'SGST+CGST'}):</p><p className="text-right font-medium">₹{calculateTotalOrderGst().toFixed(2)}</p>
                        <p className="text-xl font-bold mt-1">Grand Total (Incl. Tax):</p><p className="text-xl font-bold text-right mt-1">₹{calculateGrandTotal().toFixed(2)}</p>
                    </div>
                  </div>
            </div>
            <div className="mt-6 space-y-4">
              <div>
                <Label htmlFor="payment_method">Payment Method</Label>
                <Input id="payment_method" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} placeholder="e.g., CREDIT_CARD, CASH, UPI" />
              </div>
              <div>
                <Label htmlFor="order_notes">Order Notes</Label>
                <Textarea id="order_notes" value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} placeholder="Any special instructions for this order..." />
              </div>
            </div>
          </CardContent>
          <CardFooter className="justify-between mt-6">
             <Button onClick={prevStep} variant="outline">
                <ChevronLeft className="h-4 w-4 mr-2" /> Back to Adjust Pricing
             </Button>
            <Button onClick={handleSubmitOrder} disabled={isSubmittingOrder || orderItems.length === 0}>
               {isSubmittingOrder ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : null}
               Place Order
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
    

    

    
