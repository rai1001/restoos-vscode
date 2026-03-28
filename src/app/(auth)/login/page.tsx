"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/db/client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";

const LoginSchema = z.object({
  email: z.string().email("Email no válido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});
type LoginInput = z.infer<typeof LoginSchema>;

const SignUpSchema = LoginSchema.extend({
  full_name: z.string().min(1, "El nombre es obligatorio"),
});
type SignUpInput = z.infer<typeof SignUpSchema>;

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const loginForm = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
  });

  const signUpForm = useForm<SignUpInput>({
    resolver: zodResolver(SignUpSchema),
  });

  async function onLogin(data: LoginInput) {
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    router.push("/");
    router.refresh();
  }

  async function onSignUp(data: SignUpInput) {
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: { data: { full_name: data.full_name } },
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Cuenta creada. Revisa tu email para confirmar.");
    setIsSignUp(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">RestoOS</CardTitle>
          <CardDescription>
            {isSignUp ? "Crear cuenta" : "Iniciar sesión"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSignUp ? (
            <form
              onSubmit={signUpForm.handleSubmit(onSignUp)}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="full_name">Nombre completo</Label>
                <Input
                  id="full_name"
                  {...signUpForm.register("full_name")}
                  placeholder="Tu nombre"
                />
                {signUpForm.formState.errors.full_name && (
                  <p className="text-destructive text-sm">
                    {signUpForm.formState.errors.full_name.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...signUpForm.register("email")}
                  placeholder="tu@email.com"
                />
                {signUpForm.formState.errors.email && (
                  <p className="text-destructive text-sm">
                    {signUpForm.formState.errors.email.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  {...signUpForm.register("password")}
                  placeholder="••••••"
                />
                {signUpForm.formState.errors.password && (
                  <p className="text-destructive text-sm">
                    {signUpForm.formState.errors.password.message}
                  </p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={signUpForm.formState.isSubmitting}
              >
                {signUpForm.formState.isSubmitting
                  ? "Creando..."
                  : "Crear cuenta"}
              </Button>
              <p className="text-muted-foreground text-center text-sm">
                ¿Ya tienes cuenta?{" "}
                <button
                  type="button"
                  onClick={() => setIsSignUp(false)}
                  className="text-primary underline"
                >
                  Iniciar sesión
                </button>
              </p>
            </form>
          ) : (
            <form
              onSubmit={loginForm.handleSubmit(onLogin)}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...loginForm.register("email")}
                  placeholder="tu@email.com"
                />
                {loginForm.formState.errors.email && (
                  <p className="text-destructive text-sm">
                    {loginForm.formState.errors.email.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  {...loginForm.register("password")}
                  placeholder="••••••"
                />
                {loginForm.formState.errors.password && (
                  <p className="text-destructive text-sm">
                    {loginForm.formState.errors.password.message}
                  </p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={loginForm.formState.isSubmitting}
              >
                {loginForm.formState.isSubmitting
                  ? "Entrando..."
                  : "Iniciar sesión"}
              </Button>
              <p className="text-muted-foreground text-center text-sm">
                ¿No tienes cuenta?{" "}
                <button
                  type="button"
                  onClick={() => setIsSignUp(true)}
                  className="text-primary underline"
                >
                  Crear cuenta
                </button>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
