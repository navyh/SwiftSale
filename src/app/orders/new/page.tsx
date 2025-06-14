
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
import { StateCombobox } from "@/components/ui/state-combobox";
import {
  ChevronLeft, ChevronRight, PlusCircle, Trash2, Search as SearchIcon, UserPlus, Building, ShoppingCart, Loader2, X, Edit2, Edit
} from "lucide-react";
import {
  fetchUserById, createUser, type CreateUserRequest, type UserDto,
  searchUserByPhone, searchUsersByName,
  fetchBusinessProfileById, createBusinessProfile, type CreateBusinessProfileRequest, type BusinessProfileDto,
  searchBusinessProfileByGstin, searchBusinessProfilesByName, createBusinessProfileWithUser, type CreateBusinessProfileWithUserRequest,
  fetchUsersForBusinessProfileByGstin,
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
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  stateCode: z.string().min(1, "State code is required"),
  line1: z.string().optional().or(z.literal("")),
  line2: z.string().optional().or(z.literal("")),
  postalCode: z.string().optional().or(z.literal("")),
});
type UserCreateDialogValues = z.infer<typeof userCreateDialogSchema>;

const bpWithUserCreateDialogSchema = z.object({
  bpName: z.string().min(1, "Business name is required"),
  bpGstin: z.string().min(1, "GSTIN is required").regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, "Invalid GSTIN format"),
  userName: z.string().min(1, "User name is required"),
  userPhone: z.string().min(1, "User phone is required").regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone format"),
  userEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  // Common address fields for both business profile and user
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  stateCode: z.string().min(1, "State code is required"),
  line1: z.string().optional().or(z.literal("")),
  line2: z.string().optional().or(z.literal("")),
  postalCode: z.string().optional().or(z.literal("")),
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
  variantName: string; 
  hsnCode?: string | null;
  quantity: number;
  mrp: number; // GST-INCLUSIVE MRP
  discountRate: number; // percentage
  discountAmount: number; // calculated: (unitPrice * quantity * discountRate) / 100
  sellingPrice: number; // GST-INCLUSIVE selling price per unit
  unitPrice: number; // PRE-TAX, PRE-DISCOUNT selling price per unit (for API payload & internal calcs)
  gstTaxRate: number; // percentage from select
  gstAmount: number; // calculated total GST for the line item: (taxableAmount * gstTaxRate / 100)
  // GST breakdown fields
  iGstRate: number;
  iGstAmount: number;
  cGstRate: number;
  cGstAmount: number;
  sGstRate: number;
  sGstAmount: number;
  // Legacy fields for backward compatibility
  igstAmount: number;
  sgstAmount: number;
  cgstAmount: number;
  finalItemPrice: number; // calculated: sellingPrice (inclusive) * quantity
  taxableAmount: number; // calculated: (unitPrice * quantity) - discountAmount
  totalAmount: number; // calculated: taxableAmount + gstAmount
}

const SELLER_STATE_CODE = "04"; 
const STANDARD_GST_RATES = [0, 5, 12, 18, 28];
const DEFAULT_GST_FOR_QUICK_CREATE = 18; // Default GST for quick create products if not specified by product

interface EditPricingModalState {
  isOpen: boolean;
  item: OrderItemDisplay | null;
  tempQuantityString: string;
  tempMrpString: string; 
  tempDiscountRateString: string;
  tempSellingPriceString: string; 
  tempGstTaxRate: number;
  previousGstRateInModal: number; // To handle GST rate changes correctly against inclusive price
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
  const [selectedUserId, setSelectedUserId] = React.useState<string>('');
  const [selectedBusinessProfileId, setSelectedBusinessProfileId] = React.useState<string | null>(null); 

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

    const stateCodeFromAddress = defaultBilling?.stateCode || anyBilling?.stateCode || firstAddress?.stateCode || null;

    const newCustomerStateCode = stateCodeFromAddress || SELLER_STATE_CODE;
    if (newCustomerStateCode !== customerStateCode) {
      setCustomerStateCode(newCustomerStateCode); 
    }

    if (orderItems.length > 0 && newCustomerStateCode !== customerStateCode) {
      setOrderItems(prevItems => prevItems.map(item => {
        const itemPreTaxUnitPrice = item.unitPrice; 
        const itemGstRate = item.gstTaxRate;
        const lineGstAmount = itemPreTaxUnitPrice * item.quantity * (itemGstRate / 100);
        return {
          ...item,
          gstAmount: lineGstAmount,
          igstAmount: (newCustomerStateCode !== SELLER_STATE_CODE) ? lineGstAmount : 0,
          sgstAmount: (newCustomerStateCode === SELLER_STATE_CODE) ? lineGstAmount / 2 : 0,
          cgstAmount: (newCustomerStateCode === SELLER_STATE_CODE) ? lineGstAmount / 2 : 0,
        };
      }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUserDisplay, foundBusinessProfile, customerType, orderItems.length]); // customerStateCode removed to avoid infinite loop if it changes itself.


  const handleUserSearch = async () => {
    if (!phoneSearch) return;
    setIsSearchingUser(true);
    setSearchedUsers([]);
    setSelectedUserId('');
    setSelectedUserDisplay(null);
    try {
      const users = await searchUserByPhone(phoneSearch);
      setSearchedUsers(users);
      if (users.length === 0) {
        setShowUserCreateDialog(true);
        userCreateForm.setValue("phone", phoneSearch);
        userCreateForm.setValue("name", ""); // Clear name if phone search yields no results
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
    setSelectedUserId('');
    setSelectedUserDisplay(null);
    try {
      const usersPage = await searchUsersByName(userNameSearch.trim());
      setSearchedUsers(usersPage.content);
      if (usersPage.content.length === 0) {
         toast({ title: "Info", description: "No users found by that name. Try phone search or create new.", variant: "default" });
         setShowUserCreateDialog(true); 
         userCreateForm.setValue("name", userNameSearch.trim());
         userCreateForm.setValue("phone", ""); 
      }
    } catch (error: any) {
      toast({ title: "Error Searching User by Name", description: error.message || "Failed to search user.", variant: "destructive" });
    } finally {
      setIsSearchingUserByName(false);
    }
  };

  const handleSelectUserFromList = (user: UserDto) => {
    setSelectedUserId(user.id); 
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
    setSelectedUserId('');
    setSelectedUserDisplay(null);
    try {
      const bp = await searchBusinessProfileByGstin(gstinSearch);
      if (bp && bp.id) {
        handleSelectBusinessProfileFromList(bp); 
      } else {
        setShowBpWithUserCreateDialog(true);
        bpWithUserCreateForm.setValue("bpGstin", gstinSearch);
        bpWithUserCreateForm.setValue("bpName", "");
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
    setSelectedUserId('');
    setSelectedUserDisplay(null);
    try {
      const bpPage = await searchBusinessProfilesByName(businessNameSearch.trim());
      setSearchedBusinessProfiles(bpPage.content);
      if (bpPage.content.length === 0) {
        toast({ title: "Info", description: "No business profiles found by that name. Try GSTIN search or create new.", variant: "default" });
        setShowBpWithUserCreateDialog(true); 
        bpWithUserCreateForm.setValue("bpName", businessNameSearch.trim());
        bpWithUserCreateForm.setValue("bpGstin", ""); 
      }
    } catch (error: any) {
      toast({ title: "Error Searching BP by Name", description: error.message || "Failed to search business profile.", variant: "destructive" });
    } finally {
      setIsSearchingBpByName(false);
    }
  };

  const handleSelectBusinessProfileFromList = async (bp: BusinessProfileDto) => {
    setFoundBusinessProfile(bp);
    setSelectedBusinessProfileId(bp.id); 

    try {
      // Fetch users associated with this business profile using GSTIN
      if (bp.gstin) {
        const usersPage = await fetchUsersForBusinessProfileByGstin(bp.gstin);

        if (usersPage.content.length > 0) {
          // Find a user that has this business profile in their memberships
          const matchingUser = usersPage.content.find(user => 
            user.businessMemberships?.some(membership => 
              membership.businessProfileId === bp.id
            )
          );

          if (matchingUser) {
            setSelectedUserDisplay(matchingUser);
            if (matchingUser.id) setSelectedUserId(matchingUser.id);
          } else {
            // Fallback to first user if no matching membership found
            const firstUser = usersPage.content[0];
            setSelectedUserDisplay(firstUser);
            if (firstUser.id) setSelectedUserId(firstUser.id);
          }
        } else {
          // No users found for this business profile
          toast({ title: "Info", description: "Business profile selected. No users found. Order can proceed with this BP, or link a user via BP Management to have a specific user associated.", variant: "default", duration: 7000 });
          setSelectedUserDisplay(null); 
          setSelectedUserId('');
        }
      } else {
        // Fallback to old method if no GSTIN available
        if (bp.userIds && bp.userIds.length > 0 && bp.userIds[0]) {
          const user = await fetchUserById(bp.userIds[0]); 
          setSelectedUserDisplay(user);
          if (user && user.id) setSelectedUserId(user.id);
        } else {
          toast({ title: "Info", description: "Business profile selected. No primary user linked. Order can proceed with this BP, or link a user via BP Management to have a specific user associated.", variant: "default", duration: 7000 });
          setSelectedUserDisplay(null); 
          setSelectedUserId('');
        }
      }
    } catch (userError: any) {
      toast({ title: "Warning", description: `Could not fetch users for BP: ${userError.message}`, variant: "default" });
      setSelectedUserDisplay(null); 
      setSelectedUserId('');
    }

    setSearchedBusinessProfiles([]);
    setGstinSearch("");
    setBusinessNameSearch("");
  };


  const handleCreateUserDialogSubmit = async (data: UserCreateDialogValues) => {
    setIsUserCreateSubmitting(true);
    try {
      // Create address object
      const address: AddressCreateDto = {
        city: data.city,
        state: data.state,
        stateCode: data.stateCode,
        line1: data.line1 || undefined,
        line2: data.line2 || undefined,
        postalCode: data.postalCode || undefined,
        type: 'BILLING',
        isDefault: true
      };

      const newUser = await createUser({ 
        name: data.name, 
        phone: data.phone, 
        email: data.email || undefined, 
        status: 'ACTIVE',
        addresses: [address]
      });

      setSelectedUserDisplay(newUser);
      if (newUser && newUser.id) setSelectedUserId(newUser.id); 
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

    // Create a single address to be used for both business profile and user
    const commonAddress: AddressCreateDto = {
      city: data.city,
      state: data.state,
      stateCode: data.stateCode,
      line1: data.line1 || undefined,
      line2: data.line2 || undefined,
      postalCode: data.postalCode || undefined,
      type: 'BILLING',
      isDefault: true
    };

    const payload: CreateBusinessProfileWithUserRequest = {
      businessProfile: { 
        companyName: data.bpName, 
        gstin: data.bpGstin, 
        status: 'ACTIVE',
        addresses: [commonAddress]
      },
      user: { 
        name: data.userName, 
        phone: data.userPhone, 
        email: data.userEmail || undefined, 
        status: 'ACTIVE',
        addresses: [commonAddress]
      }
    };

    try {
      const response = await createBusinessProfileWithUser(payload);

      // Extract user from response
      if (response.user && response.user.id) {
        setSelectedUserDisplay(response.user);
        setSelectedUserId(response.user.id);
      }

      // Extract business profile from response
      if (response.businessProfiles && response.businessProfiles.length > 0) {
        const businessProfile = response.businessProfiles[0];
        setFoundBusinessProfile(businessProfile);
        if (businessProfile.id) setSelectedBusinessProfileId(businessProfile.id);
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

    const inclusiveUnitPriceFromForm = data.unitPrice; 
    const gstRateForQuickCreate = DEFAULT_GST_FOR_QUICK_CREATE; // Use a default GST for simplicity here

    // Backend for /products/quick expects pre-tax unitPrice
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
        const productGstRate = responseProduct.gstTaxRate ?? DEFAULT_GST_FOR_QUICK_CREATE;

        // unitPrice from API quick create response is pre-tax.
        const variantUnitSellingPrice = newVariant.sellingPrice ?? 0;
        const variantUnitTaxableAmount = variantUnitSellingPrice * (1 + (productGstRate / 100));
        const variantMrp = newVariant.mrp ?? 0;

        // const preTaxMrp = productGstRate > 0 ? variantMrp / (1 + (productGstRate / 100)) : variantMrp;
        const discountAmountPerUnit = variantMrp - variantUnitSellingPrice;
        const discountRate = variantMrp > 0 ? (discountAmountPerUnit / variantMrp) * 100 : 0;

        const linePreTaxTotal = variantUnitTaxableAmount * 1; // for quantity 1
        const lineGstAmount = linePreTaxTotal * (productGstRate / 100);
        const derivedCustomerState = customerStateCode || SELLER_STATE_CODE;

        const newItem: OrderItemDisplay = {
          productId: responseProduct.id,
          variantId: newVariant.id,
          productName: responseProduct.name ?? "Unknown Product",
          variantName: `${newVariant.color || ''}${newVariant.color && newVariant.size ? ' / ' : ''}${newVariant.size || ''}`.trim() || 'Default',
          hsnCode: responseProduct.hsnCode,
          quantity: 1,
          mrp: variantMrp, // Inclusive MRP
          discountRate: Math.max(0, discountRate),
          discountAmount: Math.max(0, discountAmountPerUnit), // Per unit pre-tax discount
          sellingPrice: variantUnitSellingPrice, // Inclusive Selling Price
          unitPrice: variantMrp,
          gstTaxRate: productGstRate,
          gstAmount: lineGstAmount, 
          igstAmount: derivedCustomerState !== SELLER_STATE_CODE ? lineGstAmount : 0,
          sgstAmount: derivedCustomerState === SELLER_STATE_CODE ? lineGstAmount / 2 : 0,
          cgstAmount: derivedCustomerState === SELLER_STATE_CODE ? lineGstAmount / 2 : 0,
          iGstRate: derivedCustomerState !== SELLER_STATE_CODE ? productGstRate : 0,
          iGstAmount: derivedCustomerState !== SELLER_STATE_CODE ? lineGstAmount : 0,
          sGstRate: derivedCustomerState === SELLER_STATE_CODE ? productGstRate / 2 : 0,
          sGstAmount: derivedCustomerState === SELLER_STATE_CODE ? lineGstAmount / 2 : 0,
          cGstRate: derivedCustomerState === SELLER_STATE_CODE ? productGstRate / 2 : 0,
          cGstAmount: derivedCustomerState === SELLER_STATE_CODE ? lineGstAmount / 2 : 0,
          finalItemPrice: variantUnitSellingPrice * 1,
          taxableAmount: variantUnitTaxableAmount * 1,
          totalAmount: linePreTaxTotal + lineGstAmount
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

    // variant.sellingPrice from API is GST-inclusive
    const variantInclusiveSellingPrice = selectedVariant.sellingPrice ?? 0; 
    const productGstRate = selectedProductForDetails.gstTaxRate ?? 0;
    // variant.mrp from API is GST-inclusive
    const variantInclusiveMrp = selectedVariant.mrp ?? variantInclusiveSellingPrice; 

    // Calculate pre-tax selling price
    const preTaxSellingPrice = productGstRate > 0 ? variantInclusiveSellingPrice / (1 + (productGstRate / 100)) : variantInclusiveSellingPrice;
    // Calculate pre-tax MRP
    // const preTaxMrp = productGstRate > 0 ? variantInclusiveMrp / (1 + (productGstRate / 100)) : variantInclusiveMrp;

    const discountAmountPerUnit = variantInclusiveMrp - variantInclusiveSellingPrice;
    const discountRate = variantInclusiveMrp > 0 ? (discountAmountPerUnit / variantInclusiveMrp) * 100 : 0;

    if (existingItemIndex > -1) {
      const updatedItems = [...orderItems];
      const currentItem = updatedItems[existingItemIndex];
      const newQuantity = currentItem.quantity + selectedQuantity;

      // Apply the new calculation logic as per requirements
      // Calculate pre-tax MRP from the GST-inclusive MRP
      // const preTaxMrpForExisting = currentItem.gstTaxRate > 0 ? currentItem.mrp / (1 + (currentItem.gstTaxRate / 100)) : currentItem.mrp;
      // Calculate discount amount as the difference between pre-tax MRP and pre-tax unit price, multiplied by quantity
      const discountAmount = discountAmountPerUnit * newQuantity;
      const taxableAmount = preTaxSellingPrice * newQuantity;
      const gstAmount = (taxableAmount * currentItem.gstTaxRate) / 100;
      const derivedCustomerState = customerStateCode || SELLER_STATE_CODE;

      // Calculate GST breakdown based on customer state
      let iGstRate = 0, iGstAmount = 0, cGstRate = 0, cGstAmount = 0, sGstRate = 0, sGstAmount = 0;

      if (derivedCustomerState !== SELLER_STATE_CODE) {
        // Inter-state: Use IGST
        iGstRate = currentItem.gstTaxRate;
        iGstAmount = gstAmount;
      } else {
        // Intra-state: Split into CGST and SGST
        cGstRate = currentItem.gstTaxRate / 2;
        sGstRate = currentItem.gstTaxRate / 2;
        cGstAmount = gstAmount / 2;
        sGstAmount = gstAmount / 2;
      }

      // Calculate total amount
      const totalAmount = taxableAmount + gstAmount;

      // Update the item with new values
      currentItem.quantity = newQuantity;
      currentItem.discountAmount = discountAmount;
      currentItem.taxableAmount = taxableAmount;
      currentItem.gstAmount = gstAmount;
      currentItem.iGstRate = iGstRate;
      currentItem.iGstAmount = iGstAmount;
      currentItem.cGstRate = cGstRate;
      currentItem.cGstAmount = cGstAmount;
      currentItem.sGstRate = sGstRate;
      currentItem.sGstAmount = sGstAmount;
      currentItem.igstAmount = iGstAmount; // Legacy field
      currentItem.sgstAmount = sGstAmount; // Legacy field
      currentItem.cgstAmount = cGstAmount; // Legacy field
      currentItem.finalItemPrice = totalAmount;
      currentItem.totalAmount = totalAmount;

      setOrderItems(updatedItems);
    } else {
      // Apply the new calculation logic as per requirements
      // Calculate discount amount as the difference between pre-tax MRP and pre-tax selling price, multiplied by quantity
      const discountAmount = (variantInclusiveMrp - variantInclusiveSellingPrice) * selectedQuantity;
      const taxableAmount = preTaxSellingPrice * selectedQuantity;
      const gstAmount = (taxableAmount * productGstRate) / 100;
      const derivedCustomerState = customerStateCode || SELLER_STATE_CODE;

      // Calculate GST breakdown based on customer state
      let iGstRate = 0, iGstAmount = 0, cGstRate = 0, cGstAmount = 0, sGstRate = 0, sGstAmount = 0;

      if (derivedCustomerState !== SELLER_STATE_CODE) {
        // Inter-state: Use IGST
        iGstRate = productGstRate;
        iGstAmount = gstAmount;
      } else {
        // Intra-state: Split into CGST and SGST
        cGstRate = productGstRate / 2;
        sGstRate = productGstRate / 2;
        cGstAmount = gstAmount / 2;
        sGstAmount = gstAmount / 2;
      }

      // Calculate total amount
      const totalAmount = taxableAmount + gstAmount;

      const newItem: OrderItemDisplay = {
        productId: selectedProductForDetails.id,
        variantId: selectedVariant.id,
        productName: selectedProductForDetails.name ?? "Unknown Product",
        variantName: `${selectedVariant.color || ''}${selectedVariant.color && selectedVariant.size ? ' / ' : ''}${selectedVariant.size || ''}`.trim() || 'Default',
        hsnCode: selectedProductForDetails.hsnCode,
        quantity: selectedQuantity,
        mrp: variantInclusiveMrp, // Store inclusive MRP
        discountRate: Math.max(0, discountRate),
        discountAmount: discountAmount,
        sellingPrice: variantInclusiveSellingPrice, // Store inclusive Selling Price per unit
        unitPrice: preTaxSellingPrice, // Store pre-tax Selling Price per unit
        gstTaxRate: productGstRate,
        gstAmount: gstAmount,
        // New GST breakdown fields
        iGstRate,
        iGstAmount,
        cGstRate,
        cGstAmount,
        sGstRate,
        sGstAmount,
        // Legacy fields for backward compatibility
        igstAmount: iGstAmount,
        sgstAmount: sGstAmount,
        cgstAmount: cGstAmount,
        finalItemPrice: totalAmount,
        taxableAmount: taxableAmount,
        totalAmount: totalAmount
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

  // This function updates the main orderItems state after modal save
  const updateOrderItemPricing = (
    variantId: string, 
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
          const { quantity, mrp: newInclusiveMrp, discountRate: newDiscountRate, sellingPrice: newInclusiveSellingPrice, gstTaxRate: newGstTaxRate } = updates;

          // Derive pre-tax unit price from the INCLUSIVE selling price provided from modal
          const preTaxUnitPrice = newGstTaxRate > 0 ? newInclusiveSellingPrice / (1 + (newGstTaxRate / 100)) : newInclusiveSellingPrice;

          // Derive pre-tax MRP from the INCLUSIVE MRP provided from modal
          // const preTaxMrp = newGstTaxRate > 0 ? newInclusiveMrp / (1 + (newGstTaxRate / 100)) : newInclusiveMrp;

          // Apply the new calculation logic as per requirements
          // Calculate discount amount as the difference between pre-tax MRP and pre-tax unit price, multiplied by quantity
          const discountAmount = (newInclusiveMrp - newInclusiveSellingPrice) * quantity;
          const taxableAmount = preTaxUnitPrice * quantity;
          const gstAmount = (taxableAmount * newGstTaxRate) / 100;
          const derivedCustomerState = customerStateCode || SELLER_STATE_CODE;

          // Calculate GST breakdown based on customer state
          let iGstRate = 0, iGstAmount = 0, cGstRate = 0, cGstAmount = 0, sGstRate = 0, sGstAmount = 0;

          if (derivedCustomerState !== SELLER_STATE_CODE) {
            // Inter-state: Use IGST
            iGstRate = newGstTaxRate;
            iGstAmount = gstAmount;
          } else {
            // Intra-state: Split into CGST and SGST
            cGstRate = newGstTaxRate / 2;
            sGstRate = newGstTaxRate / 2;
            cGstAmount = gstAmount / 2;
            sGstAmount = gstAmount / 2;
          }

          // Calculate total amount
          const totalAmount = taxableAmount + gstAmount;

          return {
            ...item,
            quantity,
            mrp: newInclusiveMrp, // Store inclusive MRP
            discountRate: newDiscountRate,
            discountAmount, // New calculation based on requirements
            sellingPrice: newInclusiveSellingPrice, // Store the GST-inclusive selling price per unit
            unitPrice: preTaxUnitPrice, // Store the pre-GST unit price per unit
            gstTaxRate: newGstTaxRate,
            gstAmount,
            // New GST breakdown fields
            iGstRate,
            iGstAmount,
            cGstRate,
            cGstAmount,
            sGstRate,
            sGstAmount,
            // Legacy fields for backward compatibility
            igstAmount: iGstAmount,
            sgstAmount: sGstAmount,
            cgstAmount: cGstAmount,
            finalItemPrice: totalAmount,
            taxableAmount,
            totalAmount,
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
      tempMrpString: itemToEdit.mrp.toFixed(2), // MRP is GST-inclusive
      tempDiscountRateString: itemToEdit.discountRate.toFixed(2),
      tempSellingPriceString: itemToEdit.sellingPrice.toFixed(2), // Selling price is GST-inclusive
      tempGstTaxRate: itemToEdit.gstTaxRate,
      previousGstRateInModal: itemToEdit.gstTaxRate, // Store the initial GST rate of the item
    });
  };

  const handleSavePricingModal = () => {
    if (!editPricingModal.item) return;

    const quantity = parseInt(editPricingModal.tempQuantityString) || 1;
    // Values from modal state are already inclusive
    const inclusiveMrp = parseFloat(editPricingModal.tempMrpString) || 0;
    const discountRate = parseFloat(editPricingModal.tempDiscountRateString) || 0;
    const inclusiveSellingPrice = parseFloat(editPricingModal.tempSellingPriceString) || 0;
    const gstTaxRate = editPricingModal.tempGstTaxRate;

    updateOrderItemPricing(editPricingModal.item.variantId, {
      quantity,
      mrp: inclusiveMrp,
      discountRate, // Discount rate is directly from modal
      sellingPrice: inclusiveSellingPrice, // Pass GST-inclusive selling price
      gstTaxRate,
    });
    setEditPricingModal(initialEditPricingModalState);
  };

  const handleOrderItemQuantityChangeStep2 = (variantId: string, newQuantity: number) => { 
    setOrderItems(prevItems =>
     prevItems.map(item => {
       if (item.variantId === variantId) {
         const qty = Math.max(1, newQuantity);
         // Apply the new calculation logic as per requirements

         const itemTaxableAmount = item.gstTaxRate > 0 ? item.sellingPrice / (1 + (item.gstTaxRate / 100)) : item.sellingPrice;
         // Calculate discount amount as the difference between pre-tax MRP and pre-tax unit price, multiplied by quantity
         const discountAmount = (item.mrp - item.sellingPrice) * qty;
         const taxableAmount = itemTaxableAmount * qty;
         const gstRate = item.gstTaxRate;
         const gstAmount = (taxableAmount * gstRate) / 100;
         const derivedCustomerState = customerStateCode || SELLER_STATE_CODE;

         // Calculate GST breakdown based on customer state
         let iGstRate = 0, iGstAmount = 0, cGstRate = 0, cGstAmount = 0, sGstRate = 0, sGstAmount = 0;

         if (derivedCustomerState !== SELLER_STATE_CODE) {
           // Inter-state: Use IGST
           iGstRate = gstRate;
           iGstAmount = gstAmount;
         } else {
           // Intra-state: Split into CGST and SGST
           cGstRate = gstRate / 2;
           sGstRate = gstRate / 2;
           cGstAmount = gstAmount / 2;
           sGstAmount = gstAmount / 2;
         }

         // Calculate total amount
         const totalAmount = taxableAmount + gstAmount;

         // Calculate final item price (inclusive of GST)
         const finalItemPriceForLine = totalAmount;

         return {
           ...item,
           quantity: qty,
           discountAmount,
           taxableAmount,
           gstAmount,
           // New GST breakdown fields
           iGstRate,
           iGstAmount,
           cGstRate,
           cGstAmount,
           sGstRate,
           sGstAmount,
           // Legacy fields for backward compatibility
           igstAmount: iGstAmount,
           sgstAmount: sGstAmount,
           cgstAmount: cGstAmount,
           finalItemPrice: finalItemPriceForLine,
           totalAmount
         };
       }
       return item;
     })
   );
  };

  // Calculates sum of (pre-tax unit price * quantity) for all items
  const calculateOrderSubtotalPreTax = (): number => {
    return orderItems.reduce((sum, item) => sum + item.mrp * item.quantity, 0);
  };

  // Calculates sum of (total discount for each line item)
  const calculateTotalLineDiscountPreTax = (): number => {
    return orderItems.reduce((sum, item) => {
        // item.discountAmount is the total discount for the line
        return sum + item.discountAmount;
    }, 0);
  }

  // Calculates sum of taxable amounts for all items
  const calculateTotalTaxableAmount = (): number => {
    return orderItems.reduce((sum, item) => sum + item.taxableAmount, 0);
  };

  // Calculates sum of GST amounts for all items
  const calculateTotalOrderGst = (): number => {
    return orderItems.reduce((sum, item) => sum + item.gstAmount, 0);
  };

  // Calculates sum of total amounts for all items
  const calculateGrandTotal = (): number => {
    return orderItems.reduce((sum, item) => sum + item.totalAmount, 0);
  };

  const nextStep = () => setCurrentStep(prev => prev + 1);
  const prevStep = () => setCurrentStep(prev => prev - 1);

  const canProceedToStep2 = selectedUserId !== null || (customerType === 'B2B' && selectedBusinessProfileId !== null);
  const canProceedToStep3Pricing = orderItems.length > 0;
  const canProceedToStep4Review = orderItems.length > 0;


  const handleSubmitOrder = async () => {
    // For B2C orders, a user must be selected
    // For B2B orders, either a user or a business profile must be selected
    if (customerType === 'B2C' && !selectedUserId) {
      toast({ title: "Error", description: "Customer selection is required to place an order.", variant: "destructive" });
      return;
    }

    // For B2B orders, ensure a business profile is selected
    if (customerType === 'B2B' && !selectedBusinessProfileId) {
      toast({ title: "Error", description: "Business profile selection is required to place an order.", variant: "destructive" });
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
        finalShippingAddress = finalBillingAddress; // Default shipping to billing if not found
    }

    const customerDetailsPayload: CustomerDetailsDto = {
      userId: selectedUserId || undefined, // This is the end customer/BP's primary user ID (may be undefined for B2B)
      name: selectedUserDisplay?.name || undefined,
      phone: selectedUserDisplay?.phone || undefined,
      email: selectedUserDisplay?.email || undefined,
      billingAddress: finalBillingAddress,
      shippingAddress: finalShippingAddress,
      stateCode: customerStateCode || SELLER_STATE_CODE, // Derived customer state code
    };

    if (customerType === 'B2B' && foundBusinessProfile) {
      customerDetailsPayload.businessProfileId = foundBusinessProfile.id; 
      customerDetailsPayload.companyName = foundBusinessProfile.companyName;
      customerDetailsPayload.gstin = foundBusinessProfile.gstin;
    }

    const orderPayload: CreateOrderRequest = {
      // For B2B orders without a selected user, we'll use the system user ID or null
      // The backend should handle this appropriately
      placedByUserId: selectedUserId, // User for whom order is placed (may be undefined for B2B)
      businessProfileId: customerType === 'B2B' && selectedBusinessProfileId ? selectedBusinessProfileId : undefined,
      customerDetails: customerDetailsPayload,
      items: orderItems.map(item => {
        const variantParts = item.variantName.split(' / ');
        const color = variantParts[0]?.trim() || undefined;
        const size = variantParts[1]?.trim() || undefined;

        // Format GST breakdown for the payload
        const gst = {
          iGstRate: item.iGstRate,
          iGstAmount: parseFloat(item.iGstAmount.toFixed(2)),
          cGstRate: item.cGstRate,
          cGstAmount: parseFloat(item.cGstAmount.toFixed(2)),
          sGstRate: item.sGstRate,
          sGstAmount: parseFloat(item.sGstAmount.toFixed(2))
        };

        return {
            productId: item.productId, 
            variantId: item.variantId, 
            size: size,
            color: color,
            quantity: item.quantity,
            mrp: parseFloat(item.mrp.toFixed(2)), // Include MRP
            unitPrice: parseFloat(item.unitPrice.toFixed(2)), // Pre-tax, pre-discount price
            discountRate: parseFloat(item.discountRate.toFixed(2)),
            discountAmount: parseFloat(item.discountAmount.toFixed(2)), // Total discount for the line
            taxableAmount: parseFloat(item.taxableAmount.toFixed(2)),
            gstTaxRate: item.gstTaxRate,
            gst: gst, // Include GST breakdown
            totalAmount: parseFloat(item.totalAmount.toFixed(2)),
            hsnCode: item.hsnCode,
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

                            <div className="pt-2">
                              <Label className="font-medium">Address Information</Label>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                                <div>
                                  <Input {...userCreateForm.register("line1")} placeholder="Address Line 1 (Optional)" />
                                  {userCreateForm.formState.errors.line1 && <p className="text-xs text-destructive">{userCreateForm.formState.errors.line1.message}</p>}
                                </div>
                                <div>
                                  <Input {...userCreateForm.register("line2")} placeholder="Address Line 2 (Optional)" />
                                  {userCreateForm.formState.errors.line2 && <p className="text-xs text-destructive">{userCreateForm.formState.errors.line2.message}</p>}
                                </div>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                                <div>
                                  <Input {...userCreateForm.register("city")} placeholder="City *" />
                                  {userCreateForm.formState.errors.city && <p className="text-xs text-destructive">{userCreateForm.formState.errors.city.message}</p>}
                                </div>
                                <div>
                                  <Input {...userCreateForm.register("postalCode")} placeholder="Postal Code (Optional)" />
                                  {userCreateForm.formState.errors.postalCode && <p className="text-xs text-destructive">{userCreateForm.formState.errors.postalCode.message}</p>}
                                </div>
                              </div>
                              <div className="mt-2">
                                <Controller
                                  name="state"
                                  control={userCreateForm.control}
                                  render={({ field }) => (
                                    <StateCombobox
                                      value={field.value}
                                      onValueChange={(value) => {
                                        userCreateForm.setValue("state", value || "");
                                      }}
                                      onStateCodeChange={(code) => {
                                        userCreateForm.setValue("stateCode", code || "");
                                      }}
                                    />
                                  )}
                                />
                                {userCreateForm.formState.errors.state && <p className="text-xs text-destructive">{userCreateForm.formState.errors.state.message}</p>}
                                {userCreateForm.formState.errors.stateCode && <p className="text-xs text-destructive">{userCreateForm.formState.errors.stateCode.message}</p>}
                              </div>
                            </div>

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
                          {bp.companyName} ({bp.gstin})
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

                            <Label className="font-medium pt-4 block">User Details</Label>
                            <Input {...bpWithUserCreateForm.register("userName")} placeholder="User Full Name" />
                             {bpWithUserCreateForm.formState.errors.userName && <p className="text-xs text-destructive">{bpWithUserCreateForm.formState.errors.userName.message}</p>}
                            <Input {...bpWithUserCreateForm.register("userPhone")} placeholder="User Phone Number" />
                            {bpWithUserCreateForm.formState.errors.userPhone && <p className="text-xs text-destructive">{bpWithUserCreateForm.formState.errors.userPhone.message}</p>}
                            <Input {...bpWithUserCreateForm.register("userEmail")} placeholder="User Email (Optional)" />
                            {bpWithUserCreateForm.formState.errors.userEmail && <p className="text-xs text-destructive">{bpWithUserCreateForm.formState.errors.userEmail.message}</p>}

                            <div className="pt-4">
                              <Label className="font-medium">Common Address (for both Business and User)</Label>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                                <div>
                                  <Input {...bpWithUserCreateForm.register("line1")} placeholder="Address Line 1 (Optional)" />
                                  {bpWithUserCreateForm.formState.errors.line1 && <p className="text-xs text-destructive">{bpWithUserCreateForm.formState.errors.line1.message}</p>}
                                </div>
                                <div>
                                  <Input {...bpWithUserCreateForm.register("line2")} placeholder="Address Line 2 (Optional)" />
                                  {bpWithUserCreateForm.formState.errors.line2 && <p className="text-xs text-destructive">{bpWithUserCreateForm.formState.errors.line2.message}</p>}
                                </div>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                                <div>
                                  <Input {...bpWithUserCreateForm.register("city")} placeholder="City *" />
                                  {bpWithUserCreateForm.formState.errors.city && <p className="text-xs text-destructive">{bpWithUserCreateForm.formState.errors.city.message}</p>}
                                </div>
                                <div>
                                  <Input {...bpWithUserCreateForm.register("postalCode")} placeholder="Postal Code (Optional)" />
                                  {bpWithUserCreateForm.formState.errors.postalCode && <p className="text-xs text-destructive">{bpWithUserCreateForm.formState.errors.postalCode.message}</p>}
                                </div>
                              </div>
                              <div className="mt-2">
                                <Controller
                                  name="state"
                                  control={bpWithUserCreateForm.control}
                                  render={({ field }) => (
                                    <StateCombobox
                                      value={field.value}
                                      onValueChange={(value) => {
                                        bpWithUserCreateForm.setValue("state", value || "");
                                      }}
                                      onStateCodeChange={(code) => {
                                        bpWithUserCreateForm.setValue("stateCode", code || "");
                                      }}
                                    />
                                  )}
                                />
                                {bpWithUserCreateForm.formState.errors.state && <p className="text-xs text-destructive">{bpWithUserCreateForm.formState.errors.state.message}</p>}
                                {bpWithUserCreateForm.formState.errors.stateCode && <p className="text-xs text-destructive">{bpWithUserCreateForm.formState.errors.stateCode.message}</p>}
                              </div>
                            </div>

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
                            <p className="text-sm text-green-800">{foundBusinessProfile.companyName} ({foundBusinessProfile.gstin})</p>
                            {selectedUserDisplay && <p className="mt-1 text-xs text-green-600">Associated User: {selectedUserDisplay.name} ({selectedUserDisplay.phone})</p>}
                            {!selectedUserDisplay && foundBusinessProfile.userIds && foundBusinessProfile.userIds.length === 0 && <p className="mt-1 text-xs text-orange-600">No primary user linked. Order can proceed, or link user via BP Management.</p>}
                             {selectedUserDisplay === null && foundBusinessProfile.userIds && foundBusinessProfile.userIds.length > 0 && !foundBusinessProfile.user && <p className="mt-1 text-xs text-orange-600">Primary user associated with this BP could not be fetched. Order can proceed with BP details, or verify user linkage via BP Management.</p>}
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
                                            <p className="mt-1">Price: ₹{(variant.sellingPrice ?? 0).toFixed(2)}</p>
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
                            <Card key={item.variantId} className="p-3 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                                    {/* Left Side: Product Info */}
                                    <div className="flex-grow">
                                        <p className="font-semibold text-sm">{item.productName}</p>
                                        <p className="text-xs text-muted-foreground">({item.variantName})</p>

                                        <div className="mt-1.5 text-xs grid grid-cols-2 gap-x-3">
                                            <span>MRP: <span className="font-medium">₹{item.mrp.toFixed(2)}</span></span>
                                            <span>Unit Price (Pre-tax): <span className="font-medium">₹{item.unitPrice.toFixed(2)}</span></span>
                                            <span>Discount: <span className="font-medium">{item.discountRate.toFixed(1)}%</span> (₹{item.discountAmount.toFixed(2)} total)</span>
                                            <span>Taxable Amount: <span className="font-medium">₹{item.taxableAmount.toFixed(2)}</span></span>
                                        </div>
                                        <div className="text-xs mt-1 grid grid-cols-2 gap-x-3">
                                            <span>GST Breakdown:</span>
                                            <span>Total GST: <span className="font-medium">₹{item.gstAmount.toFixed(2)}</span></span>

                                            {customerStateCode !== SELLER_STATE_CODE ? (
                                                <span className="col-span-2 text-[10px] text-muted-foreground">
                                                    IGST: {item.iGstRate.toFixed(1)}% (₹{item.iGstAmount.toFixed(2)})
                                                </span>
                                            ) : (
                                                <span className="col-span-2 text-[10px] text-muted-foreground">
                                                    CGST: {item.cGstRate.toFixed(1)}% (₹{item.cGstAmount.toFixed(2)}), 
                                                    SGST: {item.sGstRate.toFixed(1)}% (₹{item.sGstAmount.toFixed(2)})
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs mt-1 font-medium">
                                            Total Amount: ₹{item.totalAmount.toFixed(2)}
                                        </p>
                                    </div>
                                    {/* Right Side: Quantity, Total, Edit Button */}
                                    <div className="flex flex-col items-end sm:ml-4 shrink-0 space-y-1 mt-2 sm:mt-0 w-full sm:w-auto">
                                        <div className="text-xs">Qty: {item.quantity}</div>
                                        <p className="font-semibold text-base text-right">₹{item.finalItemPrice.toFixed(2)}</p>
                                        <Button size="sm" variant="outline" onClick={() => openEditPricingModal(item)} className="mt-1 text-xs py-1 h-auto self-end w-full sm:w-auto">
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
                        <p>Subtotal (MRP):</p><p className="text-right font-medium">₹{calculateOrderSubtotalPreTax().toFixed(2)}</p>
                        <p>Total Discount:</p><p className="text-right font-medium text-green-600">- ₹{calculateTotalLineDiscountPreTax().toFixed(2)}</p>
                        <p>Total Taxable Amount:</p><p className="text-right font-medium">₹{calculateTotalTaxableAmount().toFixed(2)}</p>
                        <p>Total GST:</p><p className="text-right font-medium">₹{calculateTotalOrderGst().toFixed(2)}</p>

                        {customerStateCode !== SELLER_STATE_CODE ? (
                            <>
                                <p className="text-xs text-muted-foreground">IGST:</p>
                                <p className="text-xs text-muted-foreground text-right">₹{orderItems.reduce((sum, item) => sum + item.iGstAmount, 0).toFixed(2)}</p>
                            </>
                        ) : (
                            <>
                                <p className="text-xs text-muted-foreground">CGST:</p>
                                <p className="text-xs text-muted-foreground text-right">₹{orderItems.reduce((sum, item) => sum + item.cGstAmount, 0).toFixed(2)}</p>
                                <p className="text-xs text-muted-foreground">SGST:</p>
                                <p className="text-xs text-muted-foreground text-right">₹{orderItems.reduce((sum, item) => sum + item.sGstAmount, 0).toFixed(2)}</p>
                            </>
                        )}

                        <p className="text-lg font-semibold mt-1">Grand Total:</p>
                        <p className="text-lg font-semibold text-right mt-1">₹{calculateGrandTotal().toFixed(2)}</p>
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
                                const currentGstRate = editPricingModal.tempGstTaxRate;
                                const currentDiscountRate = parseFloat(editPricingModal.tempDiscountRateString) || 0;

                                const newInclusiveMrp = parseFloat(newMrpString) || 0;
                                const preTaxMrp = currentGstRate > 0 ? newInclusiveMrp / (1 + (currentGstRate / 100)) : newInclusiveMrp;
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
                               if (currentInclusiveMrp > 0) { 
                                   const preTaxMrp = currentGstRate > 0 ? currentInclusiveMrp / (1 + (currentGstRate / 100)) : currentInclusiveMrp;
                                   const preTaxSellingPrice = currentGstRate > 0 ? newInclusiveSellingPrice / (1 + (currentGstRate / 100)) : newInclusiveSellingPrice;

                                   if (preTaxMrp > 0 && preTaxSellingPrice <= preTaxMrp ) { // Discount cannot be negative
                                     const unitDiscount = preTaxMrp - preTaxSellingPrice;
                                     newDiscountRate = (unitDiscount / preTaxMrp) * 100;
                                   }
                               }

                               setEditPricingModal(prev => ({
                                   ...prev,
                                   tempSellingPriceString: newSellingPriceString,
                                   tempDiscountRateString: isNaN(newDiscountRate) ? "0.00" : Math.max(0, Math.min(100, newDiscountRate)).toFixed(2),
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
                        const previousGstRateInModal = editPricingModal.previousGstRateInModal; 
                        const currentInclusiveSellingPriceString = editPricingModal.tempSellingPriceString; 
                        const currentInclusiveSellingPrice = parseFloat(currentInclusiveSellingPriceString) || 0;

                        // To keep user's intended *pre-tax* value constant when only GST rate changes:
                        let preTaxEquivalentOfCurrentSellingPrice = currentInclusiveSellingPrice; 
                        if (previousGstRateInModal > 0) { 
                            preTaxEquivalentOfCurrentSellingPrice = currentInclusiveSellingPrice / (1 + (previousGstRateInModal / 100));
                        }

                        const newCalculatedInclusiveSellingPrice = preTaxEquivalentOfCurrentSellingPrice * (1 + (newGstRate / 100));

                        setEditPricingModal(prev => ({
                            ...prev,
                            tempGstTaxRate: newGstRate,
                            tempSellingPriceString: newCalculatedInclusiveSellingPrice.toFixed(2), 
                            previousGstRateInModal: newGstRate, // Update for next GST change
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
                            <p><span className="font-medium">Company:</span> {foundBusinessProfile.companyName}</p>
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
                                    <div className="flex-grow">
                                        <p className="font-semibold text-sm">{item.productName}</p>
                                        <p className="text-xs text-muted-foreground">({item.variantName})</p>

                                        <div className="mt-1.5 text-xs grid grid-cols-2 gap-x-3">
                                            <span>MRP: <span className="font-medium">₹{item.mrp.toFixed(2)}</span></span>
                                            <span>Unit Price (Pre-tax): <span className="font-medium">₹{item.unitPrice.toFixed(2)}</span></span>
                                            <span>Discount: <span className="font-medium">{item.discountRate.toFixed(1)}%</span> (₹{item.discountAmount.toFixed(2)} total)</span>
                                            <span>Taxable Amount: <span className="font-medium">₹{item.taxableAmount.toFixed(2)}</span></span>
                                        </div>
                                        <div className="text-xs mt-1 grid grid-cols-2 gap-x-3">
                                            <span>GST Breakdown:</span>
                                            <span>Total GST: <span className="font-medium">₹{item.gstAmount.toFixed(2)}</span></span>

                                            {customerStateCode !== SELLER_STATE_CODE ? (
                                                <span className="col-span-2 text-[10px] text-muted-foreground">
                                                    IGST: {item.iGstRate.toFixed(1)}% (₹{item.iGstAmount.toFixed(2)})
                                                </span>
                                            ) : (
                                                <span className="col-span-2 text-[10px] text-muted-foreground">
                                                    CGST: {item.cGstRate.toFixed(1)}% (₹{item.cGstAmount.toFixed(2)}), 
                                                    SGST: {item.sGstRate.toFixed(1)}% (₹{item.sGstAmount.toFixed(2)})
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs mt-1 font-medium">
                                            Total Amount: ₹{item.totalAmount.toFixed(2)}
                                        </p>
                                    </div>
                                    <div className="flex flex-col items-end sm:ml-4 shrink-0 space-y-1 mt-2 sm:mt-0 w-full sm:w-auto">
                                        <div className="text-xs">Qty: {item.quantity}</div>
                                        <p className="font-semibold text-base text-right">₹{item.finalItemPrice.toFixed(2)}</p>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
                  <div className="mt-4 pt-4 border-t">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                        <p>Subtotal (MRP):</p><p className="text-right font-medium">₹{calculateOrderSubtotalPreTax().toFixed(2)}</p>
                        <p>Total Discount:</p><p className="text-right font-medium text-green-600">- ₹{calculateTotalLineDiscountPreTax().toFixed(2)}</p>
                        <p>Total Taxable Amount:</p><p className="text-right font-medium">₹{orderItems.reduce((sum, item) => sum + item.taxableAmount, 0).toFixed(2)}</p>
                        <p>Total GST:</p><p className="text-right font-medium">₹{calculateTotalOrderGst().toFixed(2)}</p>

                        {customerStateCode !== SELLER_STATE_CODE ? (
                            <>
                                <p className="text-xs text-muted-foreground">IGST:</p>
                                <p className="text-xs text-muted-foreground text-right">₹{orderItems.reduce((sum, item) => sum + item.iGstAmount, 0).toFixed(2)}</p>
                            </>
                        ) : (
                            <>
                                <p className="text-xs text-muted-foreground">CGST:</p>
                                <p className="text-xs text-muted-foreground text-right">₹{orderItems.reduce((sum, item) => sum + item.cGstAmount, 0).toFixed(2)}</p>
                                <p className="text-xs text-muted-foreground">SGST:</p>
                                <p className="text-xs text-muted-foreground text-right">₹{orderItems.reduce((sum, item) => sum + item.sGstAmount, 0).toFixed(2)}</p>
                            </>
                        )}

                        <p className="text-xl font-bold mt-1">Grand Total:</p>
                        <p className="text-xl font-bold text-right mt-1">₹{orderItems.reduce((sum, item) => sum + item.totalAmount, 0).toFixed(2)}</p>
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
