"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronLeft, Loader2, XCircle } from "lucide-react";
import { fetchOrderById, updateOrderStatus, type OrderDto } from "@/lib/apiClient";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function OrderDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const [order, setOrder] = useState<OrderDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    const loadOrderDetails = async () => {
      if (!params.id) return;

      setIsLoading(true);
      try {
        const orderId = Array.isArray(params.id) ? params.id[0] : params.id;
        const orderDetails = await fetchOrderById(orderId);
        setOrder(orderDetails);
      } catch (error: any) {
        toast({
          title: "Error loading order details",
          description: error.message || "Failed to load order details. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadOrderDetails();
  }, [params.id, toast]);

  // Format date for display
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';

    try {
      const date = new Date(dateString);
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      return format(date, "MMM dd, yyyy");
    } catch (error) {
      return 'Invalid date';
    }
  };

  // Handle cancel order
  const handleCancelOrder = async () => {
    if (!order) return;

    setIsCancelling(true);
    try {
      const updatedOrder = await updateOrderStatus(order.id, "CANCELLED");

      // Update the order in the local state
      setOrder(updatedOrder);

      toast({
        title: "Order cancelled",
        description: "The order has been cancelled successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Failed to cancel order",
        description: error.message || "Could not cancel the order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCancelling(false);
    }
  };

  // Determine if order is B2B
  const isB2B = order?.customerDetails?.companyName || order?.customerDetails?.gstin;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => router.back()}
        >
          <ChevronLeft className="h-4 w-4 mr-1" /> Back to Orders
        </Button>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          Order Details
        </h1>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading order details...</span>
        </div>
      ) : !order ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>Order not found. Please check the order ID and try again.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Order Information Card */}
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Order Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Order Number</p>
                  <p className="font-medium">{order.orderNumber || order.id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Date</p>
                  <p>{formatDate(order.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      order.status === "DELIVERED" ? "bg-green-100 text-green-700" :
                      order.status === "SHIPPED" ? "bg-blue-100 text-blue-700" :
                      order.status === "PROCESSING" ? "bg-yellow-100 text-yellow-700" :
                      order.status === "PENDING" ? "bg-orange-100 text-orange-700" :
                      order.status === "CANCELLED" ? "bg-red-100 text-red-700" :
                      "bg-gray-100 text-gray-700" // Other statuses
                    }`}>
                      {order.status}
                    </span>
                    {order.status !== "CANCELLED" && (
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={handleCancelOrder}
                        disabled={isCancelling}
                        className="ml-2"
                      >
                        {isCancelling ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        ) : (
                          <XCircle className="h-4 w-4 mr-1" />
                        )}
                        Cancel Order
                      </Button>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Payment Method</p>
                  <p>{order.paymentMethod || "Not specified"}</p>
                </div>
              </div>
              {order.notes && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Notes</p>
                  <p className="text-sm">{order.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Customer Information Card */}
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isB2B ? (
                <>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Company</p>
                    <p className="font-medium">{order.customerDetails?.companyName}</p>
                  </div>
                  {order.customerDetails?.gstin && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">GSTIN</p>
                      <p>{order.customerDetails.gstin}</p>
                    </div>
                  )}
                </>
              ) : null}
              <div>
                <p className="text-sm font-medium text-muted-foreground">Name</p>
                <p>{order.customerDetails?.name || order.user?.name || "Not specified"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Contact</p>
                <p>{order.customerDetails?.phone || order.user?.phone || "Not specified"}</p>
                <p className="text-sm text-muted-foreground">{order.customerDetails?.email || order.user?.email || ""}</p>
              </div>
              {order.billingAddress && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Billing Address</p>
                  <p className="text-sm">
                    {order.billingAddress.line1 && `${order.billingAddress.line1}, `}
                    {order.billingAddress.line2 && `${order.billingAddress.line2}, `}
                    {order.billingAddress.city && `${order.billingAddress.city}, `}
                    {order.billingAddress.state && `${order.billingAddress.state}, `}
                    {order.billingAddress.postalCode}
                  </p>
                </div>
              )}
              {order.shippingAddress && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Shipping Address</p>
                  <p className="text-sm">
                    {order.shippingAddress.line1 && `${order.shippingAddress.line1}, `}
                    {order.shippingAddress.line2 && `${order.shippingAddress.line2}, `}
                    {order.shippingAddress.city && `${order.shippingAddress.city}, `}
                    {order.shippingAddress.state && `${order.shippingAddress.state}, `}
                    {order.shippingAddress.postalCode}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Order Items Card */}
          <Card className="shadow-md md:col-span-2">
            <CardHeader>
              <CardTitle>Order Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Unit Price</TableHead>
                      {order.items.some(item => item.discountAmount && item.discountAmount > 0) && (
                        <TableHead>Discount</TableHead>
                      )}
                      <TableHead>GST Rate</TableHead>
                      <TableHead>Taxable Amount</TableHead>
                      <TableHead>GST Amount</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.items.map((item, index) => (
                      <TableRow key={item.id || index}>
                        <TableCell>
                          {item.productName} <br/>
                          {item.variantName && (
                            <span className="text-muted-foreground text-xs">
                              {" ( "}{item.color} {item.size} {" ) --  MRP: "}<b>₹{item.mrp}</b>
                            </span>
                          )}
                          {item.hsnCode && (
                            <div className="text-xs text-muted-foreground mt-1">
                              HSN: {item.hsnCode}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>₹{item.unitPrice?.toFixed(2) || "0.00"}</TableCell>
                        {order.items.some(i => i.discountAmount && i.discountAmount > 0) && (
                          <TableCell>
                            {item.discountAmount && item.discountAmount > 0 ? (
                              <>
                                ₹{item.discountAmount.toFixed(2)}
                                {item.discountRate && (
                                  <span className="text-xs text-muted-foreground"> ({item.discountRate}%)</span>
                                )}
                              </>
                            ) : "-"}
                          </TableCell>
                        )}
                        <TableCell>{item.gstTaxRate || 0}%</TableCell>
                        <TableCell>₹{item.taxableAmount?.toFixed(2) || ((item.quantity * item.unitPrice) - (item.discountAmount || 0))?.toFixed(2) || "0.00"}</TableCell>
                        <TableCell>
                          ₹{(item.taxableAmount && item.gstTaxRate ? (item.taxableAmount * item.gstTaxRate / 100) : 0)?.toFixed(2) || "0.00"}
                        </TableCell>
                        <TableCell>₹{(item.taxableAmount && item.gstTaxRate ? 
                          (item.taxableAmount + (item.taxableAmount * item.gstTaxRate / 100)) : 
                          (item.quantity * item.unitPrice))?.toFixed(2) || "0.00"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-col items-end mt-6 space-y-1">
                <div className="flex justify-between w-full md:w-1/3 text-sm">
                  <span>Subtotal:</span>
                  <span>₹{order.paymentSummary?.totalTaxableAmount?.toFixed(2) || (order.totalAmount - (order.taxAmount || 0))?.toFixed(2) || "0.00"}</span>
                </div>

                {/* GST Details */}
                {order.paymentSummary?.totalGst && (
                  <>
                    <div className="flex justify-between w-full md:w-1/3 text-sm">
                      <span>GST Total:</span>
                      <span>₹{(
                        (order.paymentSummary.totalGst.igstAmount || 0) + 
                        (order.paymentSummary.totalGst.cgstAmount || 0) + 
                        (order.paymentSummary.totalGst.sgstAmount || 0)
                      ).toFixed(2)}</span>
                    </div>

                    {/* IGST Details */}
                    {order.paymentSummary.totalGst.igstAmount && order.paymentSummary.totalGst.igstAmount > 0 && (
                      <div className="flex justify-between w-full md:w-1/3 text-muted-foreground text-xs pl-4">
                        <span>IGST ({order.paymentSummary.totalGst.igstRate}%):</span>
                        <span>₹{order.paymentSummary.totalGst.igstAmount.toFixed(2)}</span>
                      </div>
                    )}

                    {/* CGST Details */}
                    {order.paymentSummary.totalGst.cgstAmount && order.paymentSummary.totalGst.cgstAmount > 0 && (
                      <div className="flex justify-between w-full md:w-1/3 text-muted-foreground text-xs pl-4">
                        <span>CGST ({order.paymentSummary.totalGst.cgstRate}%):</span>
                        <span>₹{order.paymentSummary.totalGst.cgstAmount.toFixed(2)}</span>
                      </div>
                    )}

                    {/* SGST Details */}
                    {order.paymentSummary.totalGst.sgstAmount && order.paymentSummary.totalGst.sgstAmount > 0 && (
                      <div className="flex justify-between w-full md:w-1/3 text-muted-foreground text-xs pl-4">
                        <span>SGST ({order.paymentSummary.totalGst.sgstRate}%):</span>
                        <span>₹{order.paymentSummary.totalGst.sgstAmount.toFixed(2)}</span>
                      </div>
                    )}
                  </>
                )}

                {/* Fallback to taxAmount if paymentSummary is not available */}
                {!order.paymentSummary?.totalGst && order.taxAmount && order.taxAmount > 0 && (
                  <div className="flex justify-between w-full md:w-1/3 text-sm">
                    <span>Tax:</span>
                    <span>₹{order.taxAmount.toFixed(2)}</span>
                  </div>
                )}

                {/* Discount */}
                {(order.paymentSummary?.totalDiscountAmount || order.discount) && (
                  <div className="flex justify-between w-full md:w-1/3 text-sm">
                    <span>Discount:</span>
                    <span>-₹{(order.paymentSummary?.totalDiscountAmount || order.discount || 0).toFixed(2)}</span>
                  </div>
                )}

                {/* Shipping Charges */}
                {order.paymentSummary?.shippingCharges > 0 && (
                  <div className="flex justify-between w-full md:w-1/3 text-sm">
                    <span>Shipping:</span>
                    <span>₹{order.paymentSummary?.shippingCharges.toFixed(2)}</span>
                  </div>
                )}

                {/* Total Amount */}
                <div className="flex justify-between w-full md:w-1/3 font-bold text-lg pt-2 border-t">
                  <span>Total:</span>
                  <span>₹{order.paymentSummary?.totalAmount?.toFixed(2) || order.totalAmount?.toFixed(2) || "0.00"}</span>
                </div>

                {/* Total Items */}
                <div className="flex justify-between w-full md:w-1/3 text-xs text-muted-foreground mt-2">
                  <span>Total Items:</span>
                  <span>{order.paymentSummary?.totalItems || order.items.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
