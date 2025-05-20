
"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { 
  fetchStaffById, 
  updateStaffMember,
  fetchAllUsers,
  type StaffDto, 
  type UpdateStaffRequest,
  type UserDto
} from "@/lib/apiClient";
import { ChevronLeft, Save, Briefcase, Loader2, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

const STAFF_ROLES_OPTIONS = ["ADMIN", "MANAGER", "POS_USER", "SALES_PERSON"] as const;
const STAFF_STATUSES = ["ACTIVE", "INACTIVE"] as const;

const staffFormSchema = z.object({
  roles: z.array(z.string()).min(1, "At least one role must be selected."),
  permissionsInput: z.string().optional().nullable(),
  status: z.enum(STAFF_STATUSES).default("ACTIVE"),
});

type StaffFormValues = z.infer<typeof staffFormSchema>;

export default function EditStaffPage() {
  const router = useRouter();
  const params = useParams();
  const staffId = Number(params.id);
  const { toast } = useToast();

  const [staffMember, setStaffMember] = React.useState<StaffDto | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [userName, setUserName] = React.useState<string>("");


  const form = useForm<StaffFormValues>({
    resolver: zodResolver(staffFormSchema),
    defaultValues: {
      roles: [],
      permissionsInput: "",
      status: "ACTIVE",
    },
  });

  React.useEffect(() => {
    if (isNaN(staffId)) {
      toast({ title: "Error", description: "Invalid staff ID.", variant: "destructive" });
      router.push("/staff");
      return;
    }

    async function loadStaffData() {
      setIsLoading(true);
      try {
        const fetchedStaff = await fetchStaffById(staffId);
        setStaffMember(fetchedStaff);
        setUserName(fetchedStaff.user?.name || `User ID: ${fetchedStaff.userId}`);

        const currentStatus = fetchedStaff.status?.toUpperCase();
        const validStatus = STAFF_STATUSES.includes(currentStatus as any) ? currentStatus as "ACTIVE" | "INACTIVE" : "ACTIVE";

        form.reset({
          roles: fetchedStaff.roles || [],
          permissionsInput: fetchedStaff.permissions?.join(", ") ?? "",
          status: validStatus,
        });
      } catch (error: any) {
        console.error("Error fetching staff member for edit:", error);
        toast({
          title: "Error Fetching Staff Member",
          description: error.message || "Could not load staff data.",
          variant: "destructive",
        });
        router.push("/staff");
      } finally {
        setIsLoading(false);
      }
    }
    loadStaffData();
  }, [staffId, router, toast, form]);

  async function onSubmit(data: StaffFormValues) {
    setIsSubmitting(true);
    try {
      const permissions = data.permissionsInput?.split(',').map(p => p.trim()).filter(Boolean) || undefined;
      
      const payload: UpdateStaffRequest = {
        roles: data.roles,
        permissions: permissions,
        status: data.status,
      };
      
      await updateStaffMember(staffId, payload);
      toast({
        title: "Success",
        description: "Staff member updated successfully.",
      });
      router.push("/staff");
      router.refresh();
    } catch (error: any) {
      console.error("Error updating staff member:", error);
      toast({
        title: "Error Updating Staff Member",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6 pb-8 animate-pulse">
        <div className="flex items-center gap-2 md:gap-4">
          <Skeleton className="h-9 w-9" />
          <div><Skeleton className="h-8 w-3/5 mb-1" /><Skeleton className="h-4 w-4/5" /></div>
        </div>
        <Card className="shadow-md">
          <CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 md:gap-6">
            <Skeleton className="h-10 w-full" /> <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full md:col-span-2" /> <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
        <CardFooter className="flex justify-end gap-2 pt-6">
          <Skeleton className="h-10 w-24" /><Skeleton className="h-10 w-32" />
        </CardFooter>
      </div>
    );
  }

  if (!staffMember) {
    return <p className="text-center text-muted-foreground py-10">Staff member not found or failed to load.</p>;
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center gap-2 md:gap-4">
        <Button variant="outline" size="icon" asChild aria-label="Back to Staff List">
            <Link href="/staff"><ChevronLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight flex items-center">
            <Briefcase className="mr-2 h-6 w-6" />Edit Staff Member: {userName}
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">Modify roles, permissions, and status.</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 md:space-y-8">
          <Card className="shadow-md">
            <CardHeader><CardTitle>Staff Details</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 md:gap-6">
              <FormItem>
                <FormLabel>User (Read-only)</FormLabel>
                <FormControl><Input value={userName} readOnly disabled /></FormControl>
                <FormDescription>User linked to this staff profile cannot be changed here.</FormDescription>
              </FormItem>

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
            <Button type="submit" disabled={isSubmitting || isLoading} className="w-full sm:w-auto">
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : <><Save className="mr-2 h-4 w-4" /> Save Changes</>}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </div>
  );
}
