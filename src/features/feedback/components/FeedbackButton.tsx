"use client";

import { useState, useRef, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MessageSquarePlus, Loader2, ImageIcon, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

import {
  CreateTicketSchema,
  type CreateTicketInput,
} from "../schemas/feedback.schema";
import { useCreateTicket } from "../hooks/use-feedback";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(
    null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createTicket = useCreateTicket();

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm<CreateTicketInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(CreateTicketSchema) as any,
    defaultValues: {
      type: "bug",
      priority: "medium",
      title: "",
      description: "",
    },
  });

  const titleValue = watch("title");
  const descValue = watch("description");

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.size > MAX_FILE_SIZE) {
        toast.error("La imagen no puede superar 5 MB");
        e.target.value = "";
        return;
      }

      setScreenshotFile(file);
      const url = URL.createObjectURL(file);
      setScreenshotPreview(url);
    },
    []
  );

  const clearScreenshot = useCallback(() => {
    setScreenshotFile(null);
    if (screenshotPreview) URL.revokeObjectURL(screenshotPreview);
    setScreenshotPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [screenshotPreview]);

  const resetAll = useCallback(() => {
    reset();
    clearScreenshot();
  }, [reset, clearScreenshot]);

  const onSubmit = async (data: CreateTicketInput) => {
    try {
      await createTicket.mutateAsync({
        input: data,
        screenshot: screenshotFile ?? undefined,
      });
      toast.success("Ticket enviado");
      resetAll();
      setOpen(false);

      // Non-blocking notification
      fetch("/api/notify-ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: data.title, type: data.type }),
      }).catch(() => {
        // Silently ignore notification errors
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error al enviar ticket";
      toast.error(message);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#F97316] text-white shadow-lg transition-transform hover:scale-105 hover:shadow-xl active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-300"
        aria-label="Enviar feedback"
      >
        <MessageSquarePlus className="size-6" />
      </button>

      {/* Dialog / Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enviar feedback</DialogTitle>
            <DialogDescription>
              Reporta un problema o sugiere una mejora para RestoOS.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={handleSubmit(onSubmit as any)}
            className="flex flex-col gap-4"
          >
            {/* Type */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="feedback-type">Tipo</Label>
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger className="w-full" id="feedback-type">
                      <SelectValue placeholder="Selecciona tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bug">Bug</SelectItem>
                      <SelectItem value="design">Diseno</SelectItem>
                      <SelectItem value="feature">Funcionalidad</SelectItem>
                      <SelectItem value="other">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.type && (
                <p className="text-xs text-destructive">
                  {errors.type.message}
                </p>
              )}
            </div>

            {/* Priority */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="feedback-priority">Prioridad</Label>
              <Controller
                control={control}
                name="priority"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger className="w-full" id="feedback-priority">
                      <SelectValue placeholder="Selecciona prioridad" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baja</SelectItem>
                      <SelectItem value="medium">Media</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* Title */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="feedback-title">Titulo</Label>
                <span className="text-xs text-muted-foreground">
                  {titleValue?.length ?? 0}/80
                </span>
              </div>
              <Input
                id="feedback-title"
                placeholder="Describe brevemente el problema"
                maxLength={80}
                {...register("title")}
              />
              {errors.title && (
                <p className="text-xs text-destructive">
                  {errors.title.message}
                </p>
              )}
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="feedback-description">Descripcion</Label>
                <span className="text-xs text-muted-foreground">
                  {descValue?.length ?? 0}/500
                </span>
              </div>
              <textarea
                id="feedback-description"
                placeholder="Explica con detalle lo que observaste o necesitas..."
                maxLength={500}
                rows={4}
                className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 dark:bg-input/30"
                {...register("description")}
              />
              {errors.description && (
                <p className="text-xs text-destructive">
                  {errors.description.message}
                </p>
              )}
            </div>

            {/* Screenshot */}
            <div className="flex flex-col gap-1.5">
              <Label>Captura de pantalla (opcional)</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImageIcon className="size-4" data-icon="inline-start" />
                  Adjuntar imagen
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                {screenshotFile && (
                  <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                    {screenshotFile.name}
                  </span>
                )}
              </div>
              {screenshotPreview && (
                <div className="relative mt-1 w-fit">
                  <img
                    src={screenshotPreview}
                    alt="Vista previa"
                    className="h-20 rounded-md border object-cover"
                  />
                  <button
                    type="button"
                    onClick={clearScreenshot}
                    className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white text-xs"
                    aria-label="Quitar imagen"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              )}
            </div>

            {/* Footer */}
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>
                Cancelar
              </DialogClose>
              <Button type="submit" disabled={createTicket.isPending}>
                {createTicket.isPending && (
                  <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
                )}
                Enviar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
