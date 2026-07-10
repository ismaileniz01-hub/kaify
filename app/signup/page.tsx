import { redirect } from "next/navigation";

type Props = {
  searchParams: Promise<{ next?: string; ref?: string }>;
};

/** Convenience route — same auth UI as /login with signup mode selected. */
export default async function SignupPage({ searchParams }: Props) {
  const params = await searchParams;
  const query = new URLSearchParams({ mode: "signup" });
  if (params.next) query.set("next", params.next);
  if (params.ref) query.set("ref", params.ref);
  redirect(`/login?${query.toString()}`);
}
