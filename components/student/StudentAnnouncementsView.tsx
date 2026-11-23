"use client";

import * as React from "react";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { FriendlySkeletons } from "./FriendlySkeletons";
import { NewsReaderSheet, StudentAnnouncement } from "./NewsReaderSheet";
import {
  Megaphone,
  Search,
  Calendar,
  ArrowRight,
  Pin,
  ChevronRight,
  Sparkles,
} from "lucide-react";

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
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* 1. Hero Banner */}
      <section className="bg-secondary border border-border rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] relative overflow-hidden min-h-[220px]">
        <div className="space-y-2.5 max-w-lg text-center md:text-left z-10">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-primary tracking-tight leading-tight">
            School News & Notices
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground font-medium">
            Stay updated with timetable changes, center announcements, and teacher notices.
          </p>
        </div>

        <div className="relative w-full h-44 sm:h-52 md:h-full md:absolute md:right-4 md:top-0 md:bottom-0 md:w-56 lg:w-64 flex items-center justify-center md:justify-end shrink-0 z-10">
          <Image
            src="/images/class.webp"
            alt="School News"
            fill
            priority
            className="object-contain w-full h-full drop-shadow-sm"
            sizes="(max-width: 768px) 160px, 192px"
          />
        </div>
      </section>

      {/* 2. Controls & Search */}
      <section className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search announcements..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-11 pl-11 pr-4 rounded-full bg-card border border-border text-foreground placeholder:text-muted-foreground text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFilterAudience("all")}
            className={`h-10 px-5 rounded-full text-xs font-bold transition-all ${filterAudience === "all"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "bg-card border border-border text-muted-foreground hover:bg-secondary"
              }`}
          >
            All Notices
          </button>
          <button
            type="button"
            onClick={() => setFilterAudience("classes")}
            className={`h-10 px-5 rounded-full text-xs font-bold transition-all ${filterAudience === "classes"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "bg-card border border-border text-muted-foreground hover:bg-secondary"
              }`}
          >
            My Classes
          </button>
        </div>
      </section>

      {/* 3. Notices Content */}
      {filteredNews.length === 0 ? (
        <div className="bg-card rounded-3xl p-10 text-center space-y-3 border border-border shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)]">
          <div className="size-14 rounded-full bg-secondary text-primary flex items-center justify-center mx-auto">
            <Megaphone className="size-6" />
          </div>
          <div className="space-y-1">
            <h4 className="text-base font-bold text-foreground">No notices found</h4>
            <p className="text-xs text-muted-foreground">No announcements match your current filters.</p>
          </div>
          {filterAudience !== "all" && (
            <button
              type="button"
              onClick={() => setFilterAudience("all")}
              className="rounded-full h-9 px-5 text-xs font-semibold bg-card border border-border text-foreground hover:bg-secondary"
            >
              Show All Notices
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Pinned / Featured Notice */}
          {pinnedNews && (
            <div
              onClick={() => handleOpenNews(pinnedNews)}
              className="relative overflow-hidden p-6 sm:p-7 rounded-3xl bg-card border border-border shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] hover:shadow-md hover:border-primary/30 cursor-pointer transition-all space-y-3"
            >
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-primary">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary">
                    <Pin className="size-3" />
                    Pinned
                  </span>
                  {!readIds.has(pinnedNews.id) && (
                    <span className="size-2 rounded-full bg-primary animate-pulse" title="Unread" />
                  )}
                </div>
                <span className="text-muted-foreground font-semibold text-xs normal-case">
                  {pinnedNews.date || pinnedNews.createdAt?.slice(0, 10) || "Recent"}
                </span>
              </div>

              <div className="space-y-1">
                <h3 className="text-lg sm:text-xl font-bold text-foreground hover:text-primary transition-colors">
                  {pinnedNews.title}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                  {pinnedNews.body}
                </p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <div className="size-6 rounded-full bg-secondary text-primary flex items-center justify-center font-bold text-[10px]">
                    {pinnedNews.authorName?.[0] || "T"}
                  </div>
                  <span>{pinnedNews.authorName || "Staff"}</span>
                </div>

                <span className="text-xs font-bold text-primary flex items-center gap-1">
                  Read notice <ArrowRight className="size-3.5" />
                </span>
              </div>
            </div>
          )}

          {/* Regular Notices Grid */}
          {regularNews.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-base font-bold text-foreground px-1">
                More Notices
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {regularNews.map((news) => {
                  const isUnread = !readIds.has(news.id);

                  return (
                    <div
                      key={news.id}
                      onClick={() => handleOpenNews(news)}
                      className="relative overflow-hidden p-5 sm:p-6 rounded-3xl bg-card border border-border shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] hover:shadow-md hover:border-primary/30 cursor-pointer transition-all flex flex-col justify-between space-y-3"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                          <div className="flex items-center gap-2">
                            {isUnread && (
                              <span className="size-2 rounded-full bg-primary shrink-0" title="Unread" />
                            )}
                            <Calendar className="size-3.5" />
                            <span>{news.date || news.createdAt?.slice(0, 10) || "Recent"}</span>
                          </div>
                          {news.audience === "classes" && (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-secondary px-2.5 py-0.5 rounded-full">
                              Class
                            </span>
                          )}
                        </div>

                        <h4 className="text-base font-bold text-foreground truncate hover:text-primary transition-colors">
                          {news.title}
                        </h4>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {news.body}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-border">
                        <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                          {news.authorName || "Staff"}
                        </span>
                        <span className="text-xs font-bold text-primary flex items-center gap-1">
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
