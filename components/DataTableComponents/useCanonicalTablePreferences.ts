"use client"

import * as React from "react"
import type { ColumnOrderState, OnChangeFn, VisibilityState } from "@tanstack/react-table"
import {
  type CanonicalTableContract,
  type CanonicalTablePreferences,
  type TableDensity,
  defaultCanonicalTablePreferences,
  loadCanonicalTablePreferences,
  saveCanonicalTablePreferences,
} from "./table-system-contract"

function resolveUpdater<T>(updater: T | ((previous: T) => T), previous: T): T {
  return typeof updater === "function" ? (updater as (value: T) => T)(previous) : updater
}

export function useCanonicalTablePreferences(contract: CanonicalTableContract) {
  const [preferences, setPreferences] = React.useState<CanonicalTablePreferences>(() =>
    defaultCanonicalTablePreferences(contract),
  )
  const hydrated = React.useRef(false)

  React.useEffect(() => {
    setPreferences(loadCanonicalTablePreferences(contract, window.localStorage))
  }, [contract])

  React.useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true
      return
    }
    saveCanonicalTablePreferences(contract, preferences, window.localStorage)
  }, [contract, preferences])

  const setColumnVisibility = React.useCallback<OnChangeFn<VisibilityState>>((updater) => {
    setPreferences((previous) => ({
      ...previous,
      columnVisibility: resolveUpdater(updater, previous.columnVisibility),
      updatedAt: new Date().toISOString(),
    }))
  }, [])

  const setColumnOrder = React.useCallback<OnChangeFn<ColumnOrderState>>((updater) => {
    setPreferences((previous) => ({
      ...previous,
      columnOrder: resolveUpdater(updater, previous.columnOrder),
      updatedAt: new Date().toISOString(),
    }))
  }, [])

  const setDensity = React.useCallback((density: TableDensity) => {
    setPreferences((previous) => ({ ...previous, density, updatedAt: new Date().toISOString() }))
  }, [])

  const resetPreferences = React.useCallback(() => {
    setPreferences({ ...defaultCanonicalTablePreferences(contract), updatedAt: new Date().toISOString() })
  }, [contract])

  return {
    preferences,
    columnVisibility: preferences.columnVisibility,
    columnOrder: preferences.columnOrder,
    density: preferences.density,
    setColumnVisibility,
    setColumnOrder,
    setDensity,
    resetPreferences,
  }
}
