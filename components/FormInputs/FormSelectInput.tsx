"use client";

import AddNewButton from "@/components/FormInputs/AddNewButton";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command } from "cmdk";
import { Check, ChevronsUpDown } from "lucide-react";
import { useState } from "react";

type RoleOption = { label: string; value: string };

type FormSelectInputProps = {
  options: RoleOption[];
  label: string;
  option: RoleOption | null | undefined;
  setOption: (option: RoleOption) => void;
  href?: string;
  labelShown?: boolean;
  toolTipText?: string;
};
export default function FormSelectInput({
  options,
  label,
  option,
  setOption,
  href,
  toolTipText,
  labelShown = true,
}: FormSelectInputProps) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      {labelShown && (
        <h2 className="block pb-2 text-sm font-medium leading-6 text-foreground">
          Select {label}
        </h2>
      )}
      <div className="flex items-center space-x-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="w-full min-w-0 justify-between"
              aria-label={option ? label + ": " + option.label : label}
              disabled={options.length === 0}
            >
              <span className="truncate">{option?.label ?? label}</span>
              <ChevronsUpDown aria-hidden="true" className="opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0">
            <Command label={label}>
              <Command.Input
                placeholder="Search roles…"
                className="w-full rounded-t-lg border-b bg-transparent px-3 py-2 text-sm"
              />
              <Command.List className="max-h-56 overflow-y-auto p-1">
                <Command.Empty className="px-2 py-2 text-sm">No matching roles.</Command.Empty>
                {options.map((item) => (
                  <Command.Item
                    key={item.value}
                    value={item.value}
                    keywords={[item.label]}
                    onSelect={() => {
                      setOption(item);
                      setOpen(false);
                    }}
                    className="flex cursor-pointer items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-sm data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
                  >
                    <span>{item.label}</span>
                    {item.value === option?.value && <Check aria-hidden="true" className="size-4" />}
                  </Command.Item>
                ))}
              </Command.List>
            </Command>
          </PopoverContent>
        </Popover>
        {href && toolTipText && (
          <AddNewButton toolTipText={toolTipText} href={href} />
        )}
      </div>
    </div>
  );
}
