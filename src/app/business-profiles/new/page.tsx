
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
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { createBusinessProfile, type CreateBusinessProfileRequest, type AddressCreateDto } from "@/lib/apiClient";
import { ChevronLeft, PlusCircle, Save, Trash2, Building2 } from "lucide-react";
import Link from "next/link";
import { Textarea } from "@/components/ui/textarea";

const addressSchema = z.object({
  line1: z.string().min(1, "Address line 1 is required"),
  line2: z.string().optional().nullable(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  country: z.string().min(1, "Country is required"),
  postalCode: z.string().min(1, "Postal code is required"),
  type: z.enum(["SHIPPING", "BILLING"]).optional().nullable(),
  isDefault: z.boolean().optional().default(false),
});

const profileFormSchema = z.object({
  name: z.string().min(1, "Business name is required"),
  gstin: z.string().min(1, "GSTIN is required")
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, "Invalid GSTIN format"),
  paymentTerms: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
  addresses: z.array(addressSchema).optional(),
  // userIds will be handled on the edit screen
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

const PROFILE_STATUSES = ["ACTIVE", "INACTIVE"] as const;
const ADDRESS_TYPES = ["SHIPPING", "BILLING"] as const;

export default function CreateBusinessProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: "",
      gstin: "",
      paymentTerms: "",
      status: "ACTIVE",
      addresses: [],
    },
  });

  const { fields: addressFields, append: appendAddress, remove: removeAddress } = useFieldArray({
    control: form.control,
    name: "addresses",
  });

  async function onSubmit(data: ProfileFormValues) {
    setIsSubmitting(true);
    try {
      const payload: CreateBusinessProfileRequest = {
        name: data.name,
        gstin: data.gstin,
        paymentTerms: data.paymentTerms || undefined,
        status: data.status,
        addresses: data.addresses?.map(addr => ({
            ...addr,
            line2: addr.line2 || undefined,
            type: addr.type || undefined,
        })) || [], // Send empty array if addresses is null/undefined
        userIds: undefined, // Not handling userIds on creation form for simplicity
      };
      
      await createBusinessProfile(payload);
      toast({
        title: "Success",
        description: "Business profile created successfully.",
      });
      router.push("/business-profiles");
    } catch (error: any) {
      toast({
        title: "Error Creating Profile",
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
        <Button variant="outline" size="icon" asChild aria-label="Back to Business Profiles">
            <Link href="/business-profiles"><ChevronLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight flex items-center">
            <Building2 className="mr-2 h-6 w-6" />Create New Business Profile
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">Fill in the details to add a new business profile.</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 md:space-y-8">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 md:gap-6">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Business Name *</FormLabel>
                  <FormControl><Input placeholder="e.g., Acme Corp" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}/>
              <FormField control={form.control} name="gstin" render={({ field }) => (
                <FormItem>
                  <FormLabel>GSTIN *</FormLabel>
                  <FormControl><Input placeholder="e.g., 22AAAAA0000A1Z5" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}/>
              <FormField control={form.control} name="paymentTerms" render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Terms</FormLabel>
                  <FormControl><Input placeholder="e.g., Net 30 Days" {...field} value={field.value ?? ""} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}/>
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {PROFILE_STATUSES.map(status => <SelectItem key={status} value={status}>{status}</SelectItem>)}
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
              <CardDescription>Manage business addresses.</CardDescription>
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
                                      // Ensure only one address is default
                                      if (!f.value) {
                                        form.getValues("addresses").forEach((_, addrIdx) => {
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
              <Button type="button" variant="outline" onClick={() => appendAddress({ line1: '', city: '', state: '', country: '', postalCode: '', isDefault: addressFields.length === 0, type: 'BILLING' })}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Address
              </Button>
            </CardContent>
          </Card>

          <CardFooter className="flex flex-col sm:flex-row justify-end gap-2 pt-6">
            <Button type="button" variant="outline" onClick={() => router.back()} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
              {isSubmitting ? "Creating..." : <><Save className="mr-2 h-4 w-4" /> Create Profile</>}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </div>
  );
}

