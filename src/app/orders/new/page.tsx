
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
  searchUserByPhone,
  fetchBusinessProfileById, createBusinessProfile, type CreateBusinessProfileRequest, type BusinessProfileDto,
  searchBusinessProfileByGstin, createBusinessProfileWithUser, type CreateBusinessProfileWithUserRequest,
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
  unitPrice: z.coerce.number().min(0.01, "GST-Inclusive Price must be greater than 0"), // User enters GST-inclusive price
});
type QuickProductCreateDialogValues = z.infer<typeof quickProductCreateDialogSchema>;


export interface OrderItemDisplay {
  productId: string;
  variantId: string;
  productName: string;
  variantName: string; // e.g., "Red / S"
  hsnCode?: string | null;
  quantity: number;
  mrp: number; // GST-INCLUSIVE MRP (user input or from variant)
  discountRate: number; // percentage, applied on pre-tax MRP
  discountAmount: number; // calculated total PRE-TAX discount for the line: (preTaxMrp - unitPrice) * quantity
  sellingPrice: number; // GST-INCLUSIVE selling price (user input or derived)
  unitPrice: number; // PRE-TAX selling price (derived from inclusive sellingPrice, for API payload & internal calcs)
  gstTaxRate: number; // percentage from select
  gstAmount: number; // calculated total GST for the line item: (unitPrice * quantity) * (gstTaxRate / 100)
  igstAmount: number;
  sgstAmount: number;
  cgstAmount: number;
  finalItemPrice: number; // calculated: sellingPrice * quantity (since sellingPrice is GST-inclusive here)
}

const SELLER_STATE_CODE = "KA"; // Example: Karnataka. TODO: Make configurable
const STANDARD_GST_RATES = [0, 5, 12, 18, 28];
const DEFAULT_GST_FOR_QUICK_CREATE = 18; // Used if product doesn't specify a rate

interface EditPricingModalState {
  isOpen: boolean;
  item: OrderItemDisplay | null;
  tempQuantityString: string;
  tempMrpString: string; // Stores GST-inclusive MRP as string
  tempDiscountRateString: string;
  tempSellingPriceString: string; // Stores GST-inclusive Selling Price as string
  tempGstTaxRate: number;
  previousGstRateInModal: number; // To handle GST rate changes correctly
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
  const [gstinSearch, setGstinSearch] = React.useState("");
  const [searchedUsers, setSearchedUsers] = React.useState<UserDto[]>([]);
  const [selectedUserDisplay, setSelectedUserDisplay] = React.useState<UserDto | null>(null);
  const [foundBusinessProfile, setFoundBusinessProfile] = React.useState<BusinessProfileDto | null>(null);
  const [selectedUserId, setSelectedUserId] = React.useState<string | null>(null);
  const [selectedBusinessProfileId, setSelectedBusinessProfileId] = React.useState<string | null>(null);

  const [customerStateCode, setCustomerStateCode] = React.useState<string | null>(SELLER_STATE_CODE);

  const [isSearchingUser, setIsSearchingUser] = React.useState(false);
  const [isSearchingBp, setIsSearchingBp] = React.useState(false);
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

    determinedStateCode = defaultBilling?.state || anyBilling?.state || firstAddress?.state || null;
    
    setCustomerStateCode(determinedStateCode || SELLER_STATE_CODE);
    
    // If customer state changes, re-calculate GST split for all items
    if (orderItems.length > 0 && determinedStateCode) {
      setOrderItems(prevItems => prevItems.map(item => {
        const gstAmount = item.unitPrice * item.quantity * (item.gstTaxRate / 100);
        return {
          ...item,
          gstAmount,
          igstAmount: (determinedStateCode !== SELLER_STATE_CODE) ? gstAmount : 0,
          sgstAmount: (determinedStateCode === SELLER_STATE_CODE) ? gstAmount / 2 : 0,
          cgstAmount: (determinedStateCode === SELLER_STATE_CODE) ? gstAmount / 2 : 0,
        };
      }));
    }

  }, [selectedUserDisplay, foundBusinessProfile, customerType, SELLER_STATE_CODE]);


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
      if (bp && bp.id) {
        setFoundBusinessProfile(bp);
        setSelectedBusinessProfileId(bp.id);
        if (bp.userIds && bp.userIds.length > 0 && bp.userIds[0]) {
          const user = await fetchUserById(bp.userIds[0]); // ID is string
          setSelectedUserDisplay(user);
          if (user && user.id) setSelectedUserId(user.id);
        } else {
           toast({ title: "Info", description: "Business profile found, but no primary user linked. Order can proceed, or link user via BP Management.", variant: "default", duration: 7000 });
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
      if (newUser && newUser.id) setSelectedUserId(newUser.id); // ID is string
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
      if (response && response.id) setSelectedBusinessProfileId(response.id); // ID is string

      const createdUserInResponse = response.user;
      if (createdUserInResponse && createdUserInResponse.id) {
        setSelectedUserDisplay(createdUserInResponse);
        setSelectedUserId(createdUserInResponse.id);
      } else if (response.userIds && response.userIds.length > 0 && response.userIds[0]) {
        const user = await fetchUserById(response.userIds[0]); // ID is string
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


  const handleSelectSearchedProduct = async (productId: string) => {
    setIsLoadingProductDetails(true);
    setSelectedProductForDetails(null);
    setSelectedVariant(null);
    setSelectedQuantity(1);
    try {
      const product = await fetchProductById(productId); // ID is string
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
        
        // Variant price from API (newVariant.sellingPrice or newVariant.price) is pre-tax.
        // Variant MRP from API (newVariant.mrp) is also pre-tax.
        const variantPreTaxSellingPrice = newVariant.sellingPrice ?? newVariant.price ?? preTaxUnitPriceForApi;
        const variantPreTaxMrp = newVariant.mrp ?? variantPreTaxSellingPrice; // Default MRP to selling price if not available

        const inclusiveSellingPrice = variantPreTaxSellingPrice * (1 + (variantGstRate / 100));
        const inclusiveMrp = variantPreTaxMrp * (1 + (variantGstRate / 100));

        const discountAmountPerUnit = variantPreTaxMrp - variantPreTaxSellingPrice;
        const discountRate = variantPreTaxMrp > 0 ? (discountAmountPerUnit / variantPreTaxMrp) * 100 : 0;

        const linePreTaxTotal = variantPreTaxSellingPrice * 1; // For quantity 1
        const lineGstAmount = linePreTaxTotal * (variantGstRate / 100);

        const newItem: OrderItemDisplay = {
          productId: responseProduct.id,
          variantId: newVariant.id,
          productName: responseProduct.name ?? "Unknown Product",
          variantName: `${newVariant.color || ''}${newVariant.color && newVariant.size ? ' / ' : ''}${newVariant.size || ''}`.trim() || 'Default',
          hsnCode: responseProduct.hsnCode,
          quantity: 1,
          mrp: inclusiveMrp,
          discountRate: discountRate,
          discountAmount: discountAmountPerUnit * 1,
          sellingPrice: inclusiveSellingPrice,
          unitPrice: variantPreTaxSellingPrice,
          gstTaxRate: variantGstRate,
          gstAmount: lineGstAmount,
          igstAmount: customerStateCode !== SELLER_STATE_CODE ? lineGstAmount : 0,
          sgstAmount: customerStateCode === SELLER_STATE_CODE ? lineGstAmount / 2 : 0,
          cgstAmount: customerStateCode === SELLER_STATE_CODE ? lineGstAmount / 2 : 0,
          finalItemPrice: inclusiveSellingPrice * 1,
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
  
    // Variant.sellingPrice or price from API is pre-tax
    // Variant.mrp or compareAtPrice from API is pre-tax
    const variantPreTaxSellingPrice = selectedVariant.sellingPrice ?? selectedVariant.price ?? 0;
    const variantPreTaxMrp = selectedVariant.mrp ?? selectedVariant.compareAtPrice ?? variantPreTaxSellingPrice; // Default MRP to selling price

    const inclusiveSellingPrice = variantPreTaxSellingPrice * (1 + (productGstRate / 100));
    const inclusiveMrp = variantPreTaxMrp * (1 + (productGstRate / 100));
  
    const discountAmountPerUnit = variantPreTaxMrp - variantPreTaxSellingPrice;
    const discountRate = variantPreTaxMrp > 0 ? (discountAmountPerUnit / variantPreTaxMrp) * 100 : 0;
    
    if (existingItemIndex > -1) {
      const updatedItems = [...orderItems];
      const currentItem = updatedItems[existingItemIndex];
      const newQuantity = currentItem.quantity + selectedQuantity;
      
      currentItem.quantity = newQuantity;
      // All other calculations (discountAmount, gstAmount, finalItemPrice, etc.) will be updated
      // when updateOrderItemPricing is called (implicitly via modal save or direct quantity change in Step 3).
      // For now, just update quantity. Price display in Step 2 cart is simplified.
      setOrderItems(updatedItems);
    } else {
      const linePreTaxTotal = variantPreTaxSellingPrice * selectedQuantity;
      const lineGstAmount = linePreTaxTotal * (productGstRate / 100);
      const lineFinalPrice = inclusiveSellingPrice * selectedQuantity;
      const lineDiscountAmountTotal = discountAmountPerUnit * selectedQuantity;

      const newItem: OrderItemDisplay = {
        productId: selectedProductForDetails.id,
        variantId: selectedVariant.id,
        productName: selectedProductForDetails.name ?? "Unknown Product",
        variantName: `${selectedVariant.color || ''}${selectedVariant.color && selectedVariant.size ? ' / ' : ''}${selectedVariant.size || ''}`.trim() || 'Default',
        hsnCode: selectedProductForDetails.hsnCode,
        quantity: selectedQuantity,
        mrp: inclusiveMrp, 
        discountRate: discountRate,
        discountAmount: lineDiscountAmountTotal,
        sellingPrice: inclusiveSellingPrice, 
        unitPrice: variantPreTaxSellingPrice, 
        gstTaxRate: productGstRate,
        gstAmount: lineGstAmount,
        igstAmount: customerStateCode !== SELLER_STATE_CODE ? lineGstAmount : 0,
        sgstAmount: customerStateCode === SELLER_STATE_CODE ? lineGstAmount / 2 : 0,
        cgstAmount: customerStateCode === SELLER_STATE_CODE ? lineGstAmount / 2 : 0,
        finalItemPrice: lineFinalPrice,
      };
      setOrderItems(prevItems => [...prevItems, newItem]);
    }
  
    setSelectedProductForDetails(null); setSelectedVariant(null); setSelectedQuantity(1);
    setProductSearchQuery(""); setProductSearchResults([]);
    toast({ title: "Item Added", description: `${selectedProductForDetails.name} added to order.`});
  };

  const handleRemoveOrderItem = (variantIdToRemove: string) => {
    setOrderItems(prevItems => prevItems.filter(item => item.variantId !== variantIdToRemove));
  };

  // This function updates an item in the main `orderItems` state
  // It expects `updates.sellingPrice` and `updates.mrp` to be GST-INCLUSIVE from the modal
  const updateOrderItemPricing = (
    variantId: string,
    updates: {
      quantity: number;
      mrp: number; // GST-INCLUSIVE MRP
      discountRate: number; // Applied on pre-tax MRP
      sellingPrice: number; // GST-INCLUSIVE Selling Price
      gstTaxRate: number;
    }
  ) => {
    setOrderItems(prevItems =>
      prevItems.map(item => {
        if (item.variantId === variantId) {
          const { quantity, mrp: inclusiveMrp, discountRate, sellingPrice: inclusiveSellingPrice, gstTaxRate } = updates;

          const preTaxMrp = gstTaxRate > 0 ? inclusiveMrp / (1 + (gstTaxRate / 100)) : inclusiveMrp;
          const preTaxSellingPrice = gstTaxRate > 0 ? inclusiveSellingPrice / (1 + (gstTaxRate / 100)) : inclusiveSellingPrice;
          
          const actualDiscountAmountPerUnit = preTaxMrp - preTaxSellingPrice;
          const actualDiscountRate = preTaxMrp > 0 ? (actualDiscountAmountPerUnit / preTaxMrp) * 100 : 0;

          const lineDiscountAmountTotal = actualDiscountAmountPerUnit * quantity;
          const totalPreTaxValueForLine = preTaxSellingPrice * quantity;
          const totalGstAmountForLine = totalPreTaxValueForLine * (gstTaxRate / 100);
          const finalItemPriceForLine = inclusiveSellingPrice * quantity; // Since inclusiveSellingPrice is per unit

          return {
            ...item,
            quantity,
            mrp: inclusiveMrp,
            discountRate: actualDiscountRate,
            discountAmount: lineDiscountAmountTotal,
            sellingPrice: inclusiveSellingPrice, // Store inclusive selling price
            unitPrice: preTaxSellingPrice, // Store pre-tax selling price (for API)
            gstTaxRate,
            gstAmount: totalGstAmountForLine,
            finalItemPrice: finalItemPriceForLine,
            igstAmount: customerStateCode !== SELLER_STATE_CODE ? totalGstAmountForLine : 0,
            sgstAmount: customerStateCode === SELLER_STATE_CODE ? totalGstAmountForLine / 2 : 0,
            cgstAmount: customerStateCode === SELLER_STATE_CODE ? totalGstAmountForLine / 2 : 0,
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
    const mrp = parseFloat(editPricingModal.tempMrpString) || 0; // GST-inclusive
    // Discount rate from modal state is fine
    const sellingPrice = parseFloat(editPricingModal.tempSellingPriceString) || 0; // GST-inclusive
    const gstTaxRate = editPricingModal.tempGstTaxRate;

    updateOrderItemPricing(editPricingModal.item.variantId, {
      quantity,
      mrp,
      discountRate: parseFloat(editPricingModal.tempDiscountRateString), // Pass the rate from modal
      sellingPrice,
      gstTaxRate,
    });
    setEditPricingModal(initialEditPricingModalState);
  };
  
  // For direct quantity change in Step 2 cart (simplified view)
  const handleOrderItemQuantityChangeStep2 = (variantId: string, newQuantity: number) => {
    setOrderItems(prevItems =>
     prevItems.map(item => {
       if (item.variantId === variantId) {
         const qty = Math.max(1, newQuantity);
         const lineFinalPrice = item.sellingPrice * qty; // item.sellingPrice is inclusive

         // Note: For simplicity in Step 2, we're only updating final price.
         // Detailed discount/GST recalculations are deferred to Step 3 editing.
         return {
           ...item,
           quantity: qty,
           finalItemPrice: lineFinalPrice,
           // discountAmount, gstAmount, etc., would ideally be recalculated here too if Step 2 was more detailed
         };
       }
       return item;
     })
   );
 }


  const calculateOrderSubtotalPreTax = (): number => { // Sum of (pre-tax unitPrice * quantity)
    return orderItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  };
  const calculateTotalLineDiscountPreTax = (): number => { // Sum of item.discountAmount (which is total pre-tax discount for the line)
    return orderItems.reduce((sum, item) => sum + item.discountAmount, 0);
  }
  const calculateTotalOrderGst = (): number => {
    return orderItems.reduce((sum, item) => sum + item.gstAmount, 0);
  };
  const calculateGrandTotal = (): number => { // Sum of (inclusive finalItemPrice)
    return orderItems.reduce((sum, item) => sum + item.finalItemPrice, 0);
  };


  const nextStep = () => setCurrentStep(prev => prev + 1);
  const prevStep = () => setCurrentStep(prev => prev - 1);

  const canProceedToStep2 = selectedUserId !== null || (customerType === 'B2B' && selectedBusinessProfileId !== null);
  const canProceedToStep3Pricing = orderItems.length > 0;
  const canProceedToStep4Review = orderItems.length > 0;


  const handleSubmitOrder = async () => {
    if (!selectedUserId || orderItems.length === 0) {
      toast({ title: "Error", description: "Customer and order items are required.", variant: "destructive" });
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
        const { id, ...rest } = addr; // Destructure to remove 'id'
        return rest;
    };

    finalBillingAddress = getAddressCreateDto(defaultBilling || anyBilling || firstAddress);
    finalShippingAddress = getAddressCreateDto(defaultShipping || anyShipping || firstAddress || finalBillingAddress);

    if (!finalBillingAddress) {
        toast({ title: "Error", description: "Billing address is required to proceed. Please add/select an address for the customer/business.", variant: "destructive", duration: 7000 });
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
      customerDetailsPayload.businessProfileId = foundBusinessProfile.id;
      customerDetailsPayload.companyName = foundBusinessProfile.name;
      customerDetailsPayload.gstin = foundBusinessProfile.gstin;
    }

    const orderPayload: CreateOrderRequest = {
      placedByUserId: "6633d6b770c4d02019c0220b", // TODO: Replace with actual logged-in staff ID (String)
      businessProfileId: customerType === 'B2B' && selectedBusinessProfileId ? selectedBusinessProfileId : undefined,
      customerDetails: customerDetailsPayload,
      items: orderItems.map(item => {
        const variantParts = item.variantName.split(' / ');
        const color = variantParts[0]?.trim() || undefined;
        const size = variantParts[1]?.trim() || undefined;
        
        return {
            productId: item.productId,
            variantId: item.variantId,
            size: size,
            color: color,
            quantity: item.quantity,
            unitPrice: item.unitPrice, // This is PRE-TAX unit selling price
            discountRate: parseFloat(item.discountRate.toFixed(2)),
            // API expects per-unit pre-tax discount amount
            discountAmount: parseFloat((item.mrp / (1 + item.gstTaxRate/100) - item.unitPrice).toFixed(2)), 
            hsnCode: item.hsnCode,
            gstTaxRate: item.gstTaxRate,
        };
      }),
      paymentMethod: paymentMethod,
      status: "PENDING", 
      notes: orderNotes,
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
              setPhoneSearch(""); setGstinSearch(""); setSearchedUsers([]);
              setCustomerStateCode(SELLER_STATE_CODE); // Reset to default
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

                {isSearchingUser && <div className="text-sm text-muted-foreground p-2 flex items-center"><Loader2 className="animate-spin mr-2 h-3 w-3"/>Searching users...</div>}

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
              <div className="space-y-2">
                <Label htmlFor="gstin_search">Search by GSTIN</Label>
                <div className="flex gap-2">
                  <Input id="gstin_search" value={gstinSearch} onChange={e => setGstinSearch(e.target.value)} placeholder="Enter GSTIN" />
                  <Button onClick={handleBusinessProfileSearch} disabled={isSearchingBp || !gstinSearch}>
                     {isSearchingBp ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : <Building className="mr-2 h-4 w-4" />} Search BP
                  </Button>
                </div>
                 {isSearchingBp && <div className="text-sm text-muted-foreground p-2 flex items-center"><Loader2 className="animate-spin mr-2 h-3 w-3"/>Searching business profile...</div>}

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
                                            <p className="mt-1">Price: ₹{( (variant.sellingPrice ?? variant.price ?? 0) * (1 + ( (selectedProductForDetails.gstTaxRate ?? 0) /100))).toFixed(2)}</p>
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
                          <TableHead className="w-20 p-2 text-right">Price (incl. Tax)</TableHead>
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
                                <p className="text-sm sm:hidden">Qty: {item.quantity}</p> {/* Show Qty here for mobile */}
                            </div>
                            <p className="text-xs text-muted-foreground -mt-1">({item.variantName})</p>
                            
                            <div className="grid grid-cols-2 gap-x-4 text-xs mt-1.5">
                                <p>MRP: <span className="font-medium">₹{item.mrp.toFixed(2)}</span></p>
                                <p>Unit S.Price (Incl. GST): <span className="font-medium">₹{item.sellingPrice.toFixed(2)}</span></p>
                                <p>GST Rate: <span className="font-medium">{item.gstTaxRate.toFixed(0)}%</span></p>
                                <p>GST Amt: <span className="font-medium">₹{item.gstAmount.toFixed(2)}</span>
                                   <span className="text-muted-foreground text-[10px] ml-1">
                                     ({customerStateCode === SELLER_STATE_CODE ? `SGST: ₹${item.sgstAmount.toFixed(2)}, CGST: ₹${item.cgstAmount.toFixed(2)}` : `IGST: ₹${item.igstAmount.toFixed(2)}`})
                                   </span>
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-col items-end justify-between sm:ml-4 shrink-0 space-y-1 sm:space-y-0 mt-2 sm:mt-0 w-full sm:w-auto">
                            <div className="flex justify-between items-center w-full sm:w-auto">
                                <p className="text-sm hidden sm:block mr-2">Qty: {item.quantity}</p> {/* Hide Qty here on mobile, show above */}
                                <p className="font-semibold text-lg text-right">₹{item.finalItemPrice.toFixed(2)}</p>
                            </div>
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
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm font-medium">
                        <p>Subtotal (Excl. Tax):</p><p className="text-right">₹{calculateOrderSubtotalPreTax().toFixed(2)}</p>
                        <p>Total Discount (on Pre-Tax):</p><p className="text-right text-green-600">- ₹{calculateTotalLineDiscountPreTax().toFixed(2)}</p>
                        <p>Total GST ({customerStateCode === SELLER_STATE_CODE ? 'SGST+CGST' : 'IGST'}):</p><p className="text-right">₹{calculateTotalOrderGst().toFixed(2)}</p>
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
                               const newDiscountRate = Math.max(0, Math.min(100, parseFloat(newDiscRateString) || 0));
                               const currentInclusiveMrp = parseFloat(editPricingModal.tempMrpString) || 0;
                               const currentGstRate = editPricingModal.tempGstTaxRate;

                               const preTaxMrp = currentGstRate > 0 ? currentInclusiveMrp / (1 + (currentGstRate / 100)) : currentInclusiveMrp;
                               const preTaxSellingPrice = preTaxMrp * (1 - (newDiscountRate / 100));
                               const newInclusiveSellingPrice = preTaxSellingPrice * (1 + (currentGstRate / 100));

                               setEditPricingModal(prev => ({
                                   ...prev,
                                   tempDiscountRateString: newDiscRateString, // Store the raw string
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

                               const preTaxMrp = currentGstRate > 0 ? currentInclusiveMrp / (1 + (currentGstRate / 100)) : currentInclusiveMrp;
                               const preTaxSellingPrice = currentGstRate > 0 ? newInclusiveSellingPrice / (1 + (currentGstRate / 100)) : newInclusiveSellingPrice;

                               let newDiscountRate = 0;
                               if (preTaxMrp > 0 && preTaxSellingPrice >=0 && preTaxSellingPrice <= preTaxMrp) {
                                   const unitDiscount = preTaxMrp - preTaxSellingPrice;
                                   newDiscountRate = (unitDiscount / preTaxMrp) * 100;
                               } else if (preTaxSellingPrice > preTaxMrp) {
                                   newDiscountRate = 0; 
                               } else if (preTaxSellingPrice < 0) {
                                   newDiscountRate = 100; // Max discount if selling price is negative (or set to 0)
                               }


                               setEditPricingModal(prev => ({
                                   ...prev,
                                   tempSellingPriceString: newSellingPriceString,
                                   tempDiscountRateString: isNaN(newDiscountRate) ? "0.00" : newDiscountRate.toFixed(2),
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
                        const previousGstRate = editPricingModal.previousGstRateInModal;
                        const currentInclusiveSellingPrice = parseFloat(editPricingModal.tempSellingPriceString) || 0;
                        
                        let preTaxEquivalent = currentInclusiveSellingPrice;
                        if (previousGstRate > 0) {
                            preTaxEquivalent = currentInclusiveSellingPrice / (1 + (previousGstRate / 100));
                        }
                        
                        const newCalculatedInclusiveSellingPrice = preTaxEquivalent * (1 + (newGstRate / 100));

                        setEditPricingModal(prev => ({
                            ...prev,
                            tempGstTaxRate: newGstRate,
                            tempSellingPriceString: newCalculatedInclusiveSellingPrice.toFixed(2),
                            previousGstRateInModal: newGstRate,
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
                    <p className="text-sm mt-1"><span className="font-medium">State for GST:</span> {customerStateCode} ({customerStateCode === SELLER_STATE_CODE ? "Intra-State" : "Inter-State"})</p>
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
                                    
                                    <div className="grid grid-cols-2 gap-x-4 text-xs mt-1.5">
                                        <p>MRP: <span className="font-medium">₹{item.mrp.toFixed(2)}</span></p>
                                        <p>Unit S.Price (Incl. GST): <span className="font-medium">₹{item.sellingPrice.toFixed(2)}</span></p>
                                        <p>GST Rate: <span className="font-medium">{item.gstTaxRate.toFixed(0)}%</span></p>
                                        <p>GST Amt: <span className="font-medium">₹{item.gstAmount.toFixed(2)}</span>
                                        <span className="text-muted-foreground text-[10px] ml-1">
                                            ({customerStateCode === SELLER_STATE_CODE ? `SGST: ₹${item.sgstAmount.toFixed(2)}, CGST: ₹${item.cgstAmount.toFixed(2)}` : `IGST: ₹${item.igstAmount.toFixed(2)}`})
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
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm font-medium">
                        <p>Subtotal (Excl. Tax):</p><p className="text-right">₹{calculateOrderSubtotalPreTax().toFixed(2)}</p>
                        <p>Total Discount (on Pre-Tax):</p><p className="text-right text-green-600">- ₹{calculateTotalLineDiscountPreTax().toFixed(2)}</p>
                        <p>Total GST ({customerStateCode === SELLER_STATE_CODE ? 'SGST+CGST' : 'IGST'}):</p><p className="text-right">₹{calculateTotalOrderGst().toFixed(2)}</p>
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
    

