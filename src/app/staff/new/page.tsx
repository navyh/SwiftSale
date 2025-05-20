
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { 
  createStaffMember, 
  fetchAllUsers,
  type CreateStaffRequest, 
  type UserDto 
} from "@/lib/apiClient";
import { ChevronLeft, Save, Briefcase, Loader2, Users } from "lucide-react";
import Link from "next/link";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

const STAFF_ROLES_OPTIONS = ["ADMIN", "MANAGER", "POS_USER", "SALES_PERSON"] as const;
const STAFF_STATUSES = ["ACTIVE", "INACTIVE"] as const;

const staffFormSchema = z.object({
  userId: z.coerce.number({ required_error: "User selection is required." }).min(1, "User selection is required."),
  roles: z.array(z.string()).min(1, "At least one role must be selected."),
  permissionsInput: z.string().optional().nullable(), // Comma-separated string
  status: z.enum(STAFF_STATUSES).default("ACTIVE"),
});

type StaffFormValues = z.infer<typeof staffFormSchema>;

export default function CreateStaffPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [allUsers, setAllUsers] = React.useState<UserDto[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = React.useState(true);

  const form = useForm<StaffFormValues>({
    resolver: zodResolver(staffFormSchema),
    defaultValues: {
      userId: undefined,
      roles: [],
      permissionsInput: "",
      status: "ACTIVE",
    },
  });

  React.useEffect(() => {
    async function loadUsers() {
      setIsLoadingUsers(true);
      try {
        const users = await fetchAllUsers();
        setAllUsers(users);
      } catch (error: any) {
        toast({
          title: "Error Fetching Users",
          description: error.message || "Could not load users for selection.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingUsers(false);
      }
    }
    loadUsers();
  }, [toast]);

  async function onSubmit(data: StaffFormValues) {
    setIsSubmitting(true);
    try {
      const permissions = data.permissionsInput?.split(',').map(p => p.trim()).filter(Boolean) || undefined;
      
      const payload: Omit<CreateStaffRequest, 'userId'> = { // userId is path param for createStaffMember
        roles: data.roles,
        permissions: permissions,
        status: data.status,
      };
      
      await createStaffMember(data.userId, payload);
      toast({
        title: "Success",
        description: "Staff member created successfully.",
      });
      router.push("/staff");
      router.refresh();
    } catch (error: any) {
      console.error("Error creating staff member:", error);
      toast({
        title: "Error Creating Staff",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center gap-2 md:gap-4">
        <Button variant="outline" size="icon" asChild aria-label="Back to Staff List">
            <Link href="/staff"><ChevronLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight flex items-center">
            <Briefcase className="mr-2 h-6 w-6" />Add New Staff Member
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">Assign roles and permissions to an existing user.</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 md:space-y-8">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Staff Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 md:gap-6">
              <FormField
                control={form.control}
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>User *</FormLabel>
                    <Select onValueChange={(value) => field.onChange(Number(value))} value={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger disabled={isLoadingUsers}>
                          <SelectValue placeholder={isLoadingUsers ? "Loading users..." : "Select a user"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isLoadingUsers ? (
                           <SelectItem value="loading" disabled>Loading...</SelectItem>
                        ) : allUsers.length > 0 ? (
                          allUsers.map(user => (
                            <SelectItem key={user.id} value={user.id.toString()}>
                              {user.name} ({user.email || user.phone})
                            </SelectItem>
                          ))
                        ) : (
                           <SelectItem value="no_users" disabled>No users available</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="roles"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Roles *</FormLabel>
                     <Popover>
                        <PopoverTrigger asChild>
                            <FormControl>
                            <Button variant="outline" role="combobox" className="w-full justify-between">
                                {field.value && field.value.length > 0 
                                ? `${field.value.length} role(s) selected` 
                                : "Select roles..."}
                                <Users className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                            </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                            <ScrollArea className="h-48">
                                <div className="p-4 space-y-2">
                                {STAFF_ROLES_OPTIONS.map((role) => (
                                <FormItem key={role} className="flex flex-row items-start space-x-3 space-y-0">
                                    <FormControl>
                                    <Checkbox
                                        checked={field.value?.includes(role)}
                                        onCheckedChange={(checked) => {
                                        return checked
                                            ? field.onChange([...(field.value || []), role])
                                            : field.onChange(
                                                (field.value || []).filter(
                                                (value) => value !== role
                                                )
                                            );
                                        }}
                                    />
                                    </FormControl>
                                    <FormLabel className="font-normal text-sm">
                                    {role.replace(/_/g, ' ').charAt(0).toUpperCase() + role.replace(/_/g, ' ').slice(1).toLowerCase()}
                                    </FormLabel>
                                </FormItem>
                                ))}
                                </div>
                            </ScrollArea>
                        </PopoverContent>
                    </Popover>
                    <FormDescription>Select one or more roles for the staff member.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="permissionsInput"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Permissions (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., MANAGE_ORDERS,VIEW_REPORTS" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormDescription>Comma-separated list of specific permissions.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {STAFF_STATUSES.map(status => <SelectItem key={status} value={status}>{status}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <CardFooter className="flex flex-col sm:flex-row justify-end gap-2 pt-6">
            <Button type="button" variant="outline" onClick={() => router.back()} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || isLoadingUsers} className="w-full sm:w-auto">
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Adding...</> : <><Save className="mr-2 h-4 w-4" /> Add Staff Member</>}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </div>
  );
}
