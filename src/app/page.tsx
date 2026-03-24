import Link from "next/link";
import {
  createSupabaseClient,
  isSupabaseConfigured,
} from "@/lib/supabaseClient";
import { timeAgo } from "@/lib/timeAgo";

type KettleWithHeat = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  total_heat: number;
  post_count: number;
};

type TrendingPost = {
  id: string;
  content: string;
  heat_score: number;
  anonymous_identity: string;
  created_at: string;
  kettle_name: string;
  kettle_slug: string;
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
  },
  {
    id: "2",
    name: "Situationships",
    slug: "situationships",
    description: "Red flags, green texts, and delulu lore.",
    total_heat: 78,
    post_count: 23,
  },
  {
    id: "3",
    name: "Workplace Whispers",
    slug: "workplace-whispers",
    description: "Boss gossip, Slack screenshots, and HR horror stories.",
    total_heat: 64,
    post_count: 8,
  },
];

const fallbackPosts: TrendingPost[] = [
  {
    id: "1",
    kettle_name: "Campus Chaos",
    kettle_slug: "campus-chaos",
    anonymous_identity: "Spicy Matcha",
    content: "My professor just quoted a TikTok trend unironically",
    heat_score: 128,
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: "2",
    kettle_name: "Situationships",
    kettle_slug: "situationships",
    anonymous_identity: "Salty Earl Grey",
    content: "He said he's \"not ready to date\" then soft-launched someone else",
    heat_score: 203,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: "3",
    kettle_name: "Workplace Whispers",
    kettle_slug: "workplace-whispers",
    anonymous_identity: "Iced Oolong",
    content: "Manager schedules a 4:59pm Friday \"quick sync\" every week",
    heat_score: 89,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
];

async function getHomeData(): Promise<{
  kettles: KettleWithHeat[];
  trendingPosts: TrendingPost[];
  isLive: boolean;
}> {
  if (!isSupabaseConfigured()) {
    return {
      kettles: fallbackKettles,
      trendingPosts: fallbackPosts,
      isLive: false,
    };
  }

  try {
    const supabase = createSupabaseClient();

    // Fetch kettles with aggregated heat
    const { data: kettlesData } = await supabase
      .from("kettles_with_heat")
      .select("*")
      .order("total_heat", { ascending: false })
      .limit(6);

    // Fetch trending posts
    const { data: postsData } = await supabase
      .from("trending_posts")
      .select("*")
      .limit(5);

    const kettles: KettleWithHeat[] = (kettlesData ?? []).map((k) => ({
      id: k.id,
      name: k.name,
      slug: k.slug,
      description: k.description,
      total_heat: k.total_heat ?? 0,
      post_count: k.post_count ?? 0,
    }));

    const trendingPosts: TrendingPost[] = (postsData ?? []).map((p) => ({
      id: p.id,
      content: p.content,
      heat_score: p.heat_score ?? 0,
      anonymous_identity: p.anonymous_identity ?? "Anonymous Tea",
      created_at: p.created_at,
      kettle_name: p.kettle_name,
      kettle_slug: p.kettle_slug,
    }));

    return {
      kettles: kettles.length > 0 ? kettles : fallbackKettles,
      trendingPosts: trendingPosts.length > 0 ? trendingPosts : fallbackPosts,
      isLive: kettles.length > 0 || trendingPosts.length > 0,
    };
  } catch (error) {
    console.error("Failed to fetch home data:", error);
    return {
      kettles: fallbackKettles,
      trendingPosts: fallbackPosts,
      isLive: false,
    };
  }
}

export const dynamic = "force-dynamic";

export default async function Home() {
  const { kettles, trendingPosts, isLive } = await getHomeData();

  return (
    <div className="flex w-full flex-col gap-12 lg:flex-row lg:gap-16">
      <section className="flex-1 space-y-8 lg:py-6">
        <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[12px] font-semibold shadow-premium ${isLive
          ? 'border-neon-green/30 bg-neon-green-dim text-neon-green'
          : 'border-zinc-700 bg-zinc-800/50 text-zinc-400'
          }`}>
          <span className={`h-2 w-2 rounded-full ${isLive ? 'bg-neon-green animate-soft-pulse' : 'bg-zinc-500'}`} />
          {isLive ? 'Live tea is brewing' : 'Demo mode — Configure Supabase'}
        </div>

        <div className="space-y-6 max-w-2xl">
          <h1 className="text-balance text-[2.75rem] font-extrabold tracking-tight sm:text-[3.5rem] lg:text-[4rem] text-zinc-50 leading-[1.05]">
            Spill the{" "}
            <span className="bg-gradient-to-r from-neon-green to-teal-500 bg-clip-text text-transparent italic pe-2">
              tea
            </span>
            <br />
            stay anonymous.
          </h1>
          <p className="max-w-xl text-[16px] leading-[1.7] font-medium text-zinc-300">
            Tea is a beautifully chaotic anonymous social app. Drop your hottest takes
            in themed{" "}
            <span className="font-semibold text-zinc-100">Kettles</span>, get a
            random identity like{" "}
            <span className="font-semibold text-neon-green">Spicy Matcha</span>, and
            watch the{" "}
            <span className="font-semibold text-hot-pink">Heat</span> rise as posts
            start to boil.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-4">
          <Link
            href="/kettles"
            className="group relative inline-flex items-center justify-center gap-2.5 rounded-full bg-zinc-50 px-7 py-3.5 text-[15px] font-bold text-zinc-900 transition-all duration-300 hover:bg-white hover:shadow-[0_0_30px_rgba(255,255,255,0.15)] hover:-translate-y-0.5"
          >
            Start brewing
            <span className="text-lg leading-none transition-transform duration-300 group-hover:translate-x-1">
              →
            </span>
          </Link>
          <Link
            href="/kettles"
            className="inline-flex items-center justify-center gap-2 rounded-full glass border border-white/10 px-6 py-3.5 text-[14px] font-semibold text-zinc-300 hover:border-white/20 hover:text-white transition-all duration-300"
          >
            Explore kettles
          </Link>
        </div>

        <div className="mt-8 flex flex-wrap gap-2.5 pt-8 border-t border-white/5">
          <span className="rounded-full border border-white/10 bg-charcoal-light/50 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-widest text-zinc-400">
            Zero profiles
          </span>
          <span className="rounded-full border border-white/10 bg-charcoal-light/50 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-widest text-zinc-400">
            Thread-based IDs
          </span>
          <span className="rounded-full border border-white/10 bg-charcoal-light/50 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-widest text-zinc-400">
            Heat trending
          </span>
        </div>
      </section>

      <section className="flex-1 space-y-8 lg:max-w-[540px]">
        {/* Kettles Grid */}
        <div>
          <div className="flex items-center justify-between mb-5 px-1">
            <h2 className="text-[12px] font-bold uppercase tracking-[0.2em] text-zinc-400">
              🔥 Hot Kettles
            </h2>
            <Link
              href="/kettles"
              className="text-[12px] font-semibold text-neon-green hover:text-sky-400 transition-colors flex items-center gap-1"
            >
              View all <span>→</span>
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {kettles.slice(0, 4).map((kettle) => {
              const isBoiling = kettle.total_heat >= 100;
              return (
                <Link
                  key={kettle.id}
                  href={`/k/${kettle.slug}`}
                  className="glass-strong group relative overflow-hidden rounded-[20px] p-5 transition-all duration-300 hover:border-white/20 hover:-translate-y-1 hover:shadow-premium"
                >
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <h3 className="text-[15px] font-bold text-zinc-50 group-hover:text-neon-green transition-colors leading-tight">
                      {kettle.name}
                    </h3>
                    {isBoiling && (
                      <span className="rounded-full bg-hot-pink-dim border border-hot-pink/20 px-2 py-0.5 text-[10px] font-bold text-hot-pink whitespace-nowrap">
                        🔥 Boiling
                      </span>
                    )}
                  </div>
                  <p className="mb-5 text-[13px] font-medium text-zinc-400 line-clamp-2 leading-relaxed">
                    {kettle.description}
                  </p>
                  <div className="mt-auto flex items-center justify-between text-[11px] font-semibold text-zinc-500">
                    <div className="flex items-center gap-3">
                      <div className="relative h-1.5 w-16 overflow-hidden rounded-full bg-zinc-800/80 shadow-inner">
                        <div
                          className={`h-full ${isBoiling ? 'bg-gradient-to-r from-hot-pink to-indigo-500' : 'bg-gradient-to-r from-neon-green to-teal-500'}`}
                          style={{ width: `${Math.min(kettle.total_heat, 100)}%` }}
                        />
                      </div>
                      <span className={`tabular-nums ${isBoiling ? 'text-hot-pink' : 'text-neon-green'}`}>
                        {kettle.total_heat}
                      </span>
                    </div>
                    <span className="text-[11px] text-zinc-500 bg-zinc-800/40 px-2 py-0.5 rounded-md">
                      {kettle.post_count} posts
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Live Feed Component */}
        <div className="glass-strong rounded-[24px] p-6 shadow-premium relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-hot-pink/5 rounded-full blur-[80px] -z-10 translate-x-1/2 -translate-y-1/2"></div>

          <div className="flex items-center justify-between mb-5">
            <span className="text-[12px] font-bold uppercase tracking-[0.2em] text-hot-pink flex items-center gap-2">
              <span className="text-base">☕</span> Trending Tea
            </span>
            <span className="text-[11px] font-semibold text-zinc-400">
              Sorted by heat
            </span>
          </div>

          <div className="space-y-3">
            {trendingPosts.map((post) => {
              const isBoiling = post.heat_score >= 100;
              return (
                <Link
                  key={post.id}
                  href={`/k/${post.kettle_slug}`}
                  className="group flex flex-col gap-3 rounded-2xl bg-charcoal/40 border border-white/5 p-4 hover:bg-charcoal/60 hover:border-white/10 transition-all duration-300"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="rounded-md bg-zinc-800/80 px-2 py-1 text-[10px] font-bold text-zinc-300">
                      k/{post.kettle_slug}
                    </span>
                    <span className="text-[11px] font-bold text-zinc-400">•</span>
                    <span className="text-[11.5px] font-bold text-neon-green group-hover:text-sky-400 transition-colors">
                      {post.anonymous_identity}
                    </span>
                    <span className="ml-auto text-[10px] font-medium text-zinc-500 whitespace-nowrap">
                      {timeAgo(post.created_at)}
                    </span>
                  </div>

                  <p className="text-[14px] font-medium text-zinc-100 line-clamp-2 leading-relaxed">
                    {post.content}
                  </p>

                  <div className="mt-1 flex items-center">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold flex items-center gap-1 ${isBoiling
                      ? 'bg-hot-pink-dim text-hot-pink'
                      : 'bg-neon-green-dim text-neon-green'
                      }`}>
                      {isBoiling ? '🔥' : '📈'} {post.heat_score} Heat
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {!isLive && (
          <p className="text-[12px] font-medium text-zinc-500 text-center px-4">
            This is a preview with sample data. Add your Supabase credentials to spin up the real kettle.
          </p>
        )}
      </section>
    </div>
  );
}
