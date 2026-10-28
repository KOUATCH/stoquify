"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const NONE_VALUE = "__none__"

export type ItemReferenceKind = "brand" | "category" | "unit" | "tax"

export type ItemReferenceSource = {
  id: string
  nameEn?: string | null
  nameFr?: string | null
  title?: string | null
  titleEn?: string | null
  titleFr?: string | null
  brandName?: string | null
  taxRateName?: string | null
  name?: string | null
  symbol?: string | null
  rate?: number | string | null
}

export type ItemReferenceOption = {
  id: string
  label: string
}

export function itemReferenceLabel(
  option: ItemReferenceSource,
  kind: ItemReferenceKind,
) {
  if (kind === "category") {
    return option.titleEn || option.title || option.titleFr || "Unnamed category"
  }

  if (kind === "brand") {
    return option.nameEn || option.brandName || option.nameFr || "Unnamed brand"
  }

  if (kind === "unit") {
    const name = option.nameEn || option.name || option.nameFr || "Unnamed unit"
    return option.symbol ? `${name} (${option.symbol})` : name
  }

  const name = option.nameEn || option.taxRateName || option.name || option.nameFr || "Unnamed tax rate"
  return option.rate === null || option.rate === undefined ? name : `${name} (${option.rate}%)`
}

export function ItemReferenceSelect({
  id,
  value,
  options,
  placeholder,
  noneLabel,
  className,
  onValueChange,
}: {
  id: string
  value?: string | null
  options: ItemReferenceOption[]
  placeholder: string
  noneLabel: string
  className?: string
  onValueChange: (value: string | null) => void
}) {
  return (
    <Select
      value={value || NONE_VALUE}
      onValueChange={(nextValue) => onValueChange(nextValue === NONE_VALUE ? null : nextValue)}
    >
      <SelectTrigger id={id} className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE_VALUE}>{noneLabel}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.id} value={option.id}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
