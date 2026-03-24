import Link from "next/link";
import { Metadata } from "next";
import {
  createSupabaseClient,
  isSupabaseConfigured,
} from "@/lib/supabaseClient";
import { timeAgo } from "@/lib/timeAgo";

export const metadata: Metadata = {
  title: "All Kettles — Tea",
  description: "Browse all kettles and find where the tea is hottest.",
};

export const dynamic = "force-dynamic";

type KettleWithHeat = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  total_heat: number;
  post_count: number;
  last_activity: string | null;
};

// Fallback data when Supabase is not configured
const fallbackKettles: KettleWithHeat[] = [
  {
    id: "1",
    name: "Campus Chaos",
    slug: "campus-chaos",
    description: "Dorm drama, roommate rants, and lecture legends.",
    total_heat: 92,
    post_count: 15,
    last_activity: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
  {
    id: "2",
    name: "Situationships",
    slug: "situationships",
    description: "Red flags, green texts, and delulu lore.",
    total_heat: 178,
    post_count: 23,
    last_activity: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
  {
    id: "3",
    name: "Workplace Whispers",
    slug: "workplace-whispers",
    description: "Boss gossip, Slack screenshots, and HR horror stories.",
    total_heat: 64,
    post_count: 8,
    last_activity: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
  },
  {
    id: "4",
    name: "Main Character Energy",
    slug: "main-character",
    description: "When you ARE the plot twist.",
    total_heat: 45,
    post_count: 12,
    last_activity: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
  },
  {
    id: "5",
    name: "Tech Tea",
    slug: "tech-tea",
    description: "Startup drama, code drama, and interview horror stories.",
    total_heat: 112,
    post_count: 19,
    last_activity: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
];

async function getKettles(): Promise<{
  kettles: KettleWithHeat[];
  isLive: boolean;
}> {
  if (!isSupabaseConfigured()) {
    return {
      kettles: fallbackKettles,
      isLive: false,
    };
  }

  try {
    const supabase = createSupabaseClient();

    const { data: kettlesData } = await supabase
      .from("kettles_with_heat")
      .select("*")
      .order("total_heat", { ascending: false });

    const kettles: KettleWithHeat[] = (kettlesData ?? []).map((k) => ({
      id: k.id,
      name: k.name,
      slug: k.slug,
      description: k.description,
      total_heat: k.total_heat ?? 0,
      post_count: k.post_count ?? 0,
      last_activity: k.last_activity,
    }));

    return {
      kettles: kettles.length > 0 ? kettles : fallbackKettles,
      isLive: kettles.length > 0,
    };
  } catch (error) {
    console.error("Failed to fetch kettles:", error);
    return {
      kettles: fallbackKettles,
      isLive: false,
    };
  }
}

export default async function KettlesPage() {
  const { kettles, isLive } = await getKettles();

  // Sort kettles: boiling first, then by heat
  const sortedKettles = [...kettles].sort((a, b) => {
    const aBoiling = a.total_heat >= 100;
    const bBoiling = b.total_heat >= 100;
    if (aBoiling && !bBoiling) return -1;
    if (!aBoiling && bBoiling) return 1;
    return b.total_heat - a.total_heat;
  });

  const boilingCount = kettles.filter((k) => k.total_heat >= 100).length;

  return (
    <div className="w-full space-y-10">
      {/* Header */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between px-2">
        <div className="space-y-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[13px] font-semibold text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <span className="text-lg leading-none">←</span> Back Home
          </Link>
          <div className="space-y-1.5">
            <h1 className="text-3xl font-bold tracking-tight text-zinc-50 sm:text-4xl">
              Explore Kettles
            </h1>
            <p className="text-[15px] font-medium text-zinc-400">
              {kettles.length} active spaces • {boilingCount} boiling right now
            </p>
          </div>
        </div>

        <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[12px] font-semibold shadow-sm ${isLive
            ? 'border-neon-green/30 bg-neon-green-dim text-neon-green'
            : 'border-zinc-700 bg-zinc-800/50 text-zinc-400'
          }`}>
          <span className={`h-2.5 w-2.5 rounded-full ${isLive ? 'bg-neon-green animate-soft-pulse' : 'bg-zinc-500'}`} />
          {isLive ? 'Live data' : 'Demo mode'}
        </div>
      </div>

      {/* Stats bar */}
      <div className="glass-strong flex flex-col sm:flex-row items-center justify-between gap-6 rounded-[24px] border border-white/5 p-6 shadow-premium">
        <div className="flex w-full sm:w-auto items-center justify-around sm:justify-start gap-8 sm:gap-10 sm:px-4">
          <div className="text-center sm:text-left">
            <p className="text-3xl font-extrabold text-zinc-100">{kettles.length}</p>
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-500 mt-1">Kettles</p>
          </div>
          <div className="h-12 w-px bg-white/10 hidden sm:block" />
          <div className="text-center sm:text-left">
            <p className="text-3xl font-extrabold text-hot-pink">{boilingCount}</p>
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-500 mt-1">Boiling</p>
          </div>
          <div className="h-12 w-px bg-white/10 hidden sm:block" />
          <div className="text-center sm:text-left">
            <p className="text-3xl font-extrabold text-neon-green">
              {kettles.reduce((sum, k) => sum + k.post_count, 0)}
            </p>
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-500 mt-1">Total Posts</p>
          </div>
        </div>
        <p className="text-[12px] font-semibold text-zinc-400 flex items-center gap-2 bg-charcoal/40 px-4 py-2 rounded-full border border-white/5">
          <span className="text-base">🔥</span> Kettles boil at 100+ heat
        </p>
      </div>

      {/* Kettles Grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {sortedKettles.map((kettle) => {
          const isBoiling = kettle.total_heat >= 100;
          return (
            <Link
              key={kettle.id}
              href={`/k/${kettle.slug}`}
              className={`glass-strong group relative flex flex-col overflow-hidden rounded-[20px] p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-premium ${isBoiling
                  ? 'border border-hot-pink/10 hover:border-hot-pink/30'
                  : 'border border-white/5 hover:border-white/20'
                }`}
            >
              {/* Card Header & Content */}
              <div className="mb-6 flex-1 pr-6 relative">
                <h2 className={`text-xl font-bold tracking-tight mb-2 transition-colors ${isBoiling
                    ? 'text-zinc-50 group-hover:text-hot-pink'
                    : 'text-zinc-50 group-hover:text-neon-green'
                  }`}>
                  {kettle.name}
                </h2>
                <p className="text-[13px] font-medium leading-relaxed text-zinc-400 line-clamp-3">
                  {kettle.description}
                </p>

                {/* Boiling badge inline or absolute depending on design - let's make it absolute for cleaner layout */}
                {isBoiling && (
                  <div className="absolute right-0 top-0 pt-0.5">
                    <span className="rounded-md bg-hot-pink/10 border border-hot-pink/20 p-1.5 flex items-center justify-center shadow-sm">
                      <span className="text-sm">🔥</span>
                    </span>
                  </div>
                )}
              </div>

              {/* Card Footer: Heat & Stats */}
              <div className="mt-auto space-y-4">
                {/* Heat bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold tracking-wide">
                    <span className={isBoiling ? 'text-hot-pink' : 'text-neon-green'}>
                      {kettle.total_heat} HEAT
                    </span>
                    <span className={isBoiling ? 'text-hot-pink/70' : 'text-zinc-500'}>
                      {Math.min(kettle.total_heat, 100)}%
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800/80 shadow-inner">
                    <div
                      className={`h-full transition-all duration-700 ease-out ${isBoiling
                          ? 'bg-gradient-to-r from-hot-pink to-indigo-500'
                          : 'bg-gradient-to-r from-neon-green to-teal-500'
                        }`}
                      style={{ width: `${Math.min(kettle.total_heat, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Meta Stats */}
                <div className="flex items-center justify-between border-t border-white/5 pt-4">
                  <div className="flex items-center gap-2 text-[12px] font-semibold text-zinc-500 bg-charcoal-light/30 px-2.5 py-1 rounded-md">
                    <span>📝</span>
                    <span>{kettle.post_count} posts</span>
                  </div>
                  {kettle.last_activity && (
                    <span className="text-[11px] font-medium text-zinc-500 truncate max-w-[120px]">
                      Active {timeAgo(kettle.last_activity)}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Empty state */}
      {kettles.length === 0 && (
        <div className="glass-strong rounded-[24px] border border-dashed border-white/10 p-16 text-center max-w-2xl mx-auto mt-10 shadow-premium">
          <div className="text-4xl mb-4">🫖</div>
          <h3 className="text-xl font-bold text-zinc-100 mb-2">No Kettles Found</h3>
          <p className="text-[14px] font-medium text-zinc-400 mb-8 max-w-sm mx-auto">
            It's quiet in here. Either there's a problem with the connection, or no one has started brewing yet.
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-zinc-50 px-6 py-3 text-[14px] font-bold text-zinc-900 transition-all duration-300 hover:bg-white hover:shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:-translate-y-0.5"
          >
            <span className="text-lg leading-none transition-transform duration-300 hover:-translate-x-1">←</span>
            Back to Home
          </Link>
        </div>
      )}

      {!isLive && (
        <p className="text-center text-[12px] font-medium text-zinc-500 py-4">
          This is demo data. Configure Supabase to see real kettles boiling.
        </p>
      )}
    </div>
  );
}
