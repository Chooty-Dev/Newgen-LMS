"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { BentoCard } from "./BentoCard";
import { FriendlySkeletons } from "./FriendlySkeletons";
import { NewsReaderSheet, StudentAnnouncement } from "./NewsReaderSheet";
import { Button } from "@/components/ui/button";
import {
  Megaphone,
  Search,
  Calendar,
  ArrowRight,
  Pin,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function StudentAnnouncementsView() {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [filterAudience, setFilterAudience] = React.useState<"all" | "classes">("all");
  const [selectedNews, setSelectedNews] = React.useState<StudentAnnouncement | null>(null);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [readIds, setReadIds] = React.useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const stored = localStorage.getItem("lms_read_news");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const markAsRead = (id: string) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      try {
        localStorage.setItem("lms_read_news", JSON.stringify(Array.from(next)));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const { data, isLoading } = useQuery<{ data: StudentAnnouncement[] }>({
    queryKey: ["student-announcements"],
    queryFn: async () => {
      const res = await fetch("/api/v1/announcements");
      if (!res.ok) throw new Error("Failed to load announcements");
      return res.json();
    },
  });

  const newsList = data?.data || [];

  const filteredNews = newsList.filter((item) => {
    if (filterAudience === "classes" && item.audience !== "classes") {
      return false;
    }
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.body.toLowerCase().includes(q) ||
      (item.authorName && item.authorName.toLowerCase().includes(q))
    );
  });

  const pinnedNews = filteredNews.find((n) => n.pinned) || (filterAudience === "all" ? filteredNews[0] : null);
  const regularNews = pinnedNews
    ? filteredNews.filter((n) => n.id !== pinnedNews.id)
    : filteredNews;

  const handleOpenNews = (news: StudentAnnouncement) => {
    markAsRead(news.id);
    setSelectedNews(news);
    setSheetOpen(true);
  };

  if (isLoading) {
    return <FriendlySkeletons />;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-foreground">
            School News
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground font-medium">
            Stay updated with announcements, class schedules, and center notices.
          </p>
        </div>

        {/* Search Pill */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search news..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-12 pl-11 pr-4 rounded-full bg-card border border-border text-foreground placeholder:text-muted-foreground text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>

      {/* 2. Filter Pills: All / My Classes */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setFilterAudience("all")}
          className={cn(
            "h-11 px-5 rounded-full text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            filterAudience === "all"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-muted/70 hover:bg-muted text-foreground"
          )}
        >
          All News
        </button>
        <button
          type="button"
          onClick={() => setFilterAudience("classes")}
          className={cn(
            "h-11 px-5 rounded-full text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            filterAudience === "classes"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-muted/70 hover:bg-muted text-foreground"
          )}
        >
          My Classes Only
        </button>
      </div>

      {filteredNews.length === 0 ? (
        <Card className="rounded-[2.5rem] p-12 text-center space-y-4">
          <div className="size-16 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
            <Megaphone className="size-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl font-bold text-foreground">No news found</h3>
            <p className="text-base text-muted-foreground max-w-md mx-auto">
              There are no announcements matching your current filters.
            </p>
          </div>
          {filterAudience !== "all" && (
            <Button
              variant="outline"
              onClick={() => setFilterAudience("all")}
              className="rounded-full h-11 px-6 text-sm font-semibold"
            >
              Show All News
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Pinned Hero Banner */}
          {pinnedNews && (
            <BentoCard
              variant="hero"
              className="cursor-pointer group hover:border-primary/40 relative"
              onClick={() => handleOpenNews(pinnedNews)}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-primary">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10">
                      <Pin className="size-3.5" />
                      Important Notice
                    </span>
                    {!readIds.has(pinnedNews.id) && (
                      <span className="size-2.5 rounded-full bg-primary animate-pulse" title="Unread" />
                    )}
                  </div>
                  <span className="text-muted-foreground">
                    {pinnedNews.date || pinnedNews.createdAt?.slice(0, 10) || "Recent"}
                  </span>
                </div>

                <div className="space-y-2">
                  <h2 className="text-2xl md:text-3xl font-bold text-foreground group-hover:text-primary transition-colors">
                    {pinnedNews.title}
                  </h2>
                  <p className="text-base md:text-lg text-muted-foreground line-clamp-3 leading-relaxed">
                    {pinnedNews.body}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-border/80">
                  <div className="flex items-center gap-2 text-sm text-foreground font-medium">
                    <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                      {pinnedNews.authorName?.[0] || "T"}
                    </div>
                    <span>{pinnedNews.authorName || "Teacher / Center Staff"}</span>
                  </div>

                  <span className="text-sm font-semibold text-primary flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    Read Full News <ArrowRight className="size-4" />
                  </span>
                </div>
              </div>
            </BentoCard>
          )}

          {/* Regular News List */}
          {regularNews.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-foreground px-1">
                More Notices
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {regularNews.map((news) => {
                  const isUnread = !readIds.has(news.id);

                  return (
                    <div
                      key={news.id}
                      onClick={() => handleOpenNews(news)}
                      className="group p-6 rounded-[2rem] bg-card border border-border shadow-sm hover:shadow-md hover:border-primary/40 cursor-pointer transition-all flex flex-col justify-between space-y-4 relative"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                          <div className="flex items-center gap-2">
                            {isUnread && (
                              <span className="size-2 rounded-full bg-primary shrink-0" title="Unread" />
                            )}
                            <Calendar className="size-3.5" />
                            <span>{news.date || news.createdAt?.slice(0, 10) || "Recent"}</span>
                          </div>
                          {news.audience === "classes" && (
                            <span className="text-[11px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                              Class
                            </span>
                          )}
                        </div>

                        <h4 className="text-lg md:text-xl font-bold text-foreground truncate group-hover:text-primary transition-colors">
                          {news.title}
                        </h4>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {news.body}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-border/80">
                        <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                          {news.authorName || "Staff"}
                        </span>
                        <span className="text-xs font-semibold text-primary flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                          Read <ChevronRight className="size-3.5" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reader Sheet */}
      <NewsReaderSheet
        announcement={selectedNews}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  );
}
