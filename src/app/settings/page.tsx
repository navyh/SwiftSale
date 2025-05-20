import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Edit3, Trash2, Palette, Tag, Ruler, Scale, Settings as SettingsIcon } from "lucide-react";

const settingItems = {
  brands: [{ id: "B01", name: "Nike" }, { id: "B02", name: "Adidas" }, {id: "B03", name: "Puma"}],
  categories: [{ id: "C01", name: "Footwear" }, { id: "C02", name: "Apparel" }, {id: "C03", name: "Electronics"}],
  sizes: [{ id: "S01", name: "Small" }, { id: "S02", name: "Medium" }, {id: "S03", name: "Large"}],
  units: [{ id: "U01", name: "pcs" }, { id: "U02", name: "kg" }, { id: "U03", name: "pack"}],
  colors: [{ id: "CL01", name: "Red", hex: "#FF0000" }, { id: "CL02", name: "Blue", hex: "#0000FF" }, {id: "CL03", name: "Green", hex: "#008000"}],
};

type SettingItem = { id: string; name: string; hex?: string };
type SettingCategory = keyof typeof settingItems;

const categoryIcons: Record<SettingCategory, React.ElementType> = {
  brands: Tag,
  categories: Tag,
  sizes: Ruler,
  units: Scale,
  colors: Palette,
};

const SettingSection = ({ title, items, categoryKey }: { title: string; items: SettingItem[]; categoryKey: SettingCategory }) => {
  const Icon = categoryIcons[categoryKey];
  return (
    <Card className="shadow-md">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" />
            <CardTitle>{title}</CardTitle>
          </div>
          <Button variant="outline" size="sm">
            <PlusCircle className="mr-2 h-4 w-4" /> Add New {title.slice(0, -1)}
          </Button>
        </div>
        <CardDescription>Manage all {title.toLowerCase()} for your products.</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                {categoryKey === 'colors' && <TableHead>Preview</TableHead>}
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  {categoryKey === 'colors' && item.hex && (
                    <TableCell>
                      <div style={{ backgroundColor: item.hex }} className="h-5 w-5 rounded-full border"></div>
                    </TableCell>
                  )}
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="hover:text-primary">
                      <Edit3 className="h-4 w-4" />
                       <span className="sr-only">Edit</span>
                    </Button>
                    <Button variant="ghost" size="icon" className="hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                       <span className="sr-only">Delete</span>
                    </Button>
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
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Application Settings</h1>
          <p className="text-muted-foreground">Centralized configuration for product attributes and system options.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <SettingSection title="Brands" items={settingItems.brands} categoryKey="brands" />
        <SettingSection title="Categories" items={settingItems.categories} categoryKey="categories" />
        <SettingSection title="Sizes" items={settingItems.sizes} categoryKey="sizes" />
        <SettingSection title="Units" items={settingItems.units} categoryKey="units" />
        <SettingSection title="Colors" items={settingItems.colors} categoryKey="colors" />
        
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
             <Button variant="outline" className="mt-4">
              Configure System Options
            </Button>
          </CardContent>
        </Card>
      </div>
       <p className="text-sm text-muted-foreground mt-8">
        All settings will be managed using meta endpoints as specified.
      </p>
    </div>
  );
}
