
"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Search, Eye, Filter, UserPlus, ShoppingBag, ChevronLeft, ChevronRight, Loader2, Phone, Truck, FileText, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  fetchOrders, 
  searchOrders, 
  fetchOrderStatuses,
  updateOrderStatus,
  downloadInvoicePdf,
  type OrderDto, 
  type Page 
} from "@/lib/apiClient";
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
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function OrdersPage() {
  const router = useRouter();
  const { toast } = useToast();

  // State for orders and pagination
  const [orders, setOrders] = useState<OrderDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // State for action loading
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState<string | null>(null);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [orderToCancel, setOrderToCancel] = useState<OrderDto | null>(null);

  // State for filters
  const [searchKeyword, setSearchKeyword] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [orderStatuses, setOrderStatuses] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Search debounce timer
  const [searchTimer, setSearchTimer] = useState<NodeJS.Timeout | null>(null);

  // Fetch order statuses for filter dropdown
  useEffect(() => {
    const loadOrderStatuses = async () => {
      try {
        const statuses = await fetchOrderStatuses();
        setOrderStatuses(statuses);
      } catch (error) {
        console.error("Failed to load order statuses:", error);
      }
    };
    loadOrderStatuses();
  }, []);


  // Fetch orders based on current filters and pagination
  useEffect(() => {
    const loadOrders = async () => {
      if (searchKeyword.trim()) {
        return; // Skip this effect when searchKeyword changes - the search effect will handle it
      }

      setIsLoading(true);
      try {
        // Use regular fetch with filters
        const result = await fetchOrders({
          sortBy,
          sortDir,
          status: statusFilter === "all" ? undefined : statusFilter,
          page: currentPage,
          size: pageSize,
        });
        setOrders(result.content);
        setTotalPages(result.totalPages);
      } catch (error: any) {
        toast({
          title: "Error loading orders",
          description: error.message || "Failed to load orders. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadOrders();
  }, [currentPage, pageSize, sortBy, sortDir, statusFilter, toast]);

  // Handle search keyword changes with debounce
  useEffect(() => {
    // Only proceed if there's a search keyword
    if (!searchKeyword.trim()) return;

    // Clear any existing timer
    if (searchTimer) {
      clearTimeout(searchTimer);
    }

    // Set a new timer
    const timer = setTimeout(async () => {
      setIsSearching(true);
      setCurrentPage(0); // Reset to first page when searching

      try {
        const result = await searchOrders(
          searchKeyword,
          0,
          pageSize,
          `${sortBy},${sortDir}`
        );
        setOrders(result.content);
        setTotalPages(result.totalPages);
      } catch (error: any) {
        toast({
          title: "Search failed",
          description: error.message || "Failed to search orders. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsSearching(false);
      }
    }, 800); // 800ms debounce delay

    setSearchTimer(timer);

    // Cleanup function to clear the timer if the component unmounts or dependencies change
    return () => {
      if (searchTimer) {
        clearTimeout(searchTimer);
      }
    };
  }, [searchKeyword, pageSize, sortBy, sortDir, toast]);

  // Handle clear search
  const handleClearSearch = () => {
    setSearchKeyword("");
    setCurrentPage(0);
    // This will trigger the useEffect to reload orders without search
  };

  // Handle mark as delivered
  const handleMarkAsDelivered = async (orderId: string) => {
    setProcessingOrderId(orderId);
    try {
      const updatedOrder = await updateOrderStatus(orderId, "DELIVERED");

      // Update the order in the local state
      setOrders(orders.map(order => 
        order.id === orderId ? { ...order, status: updatedOrder.status } : order
      ));

      toast({
        title: "Order updated",
        description: "Order has been marked as delivered.",
      });
    } catch (error: any) {
      toast({
        title: "Failed to update order",
        description: error.message || "Could not update order status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessingOrderId(null);
    }
  };

  // Handle print invoice
  const handlePrintInvoice = async (orderId: string) => {
    setDownloadingInvoiceId(orderId);
    try {
      const blob = await downloadInvoicePdf(orderId);

      // Create a URL for the blob
      const url = window.URL.createObjectURL(blob);

      // Create a link and click it to trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${orderId}.pdf`;
      document.body.appendChild(a);
      a.click();

      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Invoice downloaded",
        description: "The invoice has been downloaded successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Failed to download invoice",
        description: error.message || "Could not download the invoice. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDownloadingInvoiceId(null);
    }
  };

  // Handle open cancel dialog
  const handleOpenCancelDialog = (order: OrderDto) => {
    setOrderToCancel(order);
  };

  // Handle cancel order
  const handleCancelOrder = async () => {
    if (!orderToCancel) return;

    setCancellingOrderId(orderToCancel.id);
    try {
      const updatedOrder = await updateOrderStatus(orderToCancel.id, "CANCELLED");

      // Update the order in the local state
      setOrders(orders.map(order => 
        order.id === orderToCancel.id ? { ...order, status: updatedOrder.status } : order
      ));

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
      setCancellingOrderId(null);
      setOrderToCancel(null);
    }
  };


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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Order Management</h1>
          <p className="text-muted-foreground">Streamlined order processing and tracking.</p>
        </div>
        <Link href="/orders/new" passHref> {/* Wrapped Button with Link */}
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> Create New Order
          </Button>
        </Link>
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
             <CardTitle>All Orders</CardTitle>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-grow md:flex-grow-0">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  type="search" 
                  placeholder="Search orders..." 
                  className="pl-8 w-full md:w-[250px]"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                />
                {isSearching && (
                  <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
              {searchKeyword.trim() && (
                <Button 
                  variant="ghost" 
                  onClick={handleClearSearch}
                  disabled={isSearching}
                  size="sm"
                >
                  Clear
                </Button>
              )}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {orderStatuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <CardDescription>View, manage, and track all customer orders.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Loading orders...</span>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No orders found. Try adjusting your search or filters.</p>
            </div>
          ) : (
            <>
              {/* Desktop view - Table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order #</TableHead>
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
                        <TableCell className="font-medium">{order.orderNumber || order.id.substring(0, 8)}</TableCell>
                        <TableCell>
                          {order.customerDetails?.companyName || order.businessProfile?.companyName ? (
                            // B2B order
                            <div className="flex flex-col">
                              <span className="font-medium">{order.customerDetails?.companyName || order.businessProfile?.companyName}</span>
                              {order.customerDetails?.gstin && (
                                <span className="text-xs text-muted-foreground">GSTIN: {order.customerDetails.gstin}</span>
                              )}
                              <span className="text-xs mt-1">
                                {order.customerDetails?.name || order.user?.name || ""}
                                {(order.customerDetails?.phone || order.user?.phone) && (
                                  <span className="ml-1 text-muted-foreground">
                                    ({order.customerDetails?.phone || order.user?.phone})
                                  </span>
                                )}
                              </span>
                            </div>
                          ) : (
                            // B2C order
                            <div className="flex flex-col">
                              <span className="font-medium">{order.customerDetails?.name || order.user?.name || "Unknown"}</span>
                              {(order.customerDetails?.phone || order.user?.phone) && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {order.customerDetails?.phone || order.user?.phone}
                                </span>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{formatDate(order.createdAt)}</TableCell>
                        <TableCell>{order.items?.length || 0} items</TableCell>
                        <TableCell>
                          ₹{order.paymentSummary && order.paymentSummary.totalAmount ? order.paymentSummary.totalAmount.toFixed(2) : order.totalAmount ? order.totalAmount.toFixed(2) : "0.00"}
                        </TableCell>
                        <TableCell>
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
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-1">
                            <Link href={`/orders/${order.id}`} passHref>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="hover:text-primary"
                                title="View Order"
                              >
                                <Eye className="h-4 w-4" />
                                <span className="sr-only">View Order</span>
                              </Button>
                            </Link>

                            {order.status !== "DELIVERED" && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="hover:text-green-600"
                                onClick={() => handleMarkAsDelivered(order.id)}
                                disabled={processingOrderId === order.id}
                                title="Mark as Delivered"
                              >
                                {processingOrderId === order.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Truck className="h-4 w-4" />
                                )}
                                <span className="sr-only">Mark as Delivered</span>
                              </Button>
                            )}

                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="hover:text-blue-600"
                              onClick={() => handlePrintInvoice(order.id)}
                              disabled={downloadingInvoiceId === order.id}
                              title="Print Invoice"
                            >
                              {downloadingInvoiceId === order.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <FileText className="h-4 w-4" />
                              )}
                              <span className="sr-only">Print Invoice</span>
                            </Button>

                            {order.status !== "CANCELLED" && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="hover:text-red-600"
                                    onClick={() => handleOpenCancelDialog(order)}
                                    disabled={cancellingOrderId === order.id}
                                    title="Cancel Order"
                                  >
                                    {cancellingOrderId === order.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <XCircle className="h-4 w-4" />
                                    )}
                                    <span className="sr-only">Cancel Order</span>
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Cancel Order</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to cancel this order? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={handleCancelOrder}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Confirm
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile view - Card list */}
              <div className="md:hidden space-y-4">
                {orders.map((order) => (
                  <Card key={order.id} className="hover:bg-accent/50 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium">{order.orderNumber || order.id.substring(0, 8)}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</p>
                        </div>
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
                      </div>

                      <div className="mb-2">
                        {order.customerDetails?.companyName || order.businessProfile?.companyName ? (
                          // B2B order
                          <div>
                            <p className="font-medium">{order.customerDetails?.companyName || order.businessProfile?.companyName}</p>
                            {order.customerDetails?.gstin && (
                              <p className="text-xs text-muted-foreground">GSTIN: {order.customerDetails.gstin}</p>
                            )}
                            <p className="text-xs mt-1">
                              {order.customerDetails?.name || order.user?.name || ""}
                              {(order.customerDetails?.phone || order.user?.phone) && (
                                <span className="ml-1 text-muted-foreground">
                                  ({order.customerDetails?.phone || order.user?.phone})
                                </span>
                              )}
                            </p>
                          </div>
                        ) : (
                          // B2C order
                          <div>
                            <p className="font-medium">{order.customerDetails?.name || order.user?.name || "Unknown"}</p>
                            {(order.customerDetails?.phone || order.user?.phone) && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {order.customerDetails?.phone || order.user?.phone}
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex justify-between items-center text-sm mb-3">
                        <span>{order.paymentSummary?.totalItems || order.items?.length || 0} items</span>
                        <span className="font-medium">₹{order.paymentSummary && order.paymentSummary.totalAmount ? order.paymentSummary.totalAmount.toFixed(2) : order.totalAmount ? order.totalAmount.toFixed(2) : "0.00"}</span>
                      </div>

                      {/* Action buttons */}
                      <div className="flex justify-between items-center pt-2 border-t">
                        <Link href={`/orders/${order.id}`} passHref>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-primary"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </Link>

                        <div className="flex space-x-1">
                          {order.status !== "DELIVERED" && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-green-600"
                              onClick={() => handleMarkAsDelivered(order.id)}
                              disabled={processingOrderId === order.id}
                            >
                              {processingOrderId === order.id ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                              ) : (
                                <Truck className="h-4 w-4 mr-1" />
                              )}
                              Deliver
                            </Button>
                          )}

                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-blue-600"
                            onClick={() => handlePrintInvoice(order.id)}
                            disabled={downloadingInvoiceId === order.id}
                          >
                            {downloadingInvoiceId === order.id ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            ) : (
                              <FileText className="h-4 w-4 mr-1" />
                            )}
                            Invoice
                          </Button>

                          {order.status !== "CANCELLED" && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="text-red-600"
                                  onClick={() => handleOpenCancelDialog(order)}
                                  disabled={cancellingOrderId === order.id}
                                >
                                  {cancellingOrderId === order.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                  ) : (
                                    <XCircle className="h-4 w-4 mr-1" />
                                  )}
                                  Cancel
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Cancel Order</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to cancel this order? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={handleCancelOrder}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Confirm
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}

          {/* Pagination Controls */}
          {!isLoading && orders.length > 0 && (
            <div className="flex items-center justify-between space-x-2 py-4">
              <div className="text-sm text-muted-foreground">
                Showing <span className="font-medium">{orders.length}</span> of{" "}
                <span className="font-medium">{totalPages * pageSize}</span> orders
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                  disabled={currentPage === 0 || isLoading}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="sr-only">Previous Page</span>
                </Button>
                <div className="text-sm font-medium">
                  Page {currentPage + 1} of {Math.max(1, totalPages)}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                  disabled={currentPage >= totalPages - 1 || isLoading}
                >
                  <ChevronRight className="h-4 w-4" />
                  <span className="sr-only">Next Page</span>
                </Button>
                <Select 
                  value={pageSize.toString()} 
                  onValueChange={(value) => {
                    setPageSize(Number(value));
                    setCurrentPage(0); // Reset to first page when changing page size
                  }}
                >
                  <SelectTrigger className="w-[100px]">
                    <SelectValue placeholder="10 per page" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 per page</SelectItem>
                    <SelectItem value="10">10 per page</SelectItem>
                    <SelectItem value="20">20 per page</SelectItem>
                    <SelectItem value="50">50 per page</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
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
