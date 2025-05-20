import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Search, UploadCloud, Filter, Edit2, Trash2, DollarSign } from "lucide-react";

const procurements = [
  { id: "PROC001", vendor: "Tech Supplies Inc.", date: "2024-07-15", totalAmount: "$1,500.00", status: "Paid", items: 10, invoice: "INV-TS001.pdf" },
  { id: "PROC002", vendor: "Office Goods Ltd.", date: "2024-07-18", totalAmount: "$750.00", status: "Pending Payment", items: 5, invoice: "INV-OG002.pdf" },
  { id: "PROC003", vendor: "Raw Materials Co.", date: "2024-07-20", totalAmount: "$3,200.00", status: "Partially Paid", items: 20, invoice: "INV-RM003.pdf" },
  { id: "PROC004", vendor: "Packaging Solutions", date: "2024-07-21", totalAmount: "$500.00", status: "Draft", items: 2, invoice: null },
];

export default function ProcurementsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Procurement Tracking</h1>
          <p className="text-muted-foreground">Manage vendor purchases, invoices, and payments.</p>
        </div>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> New Procurement
        </Button>
      </div>

      <Card className="shadow-md">
        <CardHeader>
           <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <CardTitle>All Procurements</CardTitle>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-grow md:flex-grow-0">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="search" placeholder="Search procurements..." className="pl-8 w-full md:w-[250px]" />
              </div>
              <Button variant="outline">
                <Filter className="mr-2 h-4 w-4" /> Filters
              </Button>
            </div>
          </div>
          <CardDescription>Track your purchases, vendor details, and payment statuses.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {procurements.map((proc) => (
                <TableRow key={proc.id}>
                  <TableCell className="font-medium">{proc.id}</TableCell>
                  <TableCell>{proc.vendor}</TableCell>
                  <TableCell>{proc.date}</TableCell>
                  <TableCell>{proc.items}</TableCell>
                  <TableCell>{proc.totalAmount}</TableCell>
                  <TableCell>
                    {proc.invoice ? (
                      <Button variant="link" size="sm" className="p-0 h-auto">
                        {proc.invoice}
                      </Button>
                    ) : (
                      <span className="text-muted-foreground text-xs">N/A</span>
                    )}
                  </TableCell>
                  <TableCell>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                      proc.status === "Paid" ? "bg-green-100 text-green-700" :
                      proc.status === "Pending Payment" ? "bg-orange-100 text-orange-700" :
                      proc.status === "Partially Paid" ? "bg-yellow-100 text-yellow-700" :
                      "bg-gray-100 text-gray-700" // Draft
                    }`}>
                      {proc.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="hover:text-primary" title="Edit">
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    {proc.invoice === null && (
                    <Button variant="ghost" size="icon" className="hover:text-primary" title="Upload Invoice">
                      <UploadCloud className="h-4 w-4" />
                    </Button>
                    )}
                     <Button variant="ghost" size="icon" className="hover:text-accent" title="Track Payment">
                      <DollarSign className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="hover:text-destructive" title="Delete">
                      <Trash2 className="h-4 w-4" />
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
            <CardTitle>Procurement Process Tools</CardTitle>
            <CardDescription>Features for efficient procurement management.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
            <p className="text-sm">Vendor selection and item addition functionalities will be part of the new procurement flow.</p>
            <p className="text-sm">Invoice uploading and robust payment status tracking (Paid, Pending, Partially Paid) will be available.</p>
        </CardContent>
      </Card>
    </div>
  );
}
