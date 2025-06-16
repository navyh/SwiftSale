"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  UploadCloud, 
  DollarSign, 
  Loader2, 
  Calendar, 
  FileText, 
  Building, 
  Package, 
  Clock 
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  fetchProcurementById,
  deleteProcurement,
  updateProcurementStatus,
  type ProcurementDto
} from "@/lib/apiClient";

export default function ProcurementDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { toast } = useToast();
  const [procurement, setProcurement] = useState<ProcurementDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Fetch procurement details
  useEffect(() => {
    const loadProcurement = async () => {
      setIsLoading(true);
      try {
        const data = await fetchProcurementById(params.id);
        setProcurement(data);
      } catch (error: any) {
        toast({
          title: "Error loading procurement",
          description: error.message || "Failed to load procurement details.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadProcurement();
  }, [params.id, toast]);

  // Handle procurement deletion
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteProcurement(params.id);
      toast({
        title: "Procurement deleted",
        description: "The procurement has been successfully deleted.",
      });
      router.push("/procurements");
    } catch (error: any) {
      toast({
        title: "Error deleting procurement",
        description: error.message || "Failed to delete procurement.",
        variant: "destructive",
      });
      setIsDeleting(false);
    }
  };

  // Handle status update
  const handleStatusUpdate = async (newStatus: string) => {
    setIsUpdatingStatus(true);
    try {
      const updatedProcurement = await updateProcurementStatus(params.id, newStatus);
      setProcurement(updatedProcurement);
      toast({
        title: "Status updated",
        description: `Procurement status has been updated to ${newStatus}.`,
      });
    } catch (error: any) {
      toast({
        title: "Error updating status",
        description: error.message || "Failed to update procurement status.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'PPP');
    } catch (error) {
      return dateString;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!procurement) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => router.push("/procurements")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Procurement Not Found</h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">The requested procurement could not be found.</p>
            <Button className="mt-4" onClick={() => router.push("/procurements")}>
              Return to Procurements
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => router.push("/procurements")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Procurement Details
            </h1>
            <p className="text-muted-foreground">
              Invoice #{procurement.invoiceNumber}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/procurements/${params.id}/edit`}>
            <Button variant="outline" className="gap-1">
              <Edit className="h-4 w-4" /> Edit
            </Button>
          </Link>
          {!procurement.invoiceImage && (
            <Button variant="outline" className="gap-1">
              <UploadCloud className="h-4 w-4" /> Upload Invoice
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="gap-1 text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Procurement</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this procurement? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
                  {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Status Badge */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Status:</span>
        <Badge 
          className={
            procurement.status === "PAID" ? "bg-green-100 text-green-800 hover:bg-green-200" :
            procurement.status === "PENDING" ? "bg-orange-100 text-orange-800 hover:bg-orange-200" :
            procurement.status === "PARTIALLY_PAID" ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200" :
            "bg-gray-100 text-gray-800 hover:bg-gray-200"
          }
        >
          {procurement.status || "Draft"}
        </Badge>
        <div className="ml-auto">
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-1"
            onClick={() => handleStatusUpdate("PAID")}
            disabled={isUpdatingStatus || procurement.status === "PAID"}
          >
            {isUpdatingStatus ? <Loader2 className="h-3 w-3 animate-spin" /> : <DollarSign className="h-3 w-3" />}
            Mark as Paid
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Vendor Information */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-lg">Vendor</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="font-medium">{procurement.businessProfile?.name || "Unknown Vendor"}</p>
              <p className="text-sm text-muted-foreground">GSTIN: {procurement.businessProfile?.gstin || "N/A"}</p>
              {procurement.businessProfile?.addresses && procurement.businessProfile.addresses.length > 0 && (
                <div className="text-sm">
                  <p>{procurement.businessProfile.addresses[0].line1}</p>
                  {procurement.businessProfile.addresses[0].line2 && <p>{procurement.businessProfile.addresses[0].line2}</p>}
                  <p>{procurement.businessProfile.addresses[0].city}, {procurement.businessProfile.addresses[0].state} {procurement.businessProfile.addresses[0].postalCode}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Invoice Information */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-lg">Invoice Details</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-sm text-muted-foreground">Invoice Number:</dt>
                <dd className="font-medium">{procurement.invoiceNumber}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-muted-foreground">Invoice Date:</dt>
                <dd>{formatDate(procurement.invoiceDate)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-muted-foreground">Receipt Date:</dt>
                <dd>{formatDate(procurement.receiptDate)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-muted-foreground">Amount:</dt>
                <dd className="font-medium">{formatCurrency(procurement.invoiceAmount)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Payment Information */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-lg">Payment Terms</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-sm text-muted-foreground">Credit Period:</dt>
                <dd>{procurement.creditPeriod} days</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-muted-foreground">Due Date:</dt>
                <dd>
                  {procurement.invoiceDate ? 
                    formatDate(new Date(new Date(procurement.invoiceDate).getTime() + procurement.creditPeriod * 24 * 60 * 60 * 1000).toISOString()) : 
                    "N/A"
                  }
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-muted-foreground">Status:</dt>
                <dd className="font-medium">{procurement.status || "Draft"}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* Items */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <CardTitle>Procurement Items</CardTitle>
          </div>
          <CardDescription>
            {procurement.items.length} {procurement.items.length === 1 ? "item" : "items"} in this procurement
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Variant</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {procurement.items.map((item, index) => (
                <TableRow key={item.id || index}>
                  <TableCell className="font-medium">{item.productName}</TableCell>
                  <TableCell>{item.variantName}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.quantity * item.unitPrice)}</TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={4} className="text-right font-medium">Total Amount:</TableCell>
                <TableCell className="text-right font-bold">{formatCurrency(procurement.invoiceAmount)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Notes */}
      {procurement.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{procurement.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Invoice Image */}
      {procurement.invoiceImage && (
        <Card>
          <CardHeader>
            <CardTitle>Invoice Document</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <span>Invoice Image</span>
              </div>
              <Button variant="outline" size="sm">
                View
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metadata */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row justify-between text-xs text-muted-foreground">
            <div>
              <p>Created: {procurement.createdAt ? formatDate(procurement.createdAt) : "N/A"}</p>
            </div>
            <div>
              <p>Last Updated: {procurement.updatedAt ? formatDate(procurement.updatedAt) : "N/A"}</p>
            </div>
            <div>
              <p>ID: {procurement.id}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}