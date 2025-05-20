
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Search, Edit3, Trash2, Filter } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const products = [
  { id: "PROD001", name: "Premium Wireless Mouse", category: "Electronics", price: "$49.99", stock: 120, status: "Active", image: "https://placehold.co/40x40.png", dataAiHint: "computer mouse" },
  { id: "PROD002", name: "Ergonomic Keyboard", category: "Electronics", price: "$79.99", stock: 75, status: "Active", image: "https://placehold.co/40x40.png", dataAiHint: "keyboard" },
  { id: "PROD003", name: "Organic Cotton T-Shirt", category: "Apparel", price: "$24.99", stock: 300, status: "Active", image: "https://placehold.co/40x40.png", dataAiHint: "tshirt" },
  { id: "PROD004", name: "Stainless Steel Water Bottle", category: "Home Goods", price: "$19.99", stock: 0, status: "Out of Stock", image: "https://placehold.co/40x40.png", dataAiHint: "water bottle" },
  { id: "PROD005", name: "Leather Wallet", category: "Accessories", price: "$39.99", stock: 50, status: "Draft", image: "https://placehold.co/40x40.png", dataAiHint: "wallet" },
];

export default function ProductsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Product Management</h1>
          <p className="text-muted-foreground">Manage your product inventory, variants, and details.</p>
        </div>
        <Link href="/products/new" passHref>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Product
          </Button>
        </Link>
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <CardTitle>All Products</CardTitle>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-grow md:flex-grow-0">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="search" placeholder="Search products..." className="pl-8 w-full md:w-[250px]" />
              </div>
              <Button variant="outline">
                <Filter className="mr-2 h-4 w-4" /> Filters
              </Button>
            </div>
          </div>
          <CardDescription>View, edit, and manage all your products.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Image</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <Image src={product.image} alt={product.name} width={40} height={40} className="rounded-md" data-ai-hint={product.dataAiHint} />
                  </TableCell>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>{product.category}</TableCell>
                  <TableCell>{product.price}</TableCell>
                  <TableCell>{product.stock}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      product.status === "Active" ? "bg-green-100 text-green-700" : 
                      product.status === "Out of Stock" ? "bg-red-100 text-red-700" : 
                      "bg-yellow-100 text-yellow-700" // Draft or other statuses
                    }`}>
                      {product.status}
                    </span>
                  </TableCell>
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
        </CardContent>
      </Card>
       {/* Placeholder for inline creation capabilities during order taking can be a note or a modal trigger */}
      <Card className="shadow-md">
        <CardHeader>
            <CardTitle>Quick Product Creation</CardTitle>
            <CardDescription>For quickly adding draft products, e.g., during order taking.</CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-sm text-muted-foreground">
                Feature for inline product creation (e.g. in a modal during order entry) will be implemented here.
                This allows users to quickly add a draft product with minimal details if it's not found during an order.
            </p>
             <Button variant="secondary" className="mt-4">
              <PlusCircle className="mr-2 h-4 w-4" /> Create Draft Product
            </Button>
        </CardContent>
      </Card>
    </div>
  );
}
