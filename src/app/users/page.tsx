import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PlusCircle, Search, Edit3, Trash2, Filter, Building, UsersRound as StaffIcon, UserCircle } from "lucide-react";

const users = [
  { id: "USR001", name: "John Admin", email: "john.admin@example.com", role: "Admin", status: "Active", avatar: "https://placehold.co/40x40.png?text=JA", dataAiHint: "man face" },
  { id: "USR002", name: "Jane Staff", email: "jane.staff@example.com", role: "Staff", status: "Active", avatar: "https://placehold.co/40x40.png?text=JS", dataAiHint: "woman face" },
  { id: "USR003", name: "Peter Pending", email: "peter.pending@example.com", role: "Staff", status: "Pending", avatar: "https://placehold.co/40x40.png?text=PP", dataAiHint: "person silhouette" },
];

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">User & Profile Management</h1>
          <p className="text-muted-foreground">Manage users, business profiles, and staff members.</p>
        </div>
         <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> Add New User
          </Button>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-3 md:w-[400px]">
          <TabsTrigger value="users"><UserCircle className="mr-1 h-4 w-4 md:mr-2"/>My Profile</TabsTrigger>
          <TabsTrigger value="staff"><StaffIcon className="mr-1 h-4 w-4 md:mr-2"/>Staff</TabsTrigger>
          <TabsTrigger value="business"><Building className="mr-1 h-4 w-4 md:mr-2"/>Business Profile</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>My Profile</CardTitle>
              <CardDescription>Manage your personal account details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Interface for managing the logged-in user's profile, including password changes, contact information, etc., based on API schemas.</p>
               <Button variant="outline">Edit My Profile</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="staff">
          <Card className="shadow-md">
            <CardHeader>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <CardTitle>Staff Management</CardTitle>
                 <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="relative flex-grow md:flex-grow-0">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input type="search" placeholder="Search staff..." className="pl-8 w-full md:w-[250px]" />
                    </div>
                    <Button variant="outline">
                        <Filter className="mr-2 h-4 w-4" /> Filters
                    </Button>
                </div>
              </div>
              <CardDescription>Manage staff accounts, roles, and permissions.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">Avatar</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar} alt={user.name} data-ai-hint={user.dataAiHint} />
                          <AvatarFallback>{user.name.substring(0,1)}</AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.role}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          user.status === "Active" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                        }`}>
                          {user.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="hover:text-primary">
                          <Edit3 className="h-4 w-4" />
                           <span className="sr-only">Edit User</span>
                        </Button>
                        <Button variant="ghost" size="icon" className="hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Delete User</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="business">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Business Profile</CardTitle>
              <CardDescription>Manage your main business information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Interface for managing the business profile, including name, address, contact details, logo, etc., based on API schemas.</p>
              <Button variant="outline">Edit Business Profile</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
