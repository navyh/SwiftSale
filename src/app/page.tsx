import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, DollarSign, Package, Users, ShoppingCart } from 'lucide-react';

export default function DashboardPage() {
  const stats = [
    { title: "Total Revenue", value: "$45,231.89", change: "+20.1% from last month", icon: DollarSign, dataAiHint: "money graph" },
    { title: "Active Orders", value: "120", change: "+15 since yesterday", icon: ShoppingCart, dataAiHint: "shopping cart" },
    { title: "New Products", value: "32", change: "+5 this week", icon: Package, dataAiHint: "product boxes" },
    { title: "New Customers", value: "8", change: "+2 today", icon: Users, dataAiHint: "people group" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome to SwiftSale!</h1>
          <p className="text-muted-foreground">Here's an overview of your business performance.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground pt-1">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>A log of recent important events.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {[
                { text: "New order #12345 placed by John Doe.", time: "2m ago", icon: ShoppingCart, dataAiHint: "order receipt" },
                { text: "Product 'Wireless Mouse' stock updated.", time: "1h ago", icon: Package, dataAiHint: "warehouse inventory" },
                { text: "User 'Alice Smith' registered.", time: "3h ago", icon: Users, dataAiHint: "user profile" },
                { text: "Invoice #INV-007 paid for procurement.", time: "5h ago", icon: FileText, dataAiHint: "invoice document" },
              ].map((activity, index) => (
                <li key={index} className="flex items-start space-x-3">
                  <div className="p-2 bg-secondary rounded-full">
                    <activity.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{activity.text}</p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Quick Links</CardTitle>
            <CardDescription>Navigate to key areas quickly.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            {[
              { label: "Create New Product", href: "/products/new", dataAiHint: "add product" },
              { label: "Create New Order", href: "/orders/new", dataAiHint: "add order" },
              { label: "View All Procurements", href: "/procurements", dataAiHint: "view procurements" },
              { label: "Manage Staff", href: "/users/staff", dataAiHint: "manage staff" },
            ].map(link => (
              <a
                key={link.label}
                href={link.href}
                className="block p-4 bg-secondary hover:bg-secondary/80 rounded-lg transition-colors text-center font-medium"
              >
                {link.label}
              </a>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
