import Link from "next/link";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  createSupabaseClient,
  isSupabaseConfigured,
} from "@/lib/supabaseClient";
import { KettleFeed } from "@/components/KettleFeed";

type Kettle = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
};

type Post = {
  id: string;
  content: string;
  image_url: string | null;
  heat_score: number | null;
  anonymous_identity: string | null;
  parent_post_id: string | null;
  created_at: string;
};

type PageProps = {
  params: Promise<{ kettleSlug: string }> | { kettleSlug: string };
};

export const dynamic = "force-dynamic";

function SupabaseSetupMessage() {
  return (
    <div className="glass-strong mx-auto max-w-lg rounded-2xl border border-hot-pink/30 p-6 text-center">
      <p className="mb-2 text-sm font-bold text-zinc-200">
        Supabase not configured
      </p>
      <p className="mb-4 text-xs font-medium text-zinc-400">
        Add <code className="rounded bg-charcoal-light px-1 py-0.5 text-neon-green">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
        <code className="rounded bg-charcoal-light px-1 py-0.5 text-neon-green">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to{" "}
        <code className="rounded bg-charcoal-light px-1 py-0.5 text-zinc-300">.env.local</code>, then restart the dev server.
      </p>
      <Link
        href="/"
        className="inline-block rounded-full bg-neon-green px-4 py-2 text-xs font-bold text-charcoal"
      >
        Back to home
      </Link>
    </div>
  );
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  try {
    if (!isSupabaseConfigured()) {
      return {
        title: "Setup — Tea",
        description: "Configure Supabase to view this kettle.",
      };
    }

    const resolvedParams =
      typeof (params as Promise<{ kettleSlug: string }>).then === "function"
        ? await (params as Promise<{ kettleSlug: string }>)
        : (params as { kettleSlug: string });
    const kettleSlug = resolvedParams.kettleSlug;
    const supabase = createSupabaseClient();

    const { data: kettle } = await supabase
      .from("kettles")
      .select("name, description")
      .eq("slug", kettleSlug)
      .maybeSingle();

    if (!kettle) {
      return {
        title: "Tea Kettle",
        description: "Spill anonymous tea in high-energy kettles.",
      };
    }

    return {
      title: `${kettle.name} — Tea`,
      description:
        kettle.description ??
        "Spill anonymous Gen Z tea in this high-energy kettle.",
    };
  } catch {
    return {
      title: "Tea Kettle",
      description: "Spill anonymous tea in high-energy kettles.",
    };
  }
}

async function fetchKettleData(
  params: PageProps["params"]
): Promise<
  | { ok: true; kettle: Kettle; posts: Post[] }
  | { ok: false; message: string }
> {
  try {
    const resolvedParams =
      typeof (params as Promise<{ kettleSlug: string }>).then === "function"
        ? await (params as Promise<{ kettleSlug: string }>)
        : (params as { kettleSlug: string });
    const kettleSlug = resolvedParams.kettleSlug;
    const supabase = createSupabaseClient();

    const { data: kettle, error: kettleError } = await supabase
      .from("kettles")
      .select("id, name, slug, description")
      .eq("slug", kettleSlug)
      .single<Kettle>();

    if (kettleError || !kettle) {
      notFound();
    }

    const { data: posts } = await supabase
      .from("posts")
      .select("id, content, image_url, heat_score, anonymous_identity, parent_post_id, created_at")
      .eq("kettle_id", kettle.id)
      .eq("is_hidden", false)
      .order("created_at", { ascending: false })
      .returns<Post[]>();

    return { ok: true, kettle, posts: posts ?? [] };
  } catch (err) {
    // Let Next.js notFound() propagate so we get a proper 404
    const digest = err && typeof err === "object" && "digest" in err ? (err as { digest?: string }).digest : "";
    if (String(digest).includes("NEXT_NOT_FOUND")) throw err;
    const message =
      err instanceof Error ? err.message : "Failed to load kettle.";
    return { ok: false, message };
  }
}

function KettleErrorDisplay({ message }: { message: string }) {
  return (
    <div className="glass-strong mx-auto max-w-lg rounded-2xl border border-hot-pink/30 p-6 text-center">
      <h2 className="mb-2 text-sm font-bold text-zinc-100">
        Could not load this kettle
      </h2>
      <p className="mb-4 text-xs font-medium text-zinc-400">{message}</p>
      <Link
        href="/"
        className="inline-block rounded-full bg-neon-green px-4 py-2 text-xs font-bold text-charcoal"
      >
        Back to home
      </Link>
    </div>
  );
}

export default async function KettlePage({ params }: PageProps) {
  if (!isSupabaseConfigured()) {
    return <SupabaseSetupMessage />;
  }

  const result = await fetchKettleData(params);

  if (!result.ok) {
    return <KettleErrorDisplay message={result.message} />;
  }

  return (
    <KettleFeed kettle={result.kettle} posts={result.posts} />
  );
}

