import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Search, Eye, Filter, UserPlus, ShoppingBag } from "lucide-react";

const orders = [
  { id: "ORD001", customer: "Alice Wonderland", date: "2024-07-20", total: "$125.50", status: "Processing", items: 3 },
  { id: "ORD002", customer: "Bob The Builder", date: "2024-07-19", total: "$89.99", status: "Shipped", items: 2 },
  { id: "ORD003", customer: "Charlie Brown", date: "2024-07-19", total: "$240.00", status: "Delivered", items: 5 },
  { id: "ORD004", customer: "Diana Prince", date: "2024-07-18", total: "$45.75", status: "Pending", items: 1 },
  { id: "ORD005", customer: "Edward Scissorhands", date: "2024-07-17", total: "$199.00", status: "Cancelled", items: 4 },
];

export default function OrdersPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Order Management</h1>
          <p className="text-muted-foreground">Streamlined order processing and tracking.</p>
        </div>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> Create New Order
        </Button>
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
             <CardTitle>All Orders</CardTitle>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-grow md:flex-grow-0">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="search" placeholder="Search orders..." className="pl-8 w-full md:w-[250px]" />
              </div>
              <Button variant="outline">
                <Filter className="mr-2 h-4 w-4" /> Filters
              </Button>
            </div>
          </div>
          <CardDescription>View, manage, and track all customer orders.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.id}</TableCell>
                  <TableCell>{order.customer}</TableCell>
                  <TableCell>{order.date}</TableCell>
                  <TableCell>{order.items}</TableCell>
                  <TableCell>{order.total}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      order.status === "Delivered" ? "bg-green-100 text-green-700" :
                      order.status === "Shipped" ? "bg-blue-100 text-blue-700" :
                      order.status === "Processing" ? "bg-yellow-100 text-yellow-700" :
                      order.status === "Pending" ? "bg-orange-100 text-orange-700" :
                      "bg-red-100 text-red-700" // Cancelled
                    }`}>
                      {order.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="hover:text-primary">
                      <Eye className="h-4 w-4" />
                       <span className="sr-only">View Order</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <Card className="shadow-md">
        <CardHeader>
            <CardTitle>Order Creation Tools</CardTitle>
            <CardDescription>Quickly add products and manage customers during order creation.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-primary"/>
                <p className="text-sm">Quick product search and addition during order taking will be available here.</p>
            </div>
            <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary"/>
                <p className="text-sm">Customer selection or on-the-fly creation will be integrated here.</p>
            </div>
            <p className="text-sm text-muted-foreground">Real-time updates to ensure order accuracy will be a core part of the order creation flow.</p>
        </CardContent>
      </Card>
    </div>
  );
}
