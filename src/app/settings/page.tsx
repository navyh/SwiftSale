
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
import { PlusCircle, Edit3, Trash2, Palette, Tag, Ruler, Scale, Settings as SettingsIcon, FolderTree, BellRing } from "lucide-react";
import { 
  fetchProductBrands, createProductBrand, updateProductBrand, deleteProductBrand, type Brand,
  fetchProductCategoriesTree, createProductCategory, updateProductCategory, deleteProductCategory, type Category, type ProductCategoryNode,
  fetchProductUnits, createProductUnit, updateProductUnit, deleteProductUnit, type ProductUnit,
  fetchSizes, fetchColors, 
  createGenericMetaItem, updateGenericMetaItem, deleteGenericMetaItem, 
  type MetaItem, type MetaColorItem, fetchSuppliers, type Supplier,
  fetchNotificationTemplates, createNotificationTemplate, updateNotificationTemplate, deleteNotificationTemplate, type NotificationTemplate
} from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type SettingCategoryKey = 
  | 'productBrands' 
  | 'productCategories' 
  | 'productUnits' 
  | 'sizes' 
  | 'colors' 
  | 'suppliers'
  | 'notificationTemplates';

type SettingItemUnion = Brand | Category | ProductUnit | MetaItem | MetaColorItem | Supplier | NotificationTemplate | ProductCategoryNode;

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
  sizes: Ruler,
  colors: Palette,
  suppliers: UsersRound, // Placeholder icon for suppliers
  notificationTemplates: BellRing,
};

const categoryDisplayNames: Record<SettingCategoryKey, string> = {
  productBrands: "Brand",
  productCategories: "Category",
  productUnits: "Unit",
  sizes: "Size",
  colors: "Color",
  suppliers: "Supplier",
  notificationTemplates: "Notification Template",
};

// Helper to flatten category tree for table display
const flattenCategoriesForTable = (nodes: ProductCategoryNode[], parentName: string | null = null): (ProductCategoryNode & { displayName: string })[] => {
  let flatList: (ProductCategoryNode & { displayName: string })[] = [];
  nodes.forEach(node => {
    const displayName = parentName ? `${parentName} > ${node.name}` : node.name;
    flatList.push({ ...node, displayName });
    if (node.children && node.children.length > 0) {
      flatList = flatList.concat(flattenCategoriesForTable(node.children, displayName));
    }
  });
  return flatList;
};


const SettingSection = ({ 
  title, 
  categoryKey,
  onEdit,
  forceRefreshKey,
}: { 
  title: string; 
  categoryKey: SettingCategoryKey;
  onEdit: (item: SettingItemUnion | null, mode: 'add' | 'edit', key: SettingCategoryKey) => void;
  forceRefreshKey: number;
}) => {
  const Icon = categoryIcons[categoryKey];
  const { toast } = useToast();
  const [items, setItems] = React.useState<SettingItemUnion[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      let data;
      switch (categoryKey) {
        case 'productBrands': data = await fetchProductBrands(); break;
        case 'productCategories': 
          const treeData = await fetchProductCategoriesTree(); 
          data = flattenCategoriesForTable(treeData); // Flatten for table display
          break;
        case 'productUnits': data = await fetchProductUnits(); break;
        case 'sizes': data = await fetchSizes(); break;
        case 'colors': data = await fetchColors(); break;
        case 'suppliers': data = await fetchSuppliers(); break;
        case 'notificationTemplates': data = await fetchNotificationTemplates(); break;
        default: throw new Error("Invalid category key");
      }
      setItems(data as SettingItemUnion[]);
    } catch (err: any) {
      setError(err.message || `Failed to fetch ${title.toLowerCase()}.`);
      toast({ title: "Error", description: err.message || `Failed to fetch ${title.toLowerCase()}.`, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [categoryKey, title, toast]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData, forceRefreshKey]);

  const handleDelete = async (itemId: number) => {
    try {
      switch (categoryKey) {
        case 'productBrands': await deleteProductBrand(itemId); break;
        case 'productCategories': await deleteProductCategory(itemId); break;
        case 'productUnits': await deleteProductUnit(itemId); break;
        case 'sizes': await deleteGenericMetaItem('sizes', itemId); break;
        case 'colors': await deleteGenericMetaItem('colors', itemId); break;
        case 'suppliers': await deleteGenericMetaItem('suppliers', itemId); break;
        case 'notificationTemplates': await deleteNotificationTemplate(itemId); break;
        default: throw new Error("Invalid category key for delete");
      }
      toast({title: "Success", description: `${categoryDisplayNames[categoryKey]} deleted.`});
      setItems(prev => prev.filter(item => item.id !== itemId));
    } catch (err: any) {
      toast({title: "Error", description: err.message || `Failed to delete ${categoryDisplayNames[categoryKey]}.`, variant: "destructive"});
    }
  };

  const renderAdditionalHeaders = () => {
    if (categoryKey === 'colors') return <TableHead>Preview</TableHead>;
    if (categoryKey === 'notificationTemplates') return <TableHead className="hidden md:table-cell">Type</TableHead>;
    return null;
  };

  const renderAdditionalCells = (item: SettingItemUnion) => {
    if (categoryKey === 'colors' && (item as MetaColorItem).hexCode) {
      return (
        <TableCell>
          <div style={{ backgroundColor: (item as MetaColorItem).hexCode! }} className="h-5 w-5 rounded-full border"></div>
        </TableCell>
      );
    }
    if (categoryKey === 'notificationTemplates' && (item as NotificationTemplate).type) {
       return <TableCell className="hidden md:table-cell">{(item as NotificationTemplate).type}</TableCell>;
    }
    return null;
  };

  const getDescriptionOrEquivalent = (item: SettingItemUnion) => {
    if (categoryKey === 'colors') return (item as MetaColorItem).hexCode || 'N/A';
    if (categoryKey === 'notificationTemplates') return (item as NotificationTemplate).subject || 'N/A'; // Show subject instead of description
    if (categoryKey === 'productCategories') return (item as ProductCategoryNode).description || 'N/A';
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
          <Button variant="outline" size="sm" onClick={() => onEdit(null, 'add', categoryKey)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add New {categoryDisplayNames[categoryKey]}
          </Button>
        </div>
        <CardDescription>Manage all {title.toLowerCase()} for your products or system.</CardDescription>
      </CardHeader>
      <CardContent>
        {error && <p className="text-destructive text-center py-4">{error}</p>}
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({length: 3}).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : items.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                {renderAdditionalHeaders()}
                <TableHead className="hidden md:table-cell">
                    {categoryKey === 'colors' ? 'Hex Code' : (categoryKey === 'notificationTemplates' ? 'Subject' : 'Description')}
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    {categoryKey === 'productCategories' ? (item as ProductCategoryNode & {displayName: string}).displayName : item.name}
                  </TableCell>
                  {renderAdditionalCells(item)}
                  <TableCell className="hidden md:table-cell truncate max-w-xs">
                    {getDescriptionOrEquivalent(item)}
                  </TableCell>
                  
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
                            This action cannot be undone. This will permanently delete the {categoryDisplayNames[categoryKey].toLowerCase()} "{item.name}".
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(item.id)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">No {title.toLowerCase()} added yet.</p>
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
  const [itemHexCode, setItemHexCode] = React.useState('');
  // For Notification Templates
  const [itemSubject, setItemSubject] = React.useState('');
  const [itemBody, setItemBody] = React.useState('');
  const [itemType, setItemType] = React.useState('');
  // For Categories
  const [itemParentId, setItemParentId] = React.useState<number | null>(null);


  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleEditOpen = (item: SettingItemUnion | null, mode: 'add' | 'edit', categoryKey: SettingCategoryKey) => {
    setItemName(item?.name || '');
    const desc = (item as MetaItem)?.description || '';
    setItemDescription(desc);
    
    if (categoryKey === 'colors') {
      setItemHexCode((item as MetaColorItem)?.hexCode || '');
    } else {
      setItemHexCode('');
    }
    if (categoryKey === 'notificationTemplates') {
      const ntItem = item as NotificationTemplate | null;
      setItemSubject(ntItem?.subject || '');
      setItemBody(ntItem?.body || '');
      setItemType(ntItem?.type || '');
    } else {
      setItemSubject(''); setItemBody(''); setItemType('');
    }
    if (categoryKey === 'productCategories') {
      setItemParentId((item as Category)?.parentId || null);
    } else {
      setItemParentId(null);
    }
    setDialogState({ isOpen: true, item, categoryKey, mode });
  };

  const handleDialogClose = () => {
    setDialogState({ isOpen: false, item: null, categoryKey: null, mode: 'add' });
    setItemName(''); setItemDescription(''); setItemHexCode('');
    setItemSubject(''); setItemBody(''); setItemType(''); setItemParentId(null);
  };

  const handleDialogSubmit = async () => {
    if (!dialogState.categoryKey || !itemName.trim()) {
      toast({ title: "Validation Error", description: "Name is required.", variant: "destructive" });
      return;
    }
    if (dialogState.categoryKey === 'colors' && !itemHexCode.match(/^#[0-9A-Fa-f]{6}$/)) {
       toast({ title: "Validation Error", description: "Hex code must be in #RRGGBB format.", variant: "destructive" });
       return;
    }
    if (dialogState.categoryKey === 'notificationTemplates' && (!itemSubject.trim() || !itemBody.trim() || !itemType.trim())) {
       toast({ title: "Validation Error", description: "For Notification Templates, Name, Subject, Body, and Type are required.", variant: "destructive" });
       return;
    }


    setIsSubmitting(true);
    let payload: any = { name: itemName.trim() };
    
    if (dialogState.categoryKey !== 'colors' && dialogState.categoryKey !== 'notificationTemplates') {
      if (itemDescription.trim()) payload.description = itemDescription.trim();
    }

    if (dialogState.categoryKey === 'colors') payload.hexCode = itemHexCode.trim();
    
    if (dialogState.categoryKey === 'productCategories') {
        if (itemParentId) payload.parentId = itemParentId; // TODO: Add parentId selector to dialog
    }

    if (dialogState.categoryKey === 'notificationTemplates') {
      payload = { ...payload, subject: itemSubject.trim(), body: itemBody.trim(), type: itemType.trim() };
    }


    try {
      if (dialogState.mode === 'add') {
        switch(dialogState.categoryKey) {
          case 'productBrands': await createProductBrand(payload); break;
          case 'productCategories': await createProductCategory(payload); break;
          case 'productUnits': await createProductUnit(payload); break;
          case 'sizes': await createGenericMetaItem('sizes', payload); break;
          case 'colors': await createGenericMetaItem('colors', payload); break;
          case 'suppliers': await createGenericMetaItem('suppliers', payload); break;
          case 'notificationTemplates': await createNotificationTemplate(payload); break;
          default: throw new Error("Invalid category key for create");
        }
        toast({ title: "Success", description: `${categoryDisplayNames[dialogState.categoryKey]} added successfully.` });
      } else if (dialogState.item) {
        switch(dialogState.categoryKey) {
          case 'productBrands': await updateProductBrand(dialogState.item.id, payload); break;
          case 'productCategories': await updateProductCategory(dialogState.item.id, payload); break;
          case 'productUnits': await updateProductUnit(dialogState.item.id, payload); break;
          case 'sizes': await updateGenericMetaItem('sizes', dialogState.item.id, payload); break;
          case 'colors': await updateGenericMetaItem('colors', dialogState.item.id, payload); break;
          case 'suppliers': await updateGenericMetaItem('suppliers', dialogState.item.id, payload); break;
          case 'notificationTemplates': await updateNotificationTemplate(dialogState.item.id, payload); break;
          default: throw new Error("Invalid category key for update");
        }
        toast({ title: "Success", description: `${categoryDisplayNames[dialogState.categoryKey]} updated successfully.` });
      }
      setForceRefreshKey(prev => prev + 1);
      handleDialogClose();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || `Failed to save ${categoryDisplayNames[dialogState.categoryKey!].toLowerCase()}.`, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <div className="space-y-8 pb-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center">
            <SettingsIcon className="mr-3 h-7 w-7" /> Application Settings
          </h1>
          <p className="text-muted-foreground">Centralized configuration for product attributes and system options.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <SettingSection title="Product Brands" categoryKey="productBrands" onEdit={handleEditOpen} forceRefreshKey={forceRefreshKey} />
        <SettingSection title="Product Categories" categoryKey="productCategories" onEdit={handleEditOpen} forceRefreshKey={forceRefreshKey} />
        <SettingSection title="Product Units" categoryKey="productUnits" onEdit={handleEditOpen} forceRefreshKey={forceRefreshKey} />
        <SettingSection title="Sizes" categoryKey="sizes" onEdit={handleEditOpen} forceRefreshKey={forceRefreshKey} />
        <SettingSection title="Colors" categoryKey="colors" onEdit={handleEditOpen} forceRefreshKey={forceRefreshKey} />
        <SettingSection title="Suppliers" categoryKey="suppliers" onEdit={handleEditOpen} forceRefreshKey={forceRefreshKey} />
        <SettingSection title="Notification Templates" categoryKey="notificationTemplates" onEdit={handleEditOpen} forceRefreshKey={forceRefreshKey} />
        
        <Card className="shadow-md lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5 text-primary" />
              <CardTitle>Other Meta Settings</CardTitle>
            </div>
            <CardDescription>Manage other system-wide classification data.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Order Statuses, Payment Types, Inventory Adjustment Reasons, User Roles will be managed here or in their respective module settings once those UI sections are built.
            </p>
             <Button variant="outline" className="mt-4" disabled>
              Configure Other Meta (Coming Soon)
            </Button>
          </CardContent>
        </Card>
      </div>
       <p className="text-xs text-muted-foreground mt-8 text-center">
        All settings are managed via API endpoints. Adding, editing, or deleting items will reflect across the application.
      </p>

      <Dialog open={dialogState.isOpen} onOpenChange={(isOpen) => { if (!isOpen) handleDialogClose(); else setDialogState(prev => ({...prev, isOpen: true})); }}>
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
            
            {dialogState.categoryKey && dialogState.categoryKey !== 'colors' && dialogState.categoryKey !== 'notificationTemplates' && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">Description</Label>
                <Textarea id="description" value={itemDescription} onChange={(e) => setItemDescription(e.target.value)} className="col-span-3" placeholder="Optional description" />
              </div>
            )}

            {dialogState.categoryKey === 'colors' && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="hexCode" className="text-right">Hex Code*</Label>
                <Input id="hexCode" value={itemHexCode} onChange={(e) => setItemHexCode(e.target.value)} className="col-span-3" placeholder="#RRGGBB" />
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
                  <Input id="type" value={itemType} onChange={(e) => setItemType(e.target.value)} className="col-span-3" placeholder="e.g., EMAIL, SMS" />
                </div>
              </>
            )}
            {/* TODO: Add Parent ID selector for categories if editing/creating them here */}
            {dialogState.categoryKey === 'productCategories' && (
                 <p className="text-xs text-muted-foreground col-span-4 text-center pt-2">
                    Parent category selection will be added later. New categories are created as top-level.
                 </p>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" onClick={handleDialogSubmit} disabled={isSubmitting}>
              {isSubmitting ? (dialogState.mode === 'add' ? 'Adding...' : 'Saving...') : (dialogState.mode === 'add' ? 'Add' : 'Save Changes')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

// Needed for suppliers icon
import { UsersRound } from "lucide-react";

    