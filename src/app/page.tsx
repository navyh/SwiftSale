"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  FileText, DollarSign, Package, Users, ShoppingCart, 
  TrendingUp, AlertTriangle, Clock, BarChart3, Truck, 
  CreditCard, Calendar, Award
} from 'lucide-react';
import {
  Chart,
  ChartArea,
  ChartBar,
  ChartLine,
  ChartTooltip,
  ChartXAxis,
  ChartYAxis,
  ChartLegend
} from "@/components/ui/chart";
import { 
  fetchOrdersSummary, 
  fetchProductsSummary, 
  fetchInvoicesSummary, 
  fetchProcurementsSummary,
  fetchOrdersRecent,
  fetchProductsTopSelling,
  fetchCustomersTop,
  fetchInvoicesOutstanding,
  fetchProcurementsOutstanding,
  fetchOrdersTrends,
  fetchInvoicesTrends,
  fetchProductsCategoryBreakdown,
  fetchProcurementsVendorBreakdown,
  type OrderSummaryDto,
  type ProductSummaryDto,
  type InvoiceSummaryDto,
  type ProcurementSummaryDto,
  type OrderRecentDto,
  type ProductTopSellingDto,
  type CustomerTopDto,
  type InvoiceOutstandingDto,
  type ProcurementOutstandingDto,
  type OrderTrendsDto,
  type InvoiceTrendsDto,
  type ProductCategoryBreakdownDto,
  type ProcurementVendorBreakdownDto
} from "@/lib/apiClient";

// Helper function to format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount);
};

// Helper function to format date
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
};

export default function DashboardPage() {
  // State for summary data
  const [orderSummary, setOrderSummary] = useState<OrderSummaryDto | null>(null);
  const [productSummary, setProductSummary] = useState<ProductSummaryDto | null>(null);
  const [invoiceSummary, setInvoiceSummary] = useState<InvoiceSummaryDto | null>(null);
  const [procurementSummary, setProcurementSummary] = useState<ProcurementSummaryDto | null>(null);

  // State for recent orders
  const [recentOrders, setRecentOrders] = useState<OrderRecentDto[]>([]);

  // State for top selling products
  const [topProducts, setTopProducts] = useState<ProductTopSellingDto[]>([]);

  // State for top customers
  const [topCustomers, setTopCustomers] = useState<CustomerTopDto[]>([]);

  // State for outstanding invoices
  const [outstandingInvoices, setOutstandingInvoices] = useState<InvoiceOutstandingDto[]>([]);

  // State for outstanding procurements
  const [outstandingProcurements, setOutstandingProcurements] = useState<ProcurementOutstandingDto[]>([]);

  // State for trends data
  const [orderTrends, setOrderTrends] = useState<OrderTrendsDto[]>([]);
  const [invoiceTrends, setInvoiceTrends] = useState<InvoiceTrendsDto[]>([]);
  const [productCategories, setProductCategories] = useState<ProductCategoryBreakdownDto[]>([]);
  const [vendorBreakdown, setVendorBreakdown] = useState<ProcurementVendorBreakdownDto[]>([]);

  // State for loading
  const [isLoading, setIsLoading] = useState(true);

  // State for errors
  const [error, setError] = useState<string | null>(null);

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch summary data in parallel
        const [
          orderSummaryData,
          productSummaryData,
          invoiceSummaryData,
          procurementSummaryData,
          recentOrdersData,
          topProductsData,
          topCustomersData,
          outstandingInvoicesData,
          outstandingProcurementsData,
          orderTrendsData,
          invoiceTrendsData,
          productCategoriesData,
          vendorBreakdownData
        ] = await Promise.all([
          fetchOrdersSummary(),
          fetchProductsSummary(),
          fetchInvoicesSummary(),
          fetchProcurementsSummary(),
          fetchOrdersRecent(),
          fetchProductsTopSelling(),
          fetchCustomersTop(),
          fetchInvoicesOutstanding(),
          fetchProcurementsOutstanding(),
          fetchOrdersTrends(),
          fetchInvoicesTrends(),
          fetchProductsCategoryBreakdown(),
          fetchProcurementsVendorBreakdown()
        ]);

        // Update state with fetched data
        setOrderSummary(orderSummaryData);
        setProductSummary(productSummaryData);
        setInvoiceSummary(invoiceSummaryData);
        setProcurementSummary(procurementSummaryData);
        setRecentOrders(recentOrdersData);
        setTopProducts(topProductsData);
        setTopCustomers(topCustomersData);
        setOutstandingInvoices(outstandingInvoicesData);
        setOutstandingProcurements(outstandingProcurementsData);
        setOrderTrends(orderTrendsData);
        setInvoiceTrends(invoiceTrendsData);
        setProductCategories(productCategoriesData);
        setVendorBreakdown(vendorBreakdownData);
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setError("Failed to load dashboard data. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Prepare stats data for the summary cards
  const stats = [
    { 
      title: "Total Revenue", 
      value: orderSummary ? formatCurrency(orderSummary.totalRevenue) : "Loading...", 
      change: orderSummary ? `Avg. ${formatCurrency(orderSummary.averageOrderValue)} per order` : "", 
      icon: DollarSign, 
      dataAiHint: "money graph",
      isLoading
    },
    { 
      title: "Active Orders", 
      value: orderSummary ? orderSummary.totalOrders.toString() : "Loading...", 
      change: orderSummary ? `${orderSummary.pendingOrders} pending` : "", 
      icon: ShoppingCart, 
      dataAiHint: "shopping cart",
      isLoading
    },
    { 
      title: "Products", 
      value: productSummary ? productSummary.totalProducts.toString() : "Loading...", 
      change: productSummary ? `${productSummary.outOfStockProducts} out of stock` : "", 
      icon: Package, 
      dataAiHint: "product boxes",
      isLoading
    },
    { 
      title: "Outstanding Invoices", 
      value: invoiceSummary ? formatCurrency(invoiceSummary.outstandingAmount) : "Loading...", 
      change: invoiceSummary ? `${invoiceSummary.totalInvoices - invoiceSummary.paidInvoices} unpaid` : "", 
      icon: AlertTriangle, 
      dataAiHint: "alert",
      isLoading
    },
  ];

  return (
    <div className="space-y-8 px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex flex-col justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Here's an overview of your business performance.</p>
        </div>

        {error && (
          <div className="w-full bg-destructive/15 text-destructive px-4 py-3 rounded-md">
            {error}
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="shadow-sm hover:shadow-md transition-shadow duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stat.isLoading ? 'opacity-50' : ''}`}>
                {stat.value}
              </div>
              <p className="text-xs text-muted-foreground pt-1">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Orders and Top Products */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" /> Recent Orders
            </CardTitle>
            <CardDescription>Latest customer orders</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-start space-x-3 animate-pulse">
                    <div className="p-2 bg-secondary rounded-full">
                      <div className="h-5 w-5 bg-primary/20 rounded-full" />
                    </div>
                    <div className="flex-1">
                      <div className="h-4 bg-secondary rounded w-3/4 mb-2" />
                      <div className="h-3 bg-secondary rounded w-1/2" />
                    </div>
                    <div className="h-4 bg-secondary rounded w-16" />
                  </div>
                ))}
              </div>
            ) : recentOrders.length > 0 ? (
              <ul className="space-y-3">
                {recentOrders.slice(0, 5).map((order) => (
                  <li key={order.id} className="flex items-start justify-between space-x-3">
                    <div className="flex items-start space-x-3">
                      <div className="p-2 bg-secondary rounded-full">
                        <ShoppingCart className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {order.orderNumber} - {order.customerName}
                        </p>
                        <p className="text-xs text-muted-foreground">{formatDate(order.date)}</p>
                      </div>
                    </div>
                    <div className="text-sm font-medium">
                      {formatCurrency(order.amount)}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-center py-4">No recent orders found</p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" /> Top Selling Products
            </CardTitle>
            <CardDescription>Products with highest sales</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-start space-x-3 animate-pulse">
                    <div className="p-2 bg-secondary rounded-full">
                      <div className="h-5 w-5 bg-primary/20 rounded-full" />
                    </div>
                    <div className="flex-1">
                      <div className="h-4 bg-secondary rounded w-3/4 mb-2" />
                      <div className="h-3 bg-secondary rounded w-1/2" />
                    </div>
                    <div className="h-4 bg-secondary rounded w-16" />
                  </div>
                ))}
              </div>
            ) : topProducts.length > 0 ? (
              <ul className="space-y-3">
                {topProducts.slice(0, 5).map((product) => (
                  <li key={product.id} className="flex items-start justify-between space-x-3">
                    <div className="flex items-start space-x-3">
                      <div className="p-2 bg-secondary rounded-full">
                        <Package className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{product.name}</p>
                        <p className="text-xs text-muted-foreground">{product.quantity} units sold</p>
                      </div>
                    </div>
                    <div className="text-sm font-medium">
                      {formatCurrency(product.revenue)}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-center py-4">No top products found</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Outstanding Invoices and Procurements */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" /> Outstanding Invoices
            </CardTitle>
            <CardDescription>Invoices requiring attention</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-start space-x-3 animate-pulse">
                    <div className="p-2 bg-secondary rounded-full">
                      <div className="h-5 w-5 bg-primary/20 rounded-full" />
                    </div>
                    <div className="flex-1">
                      <div className="h-4 bg-secondary rounded w-3/4 mb-2" />
                      <div className="h-3 bg-secondary rounded w-1/2" />
                    </div>
                    <div className="h-4 bg-secondary rounded w-16" />
                  </div>
                ))}
              </div>
            ) : outstandingInvoices.length > 0 ? (
              <ul className="space-y-3">
                {outstandingInvoices.slice(0, 5).map((invoice) => (
                  <li key={invoice.id} className="flex items-start justify-between space-x-3">
                    <div className="flex items-start space-x-3">
                      <div className="p-2 bg-secondary rounded-full">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {invoice.invoiceNumber} - {invoice.customerName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Due: {formatDate(invoice.dueDate)} 
                          {invoice.daysOverdue > 0 && <span className="text-destructive"> ({invoice.daysOverdue} days overdue)</span>}
                        </p>
                      </div>
                    </div>
                    <div className="text-sm font-medium">
                      {formatCurrency(invoice.amount)}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-center py-4">No outstanding invoices</p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" /> Outstanding Procurements
            </CardTitle>
            <CardDescription>Vendor payments due</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-start space-x-3 animate-pulse">
                    <div className="p-2 bg-secondary rounded-full">
                      <div className="h-5 w-5 bg-primary/20 rounded-full" />
                    </div>
                    <div className="flex-1">
                      <div className="h-4 bg-secondary rounded w-3/4 mb-2" />
                      <div className="h-3 bg-secondary rounded w-1/2" />
                    </div>
                    <div className="h-4 bg-secondary rounded w-16" />
                  </div>
                ))}
              </div>
            ) : outstandingProcurements.length > 0 ? (
              <ul className="space-y-3">
                {outstandingProcurements.slice(0, 5).map((procurement) => (
                  <li key={procurement.id} className="flex items-start justify-between space-x-3">
                    <div className="flex items-start space-x-3">
                      <div className="p-2 bg-secondary rounded-full">
                        <Truck className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {procurement.invoiceNumber} - {procurement.vendorName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Due: {formatDate(procurement.dueDate)}
                          {procurement.daysOverdue > 0 && <span className="text-destructive"> ({procurement.daysOverdue} days overdue)</span>}
                        </p>
                      </div>
                    </div>
                    <div className="text-sm font-medium">
                      {formatCurrency(procurement.amount)}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-center py-4">No outstanding procurements</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Customers */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" /> Top Customers
          </CardTitle>
          <CardDescription>Your most valuable customers</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 border rounded-lg animate-pulse">
                  <div className="h-5 bg-secondary rounded w-3/4 mb-3" />
                  <div className="h-4 bg-secondary rounded w-1/2 mb-2" />
                  <div className="h-4 bg-secondary rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : topCustomers.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {topCustomers.slice(0, 6).map((customer) => (
                <div key={customer.id} className="p-4 border rounded-lg hover:bg-secondary/50 transition-colors">
                  <h3 className="font-medium">{customer.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {customer.totalOrders} orders · {formatCurrency(customer.totalSpent)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Last order: {formatDate(customer.lastOrderDate)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">No customer data available</p>
          )}
        </CardContent>
      </Card>

      {/* Order and Invoice Trends */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
        {/* Order Trends Chart */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" /> Order Trends
            </CardTitle>
            <CardDescription>Order count and revenue over time</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-64 bg-secondary/30 rounded-md animate-pulse flex items-center justify-center">
                <BarChart3 className="h-8 w-8 text-muted-foreground/50" />
              </div>
            ) : orderTrends.length > 0 ? (
              <div className="h-64">
                <Chart
                  config={{
                    orderCount: {
                      label: "Orders",
                      color: "hsl(var(--primary))"
                    },
                    revenue: {
                      label: "Revenue",
                      color: "hsl(var(--secondary))"
                    }
                  }}
                >
                  <ChartBar
                    dataKey="orderCount"
                    fill="var(--color-orderCount)"
                    radius={4}
                  />
                  <ChartLine
                    dataKey="revenue"
                    stroke="var(--color-revenue)"
                    strokeWidth={2}
                    dot={true}
                  />
                  <ChartXAxis dataKey="period" />
                  <ChartYAxis />
                  <ChartTooltip />
                  <ChartLegend />
                  {orderTrends.map((data, index) => (
                    <g key={index}>
                      <rect
                        x={index * (100 / orderTrends.length) + "%"}
                        y="0"
                        width={(100 / orderTrends.length) + "%"}
                        height="100%"
                        fill="transparent"
                        data-value={data.orderCount}
                        data-revenue={formatCurrency(data.revenue)}
                      />
                    </g>
                  ))}
                </Chart>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">No order trends data available</p>
            )}
          </CardContent>
        </Card>

        {/* Invoice Trends Chart */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" /> Invoice Trends
            </CardTitle>
            <CardDescription>Invoice count and amount over time</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-64 bg-secondary/30 rounded-md animate-pulse flex items-center justify-center">
                <BarChart3 className="h-8 w-8 text-muted-foreground/50" />
              </div>
            ) : invoiceTrends.length > 0 ? (
              <div className="h-64">
                <Chart
                  config={{
                    invoiceCount: {
                      label: "Invoices",
                      color: "hsl(var(--primary))"
                    },
                    amount: {
                      label: "Amount",
                      color: "hsl(var(--secondary))"
                    }
                  }}
                >
                  <ChartBar
                    dataKey="invoiceCount"
                    fill="var(--color-invoiceCount)"
                    radius={4}
                  />
                  <ChartLine
                    dataKey="amount"
                    stroke="var(--color-amount)"
                    strokeWidth={2}
                    dot={true}
                  />
                  <ChartXAxis dataKey="period" />
                  <ChartYAxis />
                  <ChartTooltip />
                  <ChartLegend />
                  {invoiceTrends.map((data, index) => (
                    <g key={index}>
                      <rect
                        x={index * (100 / invoiceTrends.length) + "%"}
                        y="0"
                        width={(100 / invoiceTrends.length) + "%"}
                        height="100%"
                        fill="transparent"
                        data-value={data.invoiceCount}
                        data-amount={formatCurrency(data.amount)}
                      />
                    </g>
                  ))}
                </Chart>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">No invoice trends data available</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Product Categories and Vendor Breakdown */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
        {/* Product Categories Chart */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" /> Product Categories
            </CardTitle>
            <CardDescription>Breakdown of products by category</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-64 bg-secondary/30 rounded-md animate-pulse flex items-center justify-center">
                <BarChart3 className="h-8 w-8 text-muted-foreground/50" />
              </div>
            ) : productCategories.length > 0 ? (
              <div className="h-64">
                <Chart
                  config={
                    productCategories.reduce((acc, category) => {
                      acc[category.categoryName] = {
                        label: category.categoryName,
                        color: `hsl(${Math.floor(Math.random() * 360)}, 70%, 50%)`
                      };
                      return acc;
                    }, {} as Record<string, { label: string; color: string }>)
                  }
                >
                  <ChartBar
                    dataKey="productCount"
                    fill={(data) => `var(--color-${data.categoryName})`}
                    radius={4}
                    stackId="a"
                  />
                  <ChartXAxis dataKey="categoryName" />
                  <ChartYAxis />
                  <ChartTooltip />
                  <ChartLegend />
                </Chart>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">No product category data available</p>
            )}
          </CardContent>
        </Card>

        {/* Vendor Breakdown Chart */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" /> Vendor Breakdown
            </CardTitle>
            <CardDescription>Procurement distribution by vendor</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-64 bg-secondary/30 rounded-md animate-pulse flex items-center justify-center">
                <BarChart3 className="h-8 w-8 text-muted-foreground/50" />
              </div>
            ) : vendorBreakdown.length > 0 ? (
              <div className="h-64">
                <Chart
                  config={
                    vendorBreakdown.reduce((acc, vendor) => {
                      acc[vendor.vendorName] = {
                        label: vendor.vendorName,
                        color: `hsl(${Math.floor(Math.random() * 360)}, 70%, 50%)`
                      };
                      return acc;
                    }, {} as Record<string, { label: string; color: string }>)
                  }
                >
                  <ChartBar
                    dataKey="totalAmount"
                    fill={(data) => `var(--color-${data.vendorName})`}
                    radius={4}
                  />
                  <ChartXAxis dataKey="vendorName" />
                  <ChartYAxis />
                  <ChartTooltip />
                  <ChartLegend />
                </Chart>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">No vendor breakdown data available</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Quick Links</CardTitle>
          <CardDescription>Navigate to key areas quickly</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[
            { label: "Create New Product", href: "/products/new", icon: Package },
            { label: "Create New Order", href: "/orders/new", icon: ShoppingCart },
            { label: "View Procurements", href: "/procurements", icon: Truck },
            { label: "Manage Staff", href: "/users/staff", icon: Users },
            { label: "View Invoices", href: "/invoices", icon: FileText },
            { label: "View Customers", href: "/users", icon: Users },
            { label: "View Products", href: "/products", icon: Package },
            { label: "View Orders", href: "/orders", icon: ShoppingCart },
          ].map(link => (
            <a
              key={link.label}
              href={link.href}
              className="flex flex-col items-center p-4 bg-secondary hover:bg-secondary/80 rounded-lg transition-colors text-center gap-2"
            >
              <link.icon className="h-5 w-5" />
              <span className="font-medium text-sm">{link.label}</span>
            </a>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
