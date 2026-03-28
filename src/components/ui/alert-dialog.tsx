"use client"

/**
 * AlertDialog — built on top of the existing Dialog primitives (@base-ui/react).
 * Provides a Radix-compatible API surface so feature components can import
 * named exports without coupling to the underlying implementation.
 */

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// ── Root ──────────────────────────────────────────────────────────────────────

type AlertDialogProps = React.ComponentProps<typeof Dialog>

function AlertDialog({ ...props }: AlertDialogProps) {
  return <Dialog {...props} />
}

// ── Trigger ───────────────────────────────────────────────────────────────────
// @base-ui/react uses `render` prop instead of `asChild`.
// When `render` is provided, the trigger will render that element.
// When `children` is a React element and `asChild` is true, we use render= too.

type AlertDialogTriggerProps = React.ComponentProps<typeof DialogTrigger> & {
  asChild?: boolean
}

function AlertDialogTrigger({ asChild, children, ...props }: AlertDialogTriggerProps) {
  if (asChild && React.isValidElement(children)) {
    return (
      <DialogTrigger
        data-slot="alert-dialog-trigger"
        render={children}
        {...props}
      />
    )
  }
  return (
    <DialogTrigger data-slot="alert-dialog-trigger" {...props}>
      {children}
    </DialogTrigger>
  )
}

// ── Content ───────────────────────────────────────────────────────────────────

function AlertDialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogContent>) {
  return (
    <DialogContent
      showCloseButton={false}
      className={cn("sm:max-w-md", className)}
      {...props}
    >
      {children}
    </DialogContent>
  )
}

// ── Header ────────────────────────────────────────────────────────────────────

function AlertDialogHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return <DialogHeader className={cn("text-left", className)} {...props} />
}

// ── Footer ────────────────────────────────────────────────────────────────────

function AlertDialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <DialogFooter
      className={cn("sm:justify-end", className)}
      {...props}
    />
  )
}

// ── Title ─────────────────────────────────────────────────────────────────────

function AlertDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogTitle>) {
  return <DialogTitle className={cn("text-base font-semibold", className)} {...props} />
}

// ── Description ───────────────────────────────────────────────────────────────

function AlertDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogDescription>) {
  return (
    <DialogDescription
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

// ── Cancel (closes the dialog) ────────────────────────────────────────────────

function AlertDialogCancel({
  children,
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <DialogClose
      render={
        <Button variant="outline" className={className} {...props} />
      }
    >
      {children}
    </DialogClose>
  )
}

// ── Action (destructive / primary action, does NOT auto-close) ────────────────

function AlertDialogAction({
  children,
  className,
  onClick,
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <DialogClose
      render={
        <Button className={className} onClick={onClick} {...props} />
      }
    >
      {children}
    </DialogClose>
  )
}

export {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
}
