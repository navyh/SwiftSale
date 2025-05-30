
"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { indianStates, type IndianState } from "@/lib/constants"

interface StateComboboxProps {
  value: string | undefined; // Selected state name
  onValueChange: (value: string | undefined) => void; // Callback for state name
  onStateCodeChange: (code: string | undefined) => void; // Callback for state code
  disabled?: boolean;
  placeholder?: string;
  notFoundText?: string;
  searchText?: string;
}

export function StateCombobox({
  value,
  onValueChange,
  onStateCodeChange,
  disabled,
  placeholder = "Select state...",
  notFoundText = "No state found.",
  searchText = "Search state...",
}: StateComboboxProps) {
  const [open, setOpen] = React.useState(false)

  const handleSelect = (currentState: IndianState | undefined) => {
    setOpen(false)
    if (currentState) {
      onValueChange(currentState.name)
      onStateCodeChange(currentState.code)
    } else {
      onValueChange(undefined)
      onStateCodeChange(undefined)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", !value && "text-muted-foreground")}
          disabled={disabled}
        >
          {value
            ? indianStates.find((state) => state.name === value)?.name
            : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchText} />
          <CommandList>
            <CommandEmpty>{notFoundText}</CommandEmpty>
            <CommandGroup>
              {indianStates.map((state) => (
                <CommandItem
                  key={state.code}
                  value={state.name}
                  onSelect={(currentValue) => {
                    const selectedState = indianStates.find(
                      (s) => s.name.toLowerCase() === currentValue.toLowerCase()
                    );
                    handleSelect(selectedState);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === state.name ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {state.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
