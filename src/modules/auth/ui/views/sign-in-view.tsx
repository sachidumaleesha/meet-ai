"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { authClient } from "@/lib/auth-client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Alert, AlertTitle } from "@/components/ui/alert";

import {
  signInSchema,
  type SignInFormData,
} from "@/modules/auth/lib/validations/auth";

import { FaGithub, FaGoogle } from "react-icons/fa";
import { Loader, OctagonAlertIcon } from "lucide-react";

export const SignInView = () => {
  const router = useRouter();
  const [error, setError] = useState<String | null>(null);
  const [isEmailPending, setIsEmailPending] = useState(false);
  const [isGooglePending, setIsGooglePending] = useState(false);
  const [isGithubPending, setIsGithubPending] = useState(false);

  const form = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = (data: SignInFormData) => {
    setIsEmailPending(true);
    setError(null);

    authClient.signIn.email(
      {
        email: data.email,
        password: data.password,
        callbackURL: "/",
      },
      {
        onSuccess: () => {
          setIsEmailPending(false);
          router.push("/");
        },
        onError: (ctx) => {
          setError(ctx.error.message);
          setIsEmailPending(false);
        },
      }
    );
  };

  const onGoogle = () => {
    setIsGooglePending(true);
    setError(null);

    authClient.signIn.social(
      {
        provider: "google",
        callbackURL: "/",
      },
      {
        onSuccess: () => {
          setIsGooglePending(false);
        },
        onError: (ctx) => {
          setError(ctx.error.message);
          setIsGooglePending(false);
        },
      }
    );
  };

  const onGithub = () => {
    setIsGithubPending(true);
    setError(null);

    authClient.signIn.social(
      {
        provider: "github",
        callbackURL: "/",
      },
      {
        onSuccess: () => {
          setIsGithubPending(false);
        },
        onError: (ctx) => {
          setError(ctx.error.message);
          setIsGithubPending(false);
        },
      }
    );
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Welcome back</CardTitle>
        <CardDescription>Sign in to your account to continue</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                variant="outline"
                type="button"
                className="w-full bg-transparent"
                onClick={() => {
                  onGoogle();
                }}
                disabled={isGooglePending}
              >
                {isGooglePending ? (
                  <span className="flex items-center">
                    <Loader className="mr-2 h-4 w-4 animate-spin" /> Google
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <FaGoogle /> Google
                  </span>
                )}
              </Button>
              <Button
                variant="outline"
                type="button"
                className="w-full bg-transparent"
                onClick={() => {
                  onGithub();
                }}
                disabled={isGithubPending}
              >
                {isGithubPending ? (
                  <span className="flex items-center">
                    <Loader className="mr-2 h-4 w-4 animate-spin" /> Github
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <FaGithub /> Github
                  </span>
                )}
              </Button>
            </div>

            <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
              <span className="relative z-10 bg-background px-2 text-muted-foreground">
                Or continue with email
              </span>
            </div>

            <div className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="m@example.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Password</FormLabel>
                      <Link
                        href="/forgot-password"
                        className="text-sm underline-offset-4 hover:underline"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="password"
                          placeholder="Enter your password"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {!!error && (
                <Alert className="bg-destructive/10 border-none">
                  <OctagonAlertIcon className="h-4 w-4 !text-destructive" />
                  <AlertTitle>{error}</AlertTitle>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isEmailPending}
              >
                {isEmailPending ? (
                  <span className="flex items-center">
                    <Loader className="mr-2 h-4 w-4 animate-spin" /> Signing in
                  </span>
                ) : (
                  "Sign in"
                )}
              </Button>
            </div>

            <div className="text-center text-sm">
              {"Don't have an account? "}
              <Link href="/sign-up" className="underline underline-offset-4">
                Sign up
              </Link>
            </div>
          </form>
        </Form>

        <div className="mt-6 text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 [&_a]:hover:text-primary">
          By signing in, you agree to our{" "}
          <Link href="/terms">Terms of Service</Link> and{" "}
          <Link href="/privacy">Privacy Policy</Link>.
        </div>
      </CardContent>
    </Card>
  );
};
