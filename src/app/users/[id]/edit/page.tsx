
"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { fetchUserById, updateUser, type UpdateUserRequest, type UserDto, type AddressDto as ApiAddressDto, type AddressCreateDto } from "@/lib/apiClient";
import { ChevronLeft, Save, Trash2, PlusCircle, UserCog, Loader2 } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { StateCombobox } from "@/components/ui/state-combobox";
import { USER_ROLE_SELECT_OPTIONS, CUSTOMER_ROLE_VALUE, indianStates } from "@/lib/constants";

const addressSchema = z.object({
  id: z.string().optional().nullable(),
  line1: z.string().optional().nullable().or(z.literal("")), 
  line2: z.string().optional().nullable().or(z.literal("")),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  stateCode: z.string().min(1, "State code is required"), 
  country: z.string().optional().nullable().or(z.literal("")), 
  postalCode: z.string().optional().nullable().or(z.literal("")), 
  type: z.enum(["SHIPPING", "BILLING"]).optional().nullable(),
  isDefault: z.boolean().optional().default(false),
});

const userFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address").optional().nullable().or(z.literal("")),
  role: z.string().min(1, "Role selection is required."), // Will use CUSTOMER_ROLE_VALUE for customer
  status: z.enum(["ACTIVE", "INACTIVE"]).optional().default("ACTIVE"),
  addresses: z.array(addressSchema).min(1, "At least one address is required."),
});

type UserFormValues = z.infer<typeof userFormSchema>;

const USER_STATUSES = ["ACTIVE", "INACTIVE"] as const;
const ADDRESS_TYPES = ["SHIPPING", "BILLING"] as const;

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;
  const { toast } = useToast();

  const [user, setUser] = React.useState<UserDto | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: "",
      email: "",
      role: CUSTOMER_ROLE_VALUE,
      status: "ACTIVE",
      addresses: [],
    },
  });

  const { fields: addressFields, append: appendAddress, remove: removeAddress } = useFieldArray({
    control: form.control,
    name: "addresses",
  });

  React.useEffect(() => {
    if (!userId) {
      toast({ title: "Error", description: "Invalid user ID.", variant: "destructive" });
      router.push("/users");
      return;
    }

    async function loadUser() {
      setIsLoading(true);
      try {
        const fetchedUser = await fetchUserById(userId);
        setUser(fetchedUser);

        const currentStatus = fetchedUser.status?.toUpperCase();
        const validStatus = USER_STATUSES.includes(currentStatus as any) ? currentStatus as "ACTIVE" | "INACTIVE" : "ACTIVE";
        
        let formRoleValue = CUSTOMER_ROLE_VALUE;
        if (fetchedUser.role && USER_ROLE_SELECT_OPTIONS.find(opt => opt.value === fetchedUser.role)) {
            formRoleValue = fetchedUser.role;
        }


        form.reset({
          name: fetchedUser.name ?? "",
          email: fetchedUser.email ?? "",
          role: formRoleValue,
          status: validStatus,
          addresses: fetchedUser.addresses?.map(addr => ({
            id: addr.id,
            line1: addr.line1 ?? "",
            line2: addr.line2 ?? "",
            city: addr.city ?? "",
            state: addr.state ?? "",
            stateCode: addr.stateCode ?? "",
            country: addr.country ?? "India",
            postalCode: addr.postalCode ?? "",
            type: addr.type as ("SHIPPING" | "BILLING" | undefined) ?? undefined,
            isDefault: addr.isDefault ?? false,
          })) ?? [{ 
            id: undefined, line1: "", line2: "", city: "", state: "", stateCode: "", country: "India",
            postalCode: "", type: "BILLING", isDefault: true,
          }],
        });
      } catch (error: any) {
        console.error("Error fetching user for edit:", error);
        toast({
          title: "Error Fetching User",
          description: error.message || "Could not load user data.",
          variant: "destructive",
        });
        router.push("/users");
      } finally {
        setIsLoading(false);
      }
    }
    loadUser();
  }, [userId, router, toast, form]);

  async function onSubmit(data: UserFormValues) {
    setIsSubmitting(true);
    try {
      const payload: UpdateUserRequest = {
        name: data.name,
        email: data.email || undefined,
        role: data.role === CUSTOMER_ROLE_VALUE ? undefined : data.role, // Map Customer to undefined/null for API
        status: data.status,
        addresses: data.addresses.map(addr => {
          const { id, ...rest } = addr;
          const apiAddr: AddressCreateDto | ApiAddressDto = {
            ...rest,
            line1: rest.line1 || undefined,
            city: rest.city,
            state: rest.state,
            stateCode: rest.stateCode,
            country: rest.country || undefined,
            postalCode: rest.postalCode || undefined,
            line2: rest.line2 || undefined,
            type: rest.type || undefined,
            isDefault: rest.isDefault,
          };
          if (id) {
            (apiAddr as ApiAddressDto).id = id;
          }
          return apiAddr;
        }),
      };

      await updateUser(userId, payload);
      toast({
        title: "Success",
        description: "User updated successfully.",
      });
      router.push("/users");
      router.refresh();
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast({
        title: "Error Updating User",
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
          <div>
            <Skeleton className="h-8 w-64 mb-1" />
            <Skeleton className="h-4 w-80" />
          </div>
        </div>
        <Card className="shadow-md">
          <CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 md:gap-6">
            <Skeleton className="h-10 w-full" /> <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" /> <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-10 w-32" />
          </CardContent>
        </Card>
        <CardFooter className="flex justify-end gap-2 pt-6">
          <Skeleton className="h-10 w-24" /><Skeleton className="h-10 w-32" />
        </CardFooter>
      </div>
    );
  }

  if (!user) {
    return <p className="text-center text-muted-foreground py-10">User not found.</p>;
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center gap-2 md:gap-4">
        <Button variant="outline" size="icon" asChild aria-label="Back to Users">
          <Link href="/users"><ChevronLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight flex items-center">
            <UserCog className="mr-2 h-6 w-6" />Edit User: {user.name}
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">Update user details and addresses.</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 md:space-y-8">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>User Information</CardTitle>
              <CardDescription>Phone number is read-only.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 md:gap-6">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name *</FormLabel>
                  <FormControl><Input placeholder="e.g., John Doe" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormItem>
                <FormLabel>Phone Number (Read-only)</FormLabel>
                <FormControl><Input value={user.phone ?? ""} readOnly disabled /></FormControl>
              </FormItem>
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl><Input type="email" placeholder="e.g., john.doe@example.com" {...field} value={field.value ?? ""} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="role" render={({ field }) => (
                <FormItem>
                  <FormLabel>Role *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {USER_ROLE_SELECT_OPTIONS.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {USER_STATUSES.map(status => <SelectItem key={status} value={status}>{status}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Addresses *</CardTitle>
              <CardDescription>At least one address is required.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {addressFields.map((formField, index) => (
                <Card key={formField.id} className="p-4 space-y-3 bg-secondary/50">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">Address {index + 1} {form.watch(`addresses.${index}.id`) ? `(ID: ${form.watch(`addresses.${index}.id`)?.substring(0,6)}...)` : "(New)"}</h4>
                     {addressFields.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeAddress(index)} className="text-destructive hover:text-destructive/80">
                        <Trash2 className="h-4 w-4" />
                        </Button>
                     )}
                  </div>
                  <input type="hidden" {...form.register(`addresses.${index}.id`)} />
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField control={form.control} name={`addresses.${index}.line1`} render={({ field: f }) => (
                      <FormItem><FormLabel>Line 1</FormLabel><FormControl><Input {...f} value={f.value ?? ""} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name={`addresses.${index}.line2`} render={({ field: f }) => (
                      <FormItem><FormLabel>Line 2</FormLabel><FormControl><Input {...f} value={f.value ?? ""} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name={`addresses.${index}.city`} render={({ field: f }) => (
                      <FormItem><FormLabel>City *</FormLabel><FormControl><Input {...f} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <Controller
                      control={form.control}
                      name={`addresses.${index}.state`}
                      render={({ field: stateField }) => (
                        <FormItem>
                          <FormLabel>State *</FormLabel>
                          <StateCombobox
                            value={stateField.value}
                            onValueChange={(newState) => {
                              form.setValue(`addresses.${index}.state`, newState || "");
                              const selectedStateObj = indianStates.find(s => s.name === newState);
                              form.setValue(`addresses.${index}.stateCode`, selectedStateObj?.code || "");
                            }}
                            onStateCodeChange={(newStateCode) => {
                               // This callback can be used if StateCombobox itself directly provided the code
                            }}
                          />
                          <FormMessage>{form.formState.errors.addresses?.[index]?.state?.message}</FormMessage>
                           <FormField control={form.control} name={`addresses.${index}.stateCode`} render={({ field: f }) => (
                              <FormItem className="sr-only">
                                <FormLabel>State Code *</FormLabel><FormControl><Input {...f} readOnly /></FormControl><FormMessage />
                              </FormItem>
                          )}/>
                        </FormItem>
                      )}
                    />
                    <FormField control={form.control} name={`addresses.${index}.country`} render={({ field: f }) => (
                      <FormItem><FormLabel>Country</FormLabel><FormControl><Input {...f} value={f.value ?? ""} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name={`addresses.${index}.postalCode`} render={({ field: f }) => (
                      <FormItem><FormLabel>Postal Code</FormLabel><FormControl><Input {...f} value={f.value ?? ""} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name={`addresses.${index}.type`} render={({ field: f }) => (
                      <FormItem>
                        <FormLabel>Address Type</FormLabel>
                        <Select onValueChange={f.onChange} value={f.value ?? ""}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {ADDRESS_TYPES.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <Controller
                      control={form.control}
                      name={`addresses.${index}.isDefault`}
                      render={({ field: f }) => (
                        <FormItem className="flex flex-row items-end space-x-3 space-y-0 pb-2">
                          <FormControl>
                            <Button
                              type="button"
                              variant={f.value ? "default" : "outline"}
                              onClick={() => {
                                if (!f.value) {
                                  form.getValues("addresses")?.forEach((_, addrIdx) => {
                                    if (index !== addrIdx) {
                                      form.setValue(`addresses.${addrIdx}.isDefault`, false);
                                    }
                                  });
                                }
                                f.onChange(!f.value);
                              }}
                              className="w-full"
                            >
                              {f.value ? "Default Address" : "Set as Default"}
                            </Button>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </Card>
              ))}
              <Button type="button" variant="outline" onClick={() => appendAddress({
                id: undefined, line1: "", line2: "", city: "", state: "", stateCode: "", country: "India",
                postalCode: "", type: "SHIPPING", isDefault: addressFields.length === 0
              })}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Address
              </Button>
              <FormMessage>{form.formState.errors.addresses?.message || form.formState.errors.addresses?.root?.message}</FormMessage>
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
      

    
