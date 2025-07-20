"use client";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export const HomeView = () => {
  const { data: session } = authClient.useSession();
  const router = useRouter();

  if (!session) {
    return <div>Loading...</div>;
  }

  return (
    <div className="">
      Logged as: {session?.user.name}
      <br />
      <Button
        onClick={() => {
          authClient.signOut({
            fetchOptions: {
              onSuccess: () => {
                router.push("/sign-in");
              },
            },
          });
        }}
      >
        Logout
      </Button>
    </div>
  );
};
