"use client";

import { useState, useEffect } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ItemList, ItemListCard } from "@/components/ui/item-list";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  fetchProcurementById,
  deleteProcurement,
  updateProcurementStatus,
  makeProcurementPayment,
  fetchBusinessProfileById,
  type ProcurementDto,
  type ProcurementPaymentRequest,
  type BusinessProfileDto
} from "@/lib/apiClient";

export default function ProcurementDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { toast } = useToast();
  const procurementId = use(params).id; // Unwrap params with React.use()
  const [procurement, setProcurement] = useState<ProcurementDto | null>(null);
  const [vendorDetails, setVendorDetails] = useState<BusinessProfileDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingVendor, setIsLoadingVendor] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number | ''>('');
  const [paymentDate, setPaymentDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [paymentMethod, setPaymentMethod] = useState<string>('Bank Transfer');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [applyCashDiscount, setApplyCashDiscount] = useState<boolean>(false);

  // Fetch procurement details
  useEffect(() => {
    const loadProcurement = async () => {
      setIsLoading(true);
      try {
        const data = await fetchProcurementById(procurementId);
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
  }, [procurementId, toast]);

  // Fetch vendor details
  useEffect(() => {
    if (procurement && procurement.businessProfileId) {
      const loadVendorDetails = async () => {
        setIsLoadingVendor(true);
        try {
          const data = await fetchBusinessProfileById(procurement.businessProfileId);
          setVendorDetails(data);
        } catch (error: any) {
          toast({
            title: "Error loading vendor details",
            description: error.message || "Failed to load vendor details.",
            variant: "destructive",
          });
        } finally {
          setIsLoadingVendor(false);
        }
      };

      loadVendorDetails();
    }
  }, [procurement, toast]);

  // Handle procurement deletion
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteProcurement(procurementId);
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
      const updatedProcurement = await updateProcurementStatus(procurementId, newStatus);
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

  // Handle payment submission
  const handlePaymentSubmit = async () => {
    if (paymentAmount === '' || typeof paymentAmount !== 'number' || paymentAmount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid payment amount greater than 0.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingPayment(true);
    try {
      const paymentData: ProcurementPaymentRequest = {
        amount: paymentAmount,
        paymentDate: paymentDate,
        paymentMethod: paymentMethod,
        referenceNumber: referenceNumber || undefined,
        notes: paymentNotes || undefined,
        applyCashDiscount: applyCashDiscount,
      };

      const updatedProcurement = await makeProcurementPayment(procurementId, paymentData);
      setProcurement(updatedProcurement);

      // Reset form
      setPaymentAmount('');
      setReferenceNumber('');
      setPaymentNotes('');
      setApplyCashDiscount(false);
      setShowPaymentDialog(false);

      toast({
        title: "Payment recorded",
        description: `Payment of ${formatCurrency(paymentAmount)} has been successfully recorded.`,
      });
    } catch (error: any) {
      toast({
        title: "Error recording payment",
        description: error.message || "Failed to record payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
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
          <Link href={`/procurements/${procurementId}/edit`}>
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
            <AlertDialogContent className="max-w-[95vw] sm:max-w-md">
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Procurement</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this procurement? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                <AlertDialogCancel className="mt-2 sm:mt-0 w-full sm:w-auto">Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleDelete} 
                  disabled={isDeleting}
                  className="mt-2 sm:mt-0 w-full sm:w-auto"
                >
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
            {isLoadingVendor ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-2">
                <p className="font-medium">{vendorDetails?.companyName || procurement.businessProfile?.companyName || "Unknown Vendor"}</p>
                <p className="text-sm text-muted-foreground">GSTIN: {vendorDetails?.gstin || procurement.businessProfile?.gstin || "N/A"}</p>
                {vendorDetails?.addresses && vendorDetails.addresses.length > 0 ? (
                  <div className="text-sm">
                    <p>{vendorDetails.addresses[0].line1}</p>
                    {vendorDetails.addresses[0].line2 && <p>{vendorDetails.addresses[0].line2}</p>}
                    <p>{vendorDetails.addresses[0].city}, {vendorDetails.addresses[0].state} {vendorDetails.addresses[0].postalCode}</p>
                  </div>
                ) : procurement.businessProfile?.addresses && procurement.businessProfile.addresses.length > 0 && (
                  <div className="text-sm">
                    <p>{procurement.businessProfile.addresses[0].line1}</p>
                    {procurement.businessProfile.addresses[0].line2 && <p>{procurement.businessProfile.addresses[0].line2}</p>}
                    <p>{procurement.businessProfile.addresses[0].city}, {procurement.businessProfile.addresses[0].state} {procurement.businessProfile.addresses[0].postalCode}</p>
                  </div>
                )}
              </div>
            )}
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
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-lg">Payment Information</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-sm text-muted-foreground">Invoice Amount:</dt>
                <dd className="font-medium">{formatCurrency(procurement.invoiceAmount)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-muted-foreground">Total Paid:</dt>
                <dd className="font-medium text-green-600">{formatCurrency(procurement.totalPaidAmount || 0)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-muted-foreground">Remaining:</dt>
                <dd className="font-medium text-orange-600">{formatCurrency(procurement.remainingAmount || procurement.invoiceAmount)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-muted-foreground">Status:</dt>
                <dd>
                  <Badge 
                    className={
                      procurement.paymentStatus === "PAID" ? "bg-green-100 text-green-800 hover:bg-green-200" :
                      procurement.paymentStatus === "PENDING" ? "bg-orange-100 text-orange-800 hover:bg-orange-200" :
                      procurement.paymentStatus === "PARTIALLY_PAID" ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200" :
                      "bg-gray-100 text-gray-800 hover:bg-gray-200"
                    }
                  >
                    {procurement.paymentStatus || procurement.status || "PENDING"}
                  </Badge>
                </dd>
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
                <dt className="text-sm text-muted-foreground">Credit Period:</dt>
                <dd>{procurement.creditPeriod} days</dd>
              </div>
              {procurement.cashDiscountPercentage > 0 && (
                <div className="flex justify-between">
                  <dt className="text-sm text-muted-foreground">Cash Discount:</dt>
                  <dd>{procurement.cashDiscountPercentage}%</dd>
                </div>
              )}
            </dl>
            <div className="mt-4">
              <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
                <DialogTrigger asChild>
                  <Button className="w-full" disabled={procurement.paymentStatus === "PAID"}>
                    <DollarSign className="h-4 w-4 mr-2" /> Make Payment
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-[95vw] sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Record Payment</DialogTitle>
                    <DialogDescription>
                      Enter the payment details for invoice #{procurement.invoiceNumber}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="payment-amount">Payment Amount</Label>
                      <Input
                        id="payment-amount"
                        type="number"
                        step="0.01"
                        min="0.01"
                        max={procurement.remainingAmount || procurement.invoiceAmount}
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value ? parseFloat(e.target.value) : '')}
                        placeholder="Enter amount"
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground">
                        Remaining: {formatCurrency(procurement.remainingAmount || procurement.invoiceAmount)}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="payment-date">Payment Date</Label>
                      <Input
                        id="payment-date"
                        type="date"
                        value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="payment-method">Payment Method</Label>
                      <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select payment method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                          <SelectItem value="Cash">Cash</SelectItem>
                          <SelectItem value="Credit Card">Credit Card</SelectItem>
                          <SelectItem value="UPI">UPI</SelectItem>
                          <SelectItem value="Check">Check</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reference-number">Reference Number (Optional)</Label>
                      <Input
                        id="reference-number"
                        value={referenceNumber}
                        onChange={(e) => setReferenceNumber(e.target.value)}
                        placeholder="Transaction ID, Check number, etc."
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="payment-notes">Notes (Optional)</Label>
                      <Textarea
                        id="payment-notes"
                        value={paymentNotes}
                        onChange={(e) => setPaymentNotes(e.target.value)}
                        placeholder="Add any notes about this payment"
                        className="w-full"
                      />
                    </div>
                    {procurement.cashDiscountPercentage > 0 && (
                      <div className="flex items-center space-x-2 pt-2">
                        <Checkbox
                          id="apply-discount"
                          checked={applyCashDiscount}
                          onCheckedChange={(checked) => setApplyCashDiscount(checked as boolean)}
                        />
                        <Label htmlFor="apply-discount" className="text-sm font-normal">
                          Apply cash discount ({procurement.cashDiscountPercentage}%)
                        </Label>
                      </div>
                    )}
                  </div>
                  <DialogFooter className="flex-col sm:flex-row gap-2">
                    <DialogClose asChild>
                      <Button variant="outline" className="w-full sm:w-auto">Cancel</Button>
                    </DialogClose>
                    <Button 
                      onClick={handlePaymentSubmit} 
                      disabled={isSubmittingPayment || paymentAmount === '' || typeof paymentAmount !== 'number' || paymentAmount <= 0}
                      className="w-full sm:w-auto"
                    >
                      {isSubmittingPayment ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Processing...
                        </>
                      ) : (
                        "Record Payment"
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
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
          {/* Mobile view with ItemList */}
          <div className="block md:hidden">
            <ItemList
              items={procurement.items}
              renderItem={(item, index) => (
                <ItemListCard
                  key={item.id || index}
                  title={item.productName}
                  subtitle={item.variantName}
                  amount={formatCurrency(item.quantity * item.unitPrice)}
                  date={
                    <div className="flex items-center justify-between w-full">
                      <span className="text-sm">Qty: {item.quantity}</span>
                      <span className="text-sm">{formatCurrency(item.unitPrice)} each</span>
                    </div>
                  }
                />
              )}
              emptyState={
                <div className="text-center py-4 text-muted-foreground">
                  No items in this procurement
                </div>
              }
            />
            <div className="mt-4 border-t pt-4 flex justify-between items-center">
              <span className="font-medium">Total Amount:</span>
              <span className="font-bold">{formatCurrency(procurement.invoiceAmount)}</span>
            </div>
          </div>

          {/* Desktop view with Table */}
          <div className="hidden md:block overflow-x-auto">
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
          </div>
        </CardContent>
      </Card>

      {/* Payment History */}
      {procurement.payments && procurement.payments.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <CardTitle>Payment History</CardTitle>
            </div>
            <CardDescription>
              {procurement.payments.length} {procurement.payments.length === 1 ? "payment" : "payments"} recorded
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Mobile view with ItemList */}
            <div className="block md:hidden">
              <ItemList
                items={procurement.payments}
                renderItem={(payment, index) => {
                  const discountBadge = payment.cashDiscountApplied ? (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      Discount: {formatCurrency(payment.cashDiscountAmount || 0)}
                    </Badge>
                  ) : null;

                  return (
                    <ItemListCard
                      key={payment.id || index}
                      title={formatDate(payment.paymentDate)}
                      subtitle={
                        <div className="flex flex-col space-y-1">
                          <div className="flex items-center">
                            <span className="text-xs">{payment.paymentMethod}</span>
                            {payment.referenceNumber && (
                              <span className="text-xs ml-2">• {payment.referenceNumber}</span>
                            )}
                          </div>
                          {payment.notes && (
                            <span className="text-xs text-muted-foreground truncate max-w-[200px]">{payment.notes}</span>
                          )}
                        </div>
                      }
                      amount={formatCurrency(payment.amount)}
                      status={discountBadge}
                    />
                  );
                }}
                emptyState={
                  <div className="text-center py-4 text-muted-foreground">
                    No payment history available
                  </div>
                }
              />
            </div>

            {/* Desktop view with Table */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {procurement.payments.map((payment, index) => (
                    <TableRow key={payment.id || index}>
                      <TableCell>{formatDate(payment.paymentDate)}</TableCell>
                      <TableCell>{payment.paymentMethod}</TableCell>
                      <TableCell>{payment.referenceNumber || "-"}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(payment.amount)}</TableCell>
                      <TableCell>
                        {payment.cashDiscountApplied ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            {formatCurrency(payment.cashDiscountAmount || 0)}
                          </Badge>
                        ) : "-"}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">{payment.notes || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4 text-xs text-muted-foreground">
            <div className="flex flex-col">
              <span className="font-medium mb-1 md:hidden">Created</span>
              <p>{procurement.createdAt ? formatDate(procurement.createdAt) : "N/A"}</p>
            </div>
            <div className="flex flex-col">
              <span className="font-medium mb-1 md:hidden">Last Updated</span>
              <p>{procurement.updatedAt ? formatDate(procurement.updatedAt) : "N/A"}</p>
            </div>
            <div className="flex flex-col">
              <span className="font-medium mb-1 md:hidden">ID</span>
              <p className="break-all">{procurement.id}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
