"use client"

import { useState, useCallback } from "react"

type ToastVariant = "default" | "destructive"

export type ToastData = {
  id: string
  title: string
  description?: string
  variant?: ToastVariant
  duration?: number
}

let toastListeners: Array<(toasts: ToastData[]) => void> = []
let toastState: ToastData[] = []

function dispatch(toasts: ToastData[]) {
  toastState = toasts
  toastListeners.forEach((l) => l(toasts))
}

export function toast(data: Omit<ToastData, "id">) {
  const id = Math.random().toString(36).slice(2)
  const item: ToastData = { id, duration: 4000, ...data }
  dispatch([...toastState, item])
  setTimeout(() => {
    dispatch(toastState.filter((t) => t.id !== id))
  }, item.duration)
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastData[]>(toastState)

  const subscribe = useCallback(() => {
    const listener = (next: ToastData[]) => setToasts([...next])
    toastListeners.push(listener)
    return () => {
      toastListeners = toastListeners.filter((l) => l !== listener)
    }
  }, [])

  useState(() => {
    const unsub = subscribe()
    return unsub
  })

  return { toasts }
}
