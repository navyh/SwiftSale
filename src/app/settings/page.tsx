
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
import { PlusCircle, Edit3, Trash2, Palette, Tag, Ruler, Scale, Settings as SettingsIcon } from "lucide-react";
import { fetchBrands, fetchCategories, fetchSizes, fetchUnits, fetchColors, createMetaItem, updateMetaItem, deleteMetaItem, MetaItem, MetaColorItem } from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type SettingCategoryKey = 'brands' | 'categories' | 'sizes' | 'units' | 'colors';
type SettingItemUnion = MetaItem | MetaColorItem;

interface EditDialogState {
  isOpen: boolean;
  item: SettingItemUnion | null;
  categoryKey: SettingCategoryKey | null;
  mode: 'add' | 'edit';
}

const categoryIcons: Record<SettingCategoryKey, React.ElementType> = {
  brands: Tag,
  categories: Tag,
  sizes: Ruler,
  units: Scale,
  colors: Palette,
};

const categoryDisplayNames: Record<SettingCategoryKey, string> = {
  brands: "Brand",
  categories: "Category",
  sizes: "Size",
  units: "Unit",
  colors: "Color",
};


const SettingSection = ({ 
  title, 
  categoryKey,
  onEdit,
  forceRefreshKey, // Added to help trigger re-fetch
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
        case 'brands': data = await fetchBrands(); break;
        case 'categories': data = await fetchCategories(); break;
        case 'sizes': data = await fetchSizes(); break;
        case 'units': data = await fetchUnits(); break;
        case 'colors': data = await fetchColors(); break;
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
  }, [fetchData, forceRefreshKey]); // Re-fetch when forceRefreshKey changes

  const handleDelete = async (itemId: number) => {
    try {
      await deleteMetaItem(categoryKey, itemId);
      toast({title: "Success", description: `${categoryDisplayNames[categoryKey]} deleted.`});
      setItems(prev => prev.filter(item => item.id !== itemId)); // Optimistic update
    } catch (err: any)      {
      toast({title: "Error", description: err.message || `Failed to delete ${categoryDisplayNames[categoryKey]}.`, variant: "destructive"});
    }
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
        <CardDescription>Manage all {title.toLowerCase()} for your products.</CardDescription>
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
                {categoryKey === 'colors' && <TableHead>Preview</TableHead>}
                {/* Description or Hex Code based on type */}
                <TableHead className="hidden md:table-cell">
                    {categoryKey === 'colors' ? 'Hex Code' : 'Description'}
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  {categoryKey === 'colors' && (item as MetaColorItem).hexCode && (
                    <TableCell>
                      <div style={{ backgroundColor: (item as MetaColorItem).hexCode! }} className="h-5 w-5 rounded-full border"></div>
                    </TableCell>
                  )}
                  <TableCell className="hidden md:table-cell truncate max-w-xs">
                    {categoryKey === 'colors' 
                      ? ((item as MetaColorItem).hexCode || 'N/A')
                      : (item.description || 'N/A')}
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
  const [forceRefreshKey, setForceRefreshKey] = React.useState(0); // Key to trigger re-fetch in sections
  
  // Form state for the dialog
  const [itemName, setItemName] = React.useState('');
  const [itemDescription, setItemDescription] = React.useState('');
  const [itemHexCode, setItemHexCode] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleEditOpen = (item: SettingItemUnion | null, mode: 'add' | 'edit', categoryKey: SettingCategoryKey) => {
    setItemName(item?.name || '');
    setItemDescription(item?.description || ''); // Default to empty string
    if (categoryKey === 'colors' && item) {
      setItemHexCode((item as MetaColorItem).hexCode || '');
    } else {
      setItemHexCode('');
    }
    setDialogState({ isOpen: true, item, categoryKey, mode });
  };

  const handleDialogClose = () => {
    setDialogState({ isOpen: false, item: null, categoryKey: null, mode: 'add' });
    setItemName(''); setItemDescription(''); setItemHexCode('');
  };

  const handleDialogSubmit = async () => {
    if (!dialogState.categoryKey || !itemName.trim()) {
      toast({ title: "Validation Error", description: "Name is required.", variant: "destructive" });
      return;
    }
    if (dialogState.categoryKey === 'colors' && !itemHexCode.match(/^#[0-9A-Fa-f]{6}$/)) { // Basic hex validation
       toast({ title: "Validation Error", description: "Hex code must be in #RRGGBB format.", variant: "destructive" });
       return;
    }

    setIsSubmitting(true);
    const payload: Partial<MetaItem & MetaColorItem> = { name: itemName.trim() };
    
    if (dialogState.categoryKey === 'colors') {
      payload.hexCode = itemHexCode.trim();
    } else {
      // Only add description if it's not for colors and it has content
      if (itemDescription.trim()) {
        payload.description = itemDescription.trim();
      }
    }

    try {
      if (dialogState.mode === 'add') {
        await createMetaItem(dialogState.categoryKey, payload);
        toast({ title: "Success", description: `${categoryDisplayNames[dialogState.categoryKey]} added successfully.` });
      } else if (dialogState.item) {
        await updateMetaItem(dialogState.categoryKey, dialogState.item.id, payload);
        toast({ title: "Success", description: `${categoryDisplayNames[dialogState.categoryKey]} updated successfully.` });
      }
      setForceRefreshKey(prev => prev + 1); // Trigger re-fetch in sections
      handleDialogClose();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || `Failed to save ${categoryDisplayNames[dialogState.categoryKey]}.`, variant: "destructive" });
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
        <SettingSection title="Brands" categoryKey="brands" onEdit={handleEditOpen} forceRefreshKey={forceRefreshKey} />
        <SettingSection title="Categories" categoryKey="categories" onEdit={handleEditOpen} forceRefreshKey={forceRefreshKey} />
        <SettingSection title="Sizes" categoryKey="sizes" onEdit={handleEditOpen} forceRefreshKey={forceRefreshKey} />
        <SettingSection title="Units" categoryKey="units" onEdit={handleEditOpen} forceRefreshKey={forceRefreshKey} />
        <SettingSection title="Colors" categoryKey="colors" onEdit={handleEditOpen} forceRefreshKey={forceRefreshKey} />
        
        <Card className="shadow-md lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5 text-primary" />
              <CardTitle>Other Settings</CardTitle>
            </div>
            <CardDescription>Manage other system-wide configurations.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              General application settings like currency, timezone, notification preferences, API integrations, etc., will be managed here using relevant meta endpoints.
            </p>
             <Button variant="outline" className="mt-4" disabled>
              Configure System Options (Coming Soon)
            </Button>
          </CardContent>
        </Card>
      </div>
       <p className="text-xs text-muted-foreground mt-8 text-center">
        All settings are managed via API endpoints. Adding, editing, or deleting items will reflect across the application.
      </p>

      <Dialog open={dialogState.isOpen} onOpenChange={(isOpen) => { if (!isOpen) handleDialogClose(); else setDialogState(prev => ({...prev, isOpen: true})); }}>
        <DialogContent className="sm:max-w-[425px]">
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
            
            {/* Show Description field for all meta types except Colors */}
            {dialogState.categoryKey && dialogState.categoryKey !== 'colors' && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">Description</Label>
                <Textarea id="description" value={itemDescription} onChange={(e) => setItemDescription(e.target.value)} className="col-span-3" placeholder="Optional description" />
              </div>
            )}

            {/* Show Hex Code field only for Colors */}
            {dialogState.categoryKey === 'colors' && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="hexCode" className="text-right">Hex Code*</Label>
                <Input id="hexCode" value={itemHexCode} onChange={(e) => setItemHexCode(e.target.value)} className="col-span-3" placeholder="#RRGGBB" />
              </div>
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

