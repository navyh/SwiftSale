"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronLeft, Loader2 } from "lucide-react";
import { fetchOrderById, type OrderDto } from "@/lib/apiClient";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function OrderDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const [order, setOrder] = useState<OrderDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM dd, yyyy");
    } catch (error) {
      return dateString;
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
                  <p>
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
                  </p>
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
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.items.map((item, index) => (
                      <TableRow key={item.id || index}>
                        <TableCell>
                          {item.product?.name || "Product"} 
                          {item.variant && (
                            <span className="text-muted-foreground text-xs">
                              {" "}({item.color || item.variant.color}{item.size || item.variant.size ? `, ${item.size || item.variant.size}` : ""})
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>₹{item.unitPrice?.toFixed(2) || "0.00"}</TableCell>
                        <TableCell>₹{(item.quantity * item.unitPrice)?.toFixed(2) || "0.00"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-col items-end mt-6 space-y-1">
                <div className="flex justify-between w-full md:w-1/3 text-sm">
                  <span>Subtotal:</span>
                  <span>₹{(order.totalAmount - (order.taxAmount || 0))?.toFixed(2) || "0.00"}</span>
                </div>
                <div className="flex justify-between w-full md:w-1/3 text-sm">
                  <span>Tax:</span>
                  <span>₹{order.taxAmount?.toFixed(2) || "0.00"}</span>
                </div>
                {order.discount && order.discount > 0 && (
                  <div className="flex justify-between w-full md:w-1/3 text-sm">
                    <span>Discount:</span>
                    <span>-₹{order.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between w-full md:w-1/3 font-bold text-lg pt-2 border-t">
                  <span>Total:</span>
                  <span>₹{order.totalAmount?.toFixed(2) || "0.00"}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}