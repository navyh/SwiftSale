
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, Edit3, Trash2, Settings as SettingsIcon, FolderTree, BellRing, UsersRound, ListChecks, CreditCard, FileText as InventoryIcon, Tag, Scale } from "lucide-react";
import {
  fetchProductBrands, createProductBrand, updateProductBrand, deleteProductBrand, type Brand,
  fetchProductCategoriesTree, createProductCategory, updateProductCategory, deleteProductCategory, type Category, type ProductCategoryNode, fetchProductCategoriesFlat,
  fetchProductUnits, createProductUnit, updateProductUnit, deleteProductUnit, type ProductUnit,
  fetchNotificationTemplates, createNotificationTemplate, updateNotificationTemplate, deleteNotificationTemplate, type NotificationTemplate,
  fetchOrderStatuses, fetchPaymentTypes, fetchInventoryAdjustmentReasons, fetchUserRolesMeta,
  type OrderStatus, type PaymentType, type InventoryAdjustmentReason, type UserRoleMeta,
  type MetaItem
} from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type SettingCategoryKey =
  | 'productBrands'
  | 'productCategories'
  | 'productUnits'
  | 'notificationTemplates'
  | 'orderStatuses'
  | 'paymentTypes'
  | 'inventoryAdjustmentReasons'
  | 'userRolesMeta';

type SettingItemUnion = Brand | Category | ProductUnit | NotificationTemplate | ProductCategoryNode | InventoryAdjustmentReason | string;

interface EditDialogState {
  isOpen: boolean;
  item: SettingItemUnion | null;
  categoryKey: SettingCategoryKey | null;
  mode: 'add' | 'edit';
}

const categoryIcons: Record<SettingCategoryKey, React.ElementType> = {
  productBrands: Tag,
  productCategories: FolderTree,
  productUnits: Scale,
  notificationTemplates: BellRing,
  orderStatuses: ListChecks,
  paymentTypes: CreditCard,
  inventoryAdjustmentReasons: InventoryIcon,
  userRolesMeta: UsersRound,
};

const categoryDisplayNames: Record<SettingCategoryKey, string> = {
  productBrands: "Brand",
  productCategories: "Category",
  productUnits: "Unit",
  notificationTemplates: "Notification Template",
  orderStatuses: "Order Status",
  paymentTypes: "Payment Type",
  inventoryAdjustmentReasons: "Inventory Adj. Reason",
  userRolesMeta: "User Role (System)",
};

const flattenCategoriesForTable = (nodes: ProductCategoryNode[], depth = 0): (ProductCategoryNode & { displayName: string; depth: number })[] => {
  let flatList: (ProductCategoryNode & { displayName: string; depth: number })[] = [];
  nodes.forEach(node => {
    const prefix = depth > 0 ? '\u00A0\u00A0'.repeat(depth) + '↳ ' : '';
    const displayName = prefix + node.name;
    flatList.push({ ...node, displayName, depth });
    if (node.children && node.children.length > 0) {
      flatList = flatList.concat(flattenCategoriesForTable(node.children, depth + 1));
    }
  });
  return flatList;
};


const SettingSection = ({
  title,
  categoryKey,
  onEdit,
  forceRefreshKey,
  isEditable = true,
}: {
  title: string;
  categoryKey: SettingCategoryKey;
  onEdit: (item: SettingItemUnion | null, mode: 'add' | 'edit', key: SettingCategoryKey) => void;
  forceRefreshKey: number;
  isEditable?: boolean;
}) => {
  const Icon = categoryIcons[categoryKey];
  const { toast } = useToast();
  const [items, setItems] = React.useState<SettingItemUnion[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    let data: SettingItemUnion[] = [];
    try {
      switch (categoryKey) {
        case 'productBrands': data = await fetchProductBrands(); break;
        case 'productCategories':
          const treeData = await fetchProductCategoriesTree();
          data = flattenCategoriesForTable(treeData);
          break;
        case 'productUnits': data = await fetchProductUnits(); break;
        case 'notificationTemplates': data = await fetchNotificationTemplates(); break;
        case 'orderStatuses': data = await fetchOrderStatuses(); break;
        case 'paymentTypes': data = await fetchPaymentTypes(); break;
        case 'inventoryAdjustmentReasons': data = await fetchInventoryAdjustmentReasons(); break;
        case 'userRolesMeta': data = await fetchUserRolesMeta(); break;
        default: throw new Error("Invalid category key: " + categoryKey);
      }
      setItems(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || `Failed to fetch ${title.toLowerCase()}.`);
      toast({ title: "Error", description: err.message || `Failed to fetch ${title.toLowerCase()}.`, variant: "destructive" });
      setItems([]); 
    } finally {
      setIsLoading(false);
    }
  }, [categoryKey, title, toast]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData, forceRefreshKey]);

  const handleDelete = async (itemToDelete: SettingItemUnion) => {
    if (!isEditable || typeof itemToDelete === 'string' || !('id' in itemToDelete)) { 
        toast({title: "Info", description: `${categoryDisplayNames[categoryKey]} are system-defined and cannot be deleted.`, variant: "default"});
        return;
    }
    const itemId = itemToDelete.id;
    const itemName = itemToDelete.name;

    try {
      switch (categoryKey) {
        case 'productBrands': await deleteProductBrand(itemId); break;
        case 'productCategories': await deleteProductCategory(itemId); break;
        case 'productUnits': await deleteProductUnit(itemId); break;
        case 'notificationTemplates': await deleteNotificationTemplate(itemId); break;
        default: throw new Error("Invalid category key for delete or non-deletable item: " + categoryKey);
      }
      toast({title: "Success", description: `${categoryDisplayNames[categoryKey]} "${itemName}" deleted.`});
      fetchData(); 
    } catch (err: any) {      toast({title: "Error", description: err.message || `Failed to delete ${categoryDisplayNames[categoryKey]} "${itemName}".`, variant: "destructive"});
    }
  };

  const renderAdditionalHeaders = () => {
    if (categoryKey === 'notificationTemplates') return <TableHead className="hidden md:table-cell">Type</TableHead>;
    if (categoryKey === 'userRolesMeta' && typeof items[0] !== 'string' && items[0] && 'permissions' in items[0]) {
        return <TableHead className="hidden md:table-cell">Permissions</TableHead>;
    }
    return null;
  };

  const renderAdditionalCells = (item: SettingItemUnion) => {
    if (typeof item === 'string') return null; 

    if (categoryKey === 'notificationTemplates' && (item as NotificationTemplate).type) {
       return <TableCell className="hidden md:table-cell">{(item as NotificationTemplate).type}</TableCell>;
    }
    if (categoryKey === 'userRolesMeta' && (item as UserRoleMeta) && (item as any).permissions) {
      const permissions = (item as any).permissions;
      return <TableCell className="hidden md:table-cell text-xs truncate max-w-xs">{Array.isArray(permissions) ? permissions.join(', ') : 'N/A'}</TableCell>;
    }
    return null;
  };

  const getName = (item: SettingItemUnion) => {
    if (typeof item === 'string') return item;
    if (categoryKey === 'productCategories') return (item as ProductCategoryNode & {displayName: string}).displayName;
    return (item as MetaItem).name;
  }

  const getDescriptionOrEquivalent = (item: SettingItemUnion) => {
    if (typeof item === 'string') return "System Defined"; 
    if (categoryKey === 'notificationTemplates') return (item as NotificationTemplate).subject || 'N/A';
    return (item as MetaItem).description || 'N/A';
  };


  return (
    <Card className="shadow-md">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" />
            <CardTitle>{title}</CardTitle>
          </div>
          {isEditable && (
            <Button variant="outline" size="sm" onClick={() => onEdit(null, 'add', categoryKey)}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add New {categoryDisplayNames[categoryKey]}
            </Button>
          )}
        </div>
        <CardDescription>Manage all {title.toLowerCase()} for your system.</CardDescription>
      </CardHeader>
      <CardContent>
        {error && <p className="text-destructive text-center py-4">{error}</p>}
        {isLoading ? (
           <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                {renderAdditionalHeaders()}
                {(categoryKey !== 'userRolesMeta' && categoryKey !== 'orderStatuses' && categoryKey !== 'paymentTypes') || (categoryKey === 'userRolesMeta' && items.length > 0 && typeof items[0] !== 'string' && 'description' in items[0]) ? <TableHead className="hidden md:table-cell">Details</TableHead> : null}
                {isEditable && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({length: 3}).map((_, i) => (
                <TableRow key={`skeleton-setting-${categoryKey}-${i}`}>
                  <TableCell><Skeleton className="h-4 w-3/4" /></TableCell>
                  {renderAdditionalHeaders() && <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-1/2" /></TableCell>}
                  {(categoryKey !== 'userRolesMeta' && categoryKey !== 'orderStatuses' && categoryKey !== 'paymentTypes') || (categoryKey === 'userRolesMeta' && items.length > 0 && typeof items[0] !== 'string' && 'description' in items[0]) ? <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-full" /></TableCell> : null}
                  {isEditable && <TableCell className="text-right space-x-1"><Skeleton className="h-8 w-8 inline-block rounded-sm" /><Skeleton className="h-8 w-8 inline-block rounded-sm" /></TableCell>}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : items.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                {renderAdditionalHeaders()}
                {(categoryKey !== 'userRolesMeta' && categoryKey !== 'orderStatuses' && categoryKey !== 'paymentTypes') || (categoryKey === 'userRolesMeta' && items.length > 0 && typeof items[0] !== 'string' && 'description' in items[0]) ? <TableHead className="hidden md:table-cell">Details</TableHead> : null}
                {isEditable && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, index) => (
                <TableRow key={typeof item === 'string' ? `${item}-${index}` : item.id}>
                  <TableCell className="font-medium">
                    {getName(item)}
                  </TableCell>
                  {renderAdditionalCells(item)}
                  {(categoryKey !== 'userRolesMeta' && categoryKey !== 'orderStatuses' && categoryKey !== 'paymentTypes') || (categoryKey === 'userRolesMeta' && typeof item !== 'string' && 'description' in item) ? 
                    <TableCell className="hidden md:table-cell truncate max-w-xs">
                        {getDescriptionOrEquivalent(item)}
                    </TableCell>
                   : null}
                  {isEditable && typeof item !== 'string' && 'id' in item && (
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" className="hover:text-primary h-8 w-8" onClick={() => onEdit(item, 'edit', categoryKey)}>
                        <Edit3 className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="hover:text-destructive h-8 w-8">
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the {categoryDisplayNames[categoryKey].toLowerCase()} "{getName(item)}".
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(item)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">No {title.toLowerCase()} found or added yet.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default function SettingsPage() {
  const { toast } = useToast();
  const [dialogState, setDialogState] = React.useState<EditDialogState>({ isOpen: false, item: null, categoryKey: null, mode: 'add' });
  const [forceRefreshKey, setForceRefreshKey] = React.useState(0);

  const [itemName, setItemName] = React.useState('');
  const [itemDescription, setItemDescription] = React.useState('');
  const [itemSubject, setItemSubject] = React.useState(''); 
  const [itemBody, setItemBody] = React.useState('');       
  const [itemType, setItemType] = React.useState('');         
  const [itemParentId, setItemParentId] = React.useState<string | null>(null);

  const [flatCategoriesForDialog, setFlatCategoriesForDialog] = React.useState<Category[]>([]);
  const [isLoadingDialogData, setIsLoadingDialogData] = React.useState(false);


  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    const loadDialogDropdownData = async () => {
      if (dialogState.categoryKey === 'productCategories' && dialogState.isOpen) {
        setIsLoadingDialogData(true);
        try {
          const categories = await fetchProductCategoriesFlat(); 
          setFlatCategoriesForDialog(categories);
        } catch (error) {
          toast({ title: "Error", description: "Failed to load categories for dropdown.", variant: "destructive" });
          setFlatCategoriesForDialog([]);
        } finally {
          setIsLoadingDialogData(false);
        }
      }
    };
    loadDialogDropdownData();
  }, [dialogState.isOpen, dialogState.categoryKey, toast]);

  const handleEditOpen = (item: SettingItemUnion | null, mode: 'add' | 'edit', categoryKey: SettingCategoryKey) => {
    if (typeof item === 'string') { 
        toast({title: "Info", description: `${categoryDisplayNames[categoryKey]} are system-defined and cannot be edited here.`, variant: "default"});
        return;
    }

    setItemName(item?.name || '');
    const desc = (item as MetaItem)?.description || '';
    setItemDescription(desc);

    const ntItem = item as NotificationTemplate | null;
    setItemSubject(ntItem?.subject || '');
    setItemBody(ntItem?.body || '');
    setItemType(ntItem?.type || '');

    const catItem = item as ProductCategoryNode | Category | null; 
    setItemParentId(catItem?.parentId?.toString() || null);


    setDialogState({ isOpen: true, item, categoryKey, mode });
  };

  const handleDialogClose = () => {
    setDialogState({ isOpen: false, item: null, categoryKey: null, mode: 'add' });
    setItemName(''); setItemDescription('');
    setItemSubject(''); setItemBody(''); setItemType(''); setItemParentId(null);
  };

  const handleDialogSubmit = async () => {
    if (!dialogState.categoryKey || !itemName.trim()) {
      toast({ title: "Validation Error", description: "Name is required.", variant: "destructive" });
      return;
    }
    if (dialogState.categoryKey === 'notificationTemplates' && (!itemSubject.trim() || !itemBody.trim() || !itemType.trim())) {
       toast({ title: "Validation Error", description: "For Notification Templates, Name, Subject, Body, and Type are required.", variant: "destructive" });
       return;
    }

    setIsSubmitting(true);
    let payload: any = { name: itemName.trim() };

    if (dialogState.categoryKey && ['productBrands', 'productCategories', 'productUnits', 'inventoryAdjustmentReasons'].includes(dialogState.categoryKey)) {
      if (itemDescription.trim()) payload.description = itemDescription.trim();
    }
    
    if (dialogState.categoryKey === 'inventoryAdjustmentReasons' && dialogState.mode === 'add') {
        toast({title: "Info", description: "Creating Inventory Adjustment Reasons is not yet implemented.", variant:"default"});
        setIsSubmitting(false);
        return;
    }


    if (dialogState.categoryKey === 'productCategories') {
        payload.parentId = itemParentId ? parseInt(itemParentId, 10) : null;
        if (dialogState.mode === 'edit' && dialogState.item && typeof dialogState.item !== 'string' && 'id' in dialogState.item && dialogState.item.id === payload.parentId) {
            toast({ title: "Validation Error", description: "A category cannot be its own parent.", variant: "destructive" });
            setIsSubmitting(false);
            return;
        }
    }

    if (dialogState.categoryKey === 'notificationTemplates') {
      payload = { ...payload, subject: itemSubject.trim(), body: itemBody.trim(), type: itemType.trim() };
    }


    try {
      const currentItem = dialogState.item;
      if (dialogState.mode === 'add') {
        switch(dialogState.categoryKey) {
          case 'productBrands': await createProductBrand(payload); break;
          case 'productCategories': await createProductCategory(payload); break; 
          case 'productUnits': await createProductUnit(payload); break;
          case 'notificationTemplates': await createNotificationTemplate(payload); break;
          default: throw new Error("Invalid category key for create or non-creatable item: " + dialogState.categoryKey);
        }
        toast({ title: "Success", description: `${categoryDisplayNames[dialogState.categoryKey]} added successfully.` });
      } else if (currentItem && typeof currentItem !== 'string' && 'id' in currentItem) { 
         let currentItemId = currentItem.id;
        switch(dialogState.categoryKey) {
          case 'productBrands': await updateProductBrand(currentItemId, payload); break;
          case 'productCategories': await updateProductCategory(currentItemId, payload); break;
          case 'productUnits': await updateProductUnit(currentItemId, payload); break;
          case 'notificationTemplates': await updateNotificationTemplate(currentItemId, payload); break;
          default: throw new Error("Invalid category key for update or non-updatable item: " + dialogState.categoryKey);
        }
        toast({ title: "Success", description: `${categoryDisplayNames[dialogState.categoryKey]} updated successfully.` });
      }
      setForceRefreshKey(prev => prev + 1); 
      handleDialogClose();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || `Failed to save ${categoryDisplayNames[dialogState.categoryKey!]?.toLowerCase()}.`, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const editableCategories: SettingCategoryKey[] = ['productBrands', 'productCategories', 'productUnits', 'notificationTemplates'];
  const isDialogCategoryEditable = dialogState.categoryKey ? editableCategories.includes(dialogState.categoryKey) : false;


  return (
    <div className="space-y-8 pb-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center">
            <SettingsIcon className="mr-3 h-7 w-7" /> Application Settings
          </h1>
          <p className="text-muted-foreground">Centralized configuration for system metadata.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <SettingSection title="Product Brands" categoryKey="productBrands" onEdit={handleEditOpen} forceRefreshKey={forceRefreshKey} isEditable={true} />
        <SettingSection title="Product Categories" categoryKey="productCategories" onEdit={handleEditOpen} forceRefreshKey={forceRefreshKey} isEditable={true} />
        <SettingSection title="Product Units" categoryKey="productUnits" onEdit={handleEditOpen} forceRefreshKey={forceRefreshKey} isEditable={true} />
        <SettingSection title="Notification Templates" categoryKey="notificationTemplates" onEdit={handleEditOpen} forceRefreshKey={forceRefreshKey} isEditable={true} />

        <SettingSection title="Order Statuses" categoryKey="orderStatuses" onEdit={handleEditOpen} forceRefreshKey={forceRefreshKey} isEditable={false} />
        <SettingSection title="Payment Types" categoryKey="paymentTypes" onEdit={handleEditOpen} forceRefreshKey={forceRefreshKey} isEditable={false} />
        <SettingSection title="Inventory Adj. Reasons" categoryKey="inventoryAdjustmentReasons" onEdit={handleEditOpen} forceRefreshKey={forceRefreshKey} isEditable={false} /> 
        <SettingSection title="User Roles (System)" categoryKey="userRolesMeta" onEdit={handleEditOpen} forceRefreshKey={forceRefreshKey} isEditable={false} />
      </div>
       <p className="text-xs text-muted-foreground mt-8 text-center">
        Settings are managed via API endpoints. Changes reflect across the application.
      </p>

      <Dialog open={dialogState.isOpen && isDialogCategoryEditable} onOpenChange={(isOpen) => { if (!isOpen) handleDialogClose(); else setDialogState(prev => ({...prev, isOpen: true})); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{dialogState.mode === 'add' ? 'Add New' : 'Edit'} {dialogState.categoryKey ? categoryDisplayNames[dialogState.categoryKey] : ''}</DialogTitle>
            <DialogDescription>
              {dialogState.mode === 'add' ? 'Create a new' : 'Make changes to your'} {dialogState.categoryKey ? categoryDisplayNames[dialogState.categoryKey].toLowerCase() : ''} here. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Name*</Label>
              <Input id="name" value={itemName} onChange={(e) => setItemName(e.target.value)} className="col-span-3" placeholder={`${dialogState.categoryKey ? categoryDisplayNames[dialogState.categoryKey] : ''} name`} />
            </div>

            {dialogState.categoryKey && ['productBrands', 'productCategories', 'productUnits', 'inventoryAdjustmentReasons'].includes(dialogState.categoryKey) && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">Description</Label>
                <Textarea id="description" value={itemDescription} onChange={(e) => setItemDescription(e.target.value)} className="col-span-3" placeholder="Optional description" />
              </div>
            )}

            {dialogState.categoryKey === 'productCategories' && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="parentId" className="text-right">Parent Category</Label>
                <Select
                  value={itemParentId || ""} 
                  onValueChange={(value) => setItemParentId(value === "null" || value === "" ? null : value)} 
                  disabled={isLoadingDialogData}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder={isLoadingDialogData ? "Loading..." : "Select parent category"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="null">-- No Parent --</SelectItem>
                    {flatCategoriesForDialog
                      .filter(cat => typeof dialogState.item !== 'string' && dialogState.item?.id !== cat.id) 
                      .map(cat => (
                        <SelectItem key={cat.id} value={cat.id.toString()}>
                          {cat.name}
                        </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {dialogState.categoryKey === 'notificationTemplates' && (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="subject" className="text-right">Subject*</Label>
                  <Input id="subject" value={itemSubject} onChange={(e) => setItemSubject(e.target.value)} className="col-span-3" placeholder="Notification Subject" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="body" className="text-right">Body*</Label>
                  <Textarea id="body" value={itemBody} onChange={(e) => setItemBody(e.target.value)} className="col-span-3" placeholder="Notification Body Content" rows={5}/>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="type" className="text-right">Type*</Label>
                  <Input id="type" value={itemType} onChange={(e) => setItemType(e.target.value)} className="col-span-3" placeholder="e.g., EMAIL, SMS (as per API)" />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" onClick={handleDialogSubmit} disabled={isSubmitting || isLoadingDialogData}>
              {isSubmitting ? (dialogState.mode === 'add' ? 'Adding...' : 'Saving...') : (dialogState.mode === 'add' ? 'Add' : 'Save Changes')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

    
