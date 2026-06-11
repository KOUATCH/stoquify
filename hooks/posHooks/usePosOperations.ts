"use client"

import {
  getPOSCatalogAction,
  getPOSLocationsAction,
  getPOSTerminalsAction,
} from "@/actions/pos/catalog.actions"
import {
  closePOSShiftAction,
  getActivePOSSessionAction,
  openPOSShiftAction,
} from "@/actions/pos/session.actions"
import {
  addPOSCartLineAction,
  getActivePOSCartAction,
  removePOSCartLineAction,
  updatePOSCartLineAction,
} from "@/actions/pos/cart.actions"
import { getCustomersAction } from "@/actions/customers/customerActions"
import { commitPOSSaleAction, refundPOSSaleAction, voidPOSSaleAction } from "@/actions/pos/tender.actions"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

export const posOperationsKeys = {
  all: ["pos-operations"] as const,
  locations: () => [...posOperationsKeys.all, "locations"] as const,
  terminals: (locationId?: string) => [...posOperationsKeys.all, "terminals", locationId] as const,
  activeSession: (terminalId?: string) => [...posOperationsKeys.all, "active-session", terminalId] as const,
  catalog: (locationId?: string, search?: string, categoryId?: string) =>
    [...posOperationsKeys.all, "catalog", locationId, search, categoryId] as const,
  cart: (locationId?: string, terminalId?: string, sessionId?: string) =>
    [...posOperationsKeys.all, "cart", locationId, terminalId, sessionId] as const,
  customers: () => [...posOperationsKeys.all, "customers"] as const,
}

export function usePOSLocations() {
  return useQuery({
    queryKey: posOperationsKeys.locations(),
    queryFn: () => getPOSLocationsAction(),
  })
}

export function usePOSTerminals(locationId?: string) {
  return useQuery({
    queryKey: posOperationsKeys.terminals(locationId),
    queryFn: () => getPOSTerminalsAction({ locationId }),
  })
}

export function useActivePOSShift(terminalId?: string) {
  return useQuery({
    queryKey: posOperationsKeys.activeSession(terminalId),
    queryFn: () => getActivePOSSessionAction({ terminalId }),
    enabled: !!terminalId,
    refetchInterval: 30000,
  })
}

export function usePOSCatalog(params: { locationId?: string; search?: string; categoryId?: string }) {
  return useQuery({
    queryKey: posOperationsKeys.catalog(params.locationId, params.search, params.categoryId),
    queryFn: () => getPOSCatalogAction({
      locationId: params.locationId,
      search: params.search,
      categoryId: params.categoryId,
    }),
    enabled: !!params.locationId,
  })
}

export function useActivePOSCart(params: { locationId?: string; terminalId?: string; sessionId?: string }) {
  return useQuery({
    queryKey: posOperationsKeys.cart(params.locationId, params.terminalId, params.sessionId),
    queryFn: () => getActivePOSCartAction(params),
    enabled: !!params.locationId && !!params.terminalId,
  })
}

export function usePOSCustomers() {
  return useQuery({
    queryKey: posOperationsKeys.customers(),
    queryFn: () => getCustomersAction(),
  })
}

export function useOpenPOSShift() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: openPOSShiftAction,
    onSuccess: (_result, variables: any) => {
      queryClient.invalidateQueries({ queryKey: posOperationsKeys.terminals(variables.locationId) })
      queryClient.invalidateQueries({ queryKey: posOperationsKeys.activeSession(variables.terminalId) })
    },
  })
}

export function useClosePOSShift() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: closePOSShiftAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: posOperationsKeys.all })
    },
  })
}

export function useAddPOSCartLine() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: addPOSCartLineAction,
    onSuccess: (_result, variables: any) => {
      queryClient.invalidateQueries({
        queryKey: posOperationsKeys.cart(variables.locationId, variables.terminalId, variables.sessionId),
      })
      queryClient.invalidateQueries({
        queryKey: posOperationsKeys.catalog(variables.locationId),
      })
    },
  })
}

export function useUpdatePOSCartLine() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updatePOSCartLineAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: posOperationsKeys.all })
    },
  })
}

export function useRemovePOSCartLine() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: removePOSCartLineAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: posOperationsKeys.all })
    },
  })
}

export function useCommitPOSSale() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: commitPOSSaleAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: posOperationsKeys.all })
    },
  })
}

export function useRefundPOSSale() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: refundPOSSaleAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: posOperationsKeys.all })
    },
  })
}

export function useVoidPOSSale() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: voidPOSSaleAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: posOperationsKeys.all })
    },
  })
}
