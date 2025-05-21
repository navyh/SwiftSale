
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { createUser, type CreateUserRequest, type AddressCreateDto } from "@/lib/apiClient";
import { ChevronLeft, PlusCircle, Save, Trash2, UserPlus, Loader2 } from "lucide-react";
import Link from "next/link";

const addressSchema = z.object({
  line1: z.string().min(1, "Address line 1 is required"),
  line2: z.string().optional().nullable().or(z.literal("")),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  country: z.string().min(1, "Country is required"),
  postalCode: z.string().min(1, "Postal code is required"),
  type: z.enum(["SHIPPING", "BILLING"]).optional().nullable(),
  isDefault: z.boolean().optional().default(false),
});

const userFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Phone number is required").regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format, e.g., +1234567890"),
  email: z.string().email("Invalid email address").optional().nullable().or(z.literal("")),
  // type field removed
  // gstin field removed
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
  addresses: z.array(addressSchema).optional(),
});

type UserFormValues = z.infer<typeof userFormSchema>;

// USER_TYPES removed
const USER_STATUSES = ["ACTIVE", "INACTIVE"] as const;
const ADDRESS_TYPES = ["SHIPPING", "BILLING"] as const;

export default function CreateUserPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      // type: "B2C", // default removed
      // gstin: "", // default removed
      status: "ACTIVE",
      addresses: [],
    },
  });

  const { fields: addressFields, append: appendAddress, remove: removeAddress } = useFieldArray({
    control: form.control,
    name: "addresses",
  });

  async function onSubmit(data: UserFormValues) {
    setIsSubmitting(true);
    try {
      const payload: CreateUserRequest = {
        name: data.name,
        phone: data.phone,
        email: data.email || undefined,
        // type field removed
        // gstin field removed
        status: data.status,
        addresses: data.addresses?.map(addr => ({
            ...addr,
            line2: addr.line2 || undefined,
            type: addr.type || undefined,
        })) || [], 
      };
      
      await createUser(payload);
      toast({
        title: "Success",
        description: "User created successfully.",
      });
      router.push("/users");
      router.refresh();
    } catch (error: any) {
      toast({
        title: "Error Creating User",
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
        <Button variant="outline" size="icon" asChild aria-label="Back to Users">
            <Link href="/users"><ChevronLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight flex items-center">
            <UserPlus className="mr-2 h-6 w-6" /> Create New User
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">Fill in the details to add a new user.</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 md:space-y-8">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>User Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 md:gap-6">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name *</FormLabel>
                  <FormControl><Input placeholder="e.g., John Doe" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}/>
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number *</FormLabel>
                  <FormControl><Input placeholder="e.g., +1234567890" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}/>
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl><Input type="email" placeholder="e.g., john.doe@example.com" {...field} value={field.value ?? ""} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}/>
              {/* User Type field removed */}
              {/* GSTIN field removed */}
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
              )}/>
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Addresses</CardTitle>
              <CardDescription>Manage user addresses.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {addressFields.map((field, index) => (
                <Card key={field.id} className="p-4 space-y-3 bg-secondary/50">
                  <div className="flex justify-between items-center">
                     <h4 className="font-medium">Address {index + 1}</h4>
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeAddress(index)} className="text-destructive hover:text-destructive/80">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField control={form.control} name={`addresses.${index}.line1`} render={({ field: f }) => (
                        <FormItem><FormLabel>Line 1 *</FormLabel><FormControl><Input {...f} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name={`addresses.${index}.line2`} render={({ field: f }) => (
                        <FormItem><FormLabel>Line 2</FormLabel><FormControl><Input {...f} value={f.value ?? ""} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name={`addresses.${index}.city`} render={({ field: f }) => (
                        <FormItem><FormLabel>City *</FormLabel><FormControl><Input {...f} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name={`addresses.${index}.state`} render={({ field: f }) => (
                        <FormItem><FormLabel>State *</FormLabel><FormControl><Input {...f} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name={`addresses.${index}.country`} render={({ field: f }) => (
                        <FormItem><FormLabel>Country *</FormLabel><FormControl><Input {...f} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name={`addresses.${index}.postalCode`} render={({ field: f }) => (
                        <FormItem><FormLabel>Postal Code *</FormLabel><FormControl><Input {...f} /></FormControl><FormMessage /></FormItem>
                    )}/>
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
                    )}/>
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
              <Button type="button" variant="outline" onClick={() => appendAddress({ line1: '', city: '', state: '', country: '', postalCode: '', isDefault: addressFields.length === 0, type: 'SHIPPING' })}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Address
              </Button>
            </CardContent>
          </Card>

          <CardFooter className="flex flex-col sm:flex-row justify-end gap-2 pt-6">
            <Button type="button" variant="outline" onClick={() => router.back()} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</> : <><Save className="mr-2 h-4 w-4" /> Create User</>}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </div>
  );
}
