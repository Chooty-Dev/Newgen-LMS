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
      <section className="bg-sky-400/20 border border-blue-100/80 rounded-3xl p-5 sm:p-7 flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_10px_25px_-5px_rgba(24,72,128,0.06),0_4px_10px_-4px_rgba(24,72,128,0.03)] relative overflow-hidden">
        <div className="space-y-2.5 max-w-lg text-center md:text-left z-10">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#184880] tracking-tight leading-tight">
            School News & Notices
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 font-medium">
            Stay updated with timetable changes, center announcements, and teacher notices.
          </p>
        </div>

        <div className="relative w-40 h-36 sm:w-48 sm:h-40 shrink-0 z-10">
          <Image
            src="/images/class.webp"
            alt="School News"
            fill
            priority
            className="object-contain drop-shadow-sm"
            sizes="(max-width: 768px) 160px, 192px"
          />
        </div>
      </section>

      {/* 2. Controls & Search */}
      <section className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search announcements..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-11 pl-11 pr-4 rounded-full bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#184880]"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFilterAudience("all")}
            className={`h-10 px-5 rounded-full text-xs font-bold transition-all ${filterAudience === "all"
              ? "bg-[#184880] text-white shadow-xs"
              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
          >
            All Notices
          </button>
          <button
            type="button"
            onClick={() => setFilterAudience("classes")}
            className={`h-10 px-5 rounded-full text-xs font-bold transition-all ${filterAudience === "classes"
              ? "bg-[#184880] text-white shadow-xs"
              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
          >
            My Classes
          </button>
        </div>
      </section>

      {/* 3. Notices Content */}
      {filteredNews.length === 0 ? (
        <div className="bg-gradient-to-b from-white via-white to-[#F0F6FF]/60 rounded-3xl p-10 text-center space-y-3 border border-blue-100/60 shadow-[0_10px_25px_-5px_rgba(24,72,128,0.06),0_4px_10px_-4px_rgba(24,72,128,0.03)]">
          <div className="size-14 rounded-full bg-blue-50 text-[#184880] flex items-center justify-center mx-auto">
            <Megaphone className="size-6" />
          </div>
          <div className="space-y-1">
            <h4 className="text-base font-bold text-slate-900">No notices found</h4>
            <p className="text-xs text-slate-500">No announcements match your current filters.</p>
          </div>
          {filterAudience !== "all" && (
            <button
              type="button"
              onClick={() => setFilterAudience("all")}
              className="rounded-full h-9 px-5 text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
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
              className="relative overflow-hidden p-6 sm:p-7 rounded-3xl bg-gradient-to-b from-white via-white to-[#F0F6FF]/60 border border-blue-100/60 shadow-[0_10px_25px_-5px_rgba(24,72,128,0.06),0_4px_10px_-4px_rgba(24,72,128,0.03)] hover:shadow-[0_14px_30px_-5px_rgba(24,72,128,0.09)] hover:border-blue-200 cursor-pointer transition-all space-y-3"
            >
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#184880]">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EBF3FE]">
                    <Pin className="size-3" />
                    Pinned
                  </span>
                  {!readIds.has(pinnedNews.id) && (
                    <span className="size-2 rounded-full bg-blue-600 animate-pulse" title="Unread" />
                  )}
                </div>
                <span className="text-slate-400 font-semibold text-xs normal-case">
                  {pinnedNews.date || pinnedNews.createdAt?.slice(0, 10) || "Recent"}
                </span>
              </div>

              <div className="space-y-1">
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 hover:text-[#184880] transition-colors">
                  {pinnedNews.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 line-clamp-2 leading-relaxed">
                  {pinnedNews.body}
                </p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <div className="size-6 rounded-full bg-[#EBF3FE] text-[#184880] flex items-center justify-center font-bold text-[10px]">
                    {pinnedNews.authorName?.[0] || "T"}
                  </div>
                  <span>{pinnedNews.authorName || "Staff"}</span>
                </div>

                <span className="text-xs font-bold text-[#184880] flex items-center gap-1">
                  Read notice <ArrowRight className="size-3.5" />
                </span>
              </div>
            </div>
          )}

          {/* Regular Notices Grid */}
          {regularNews.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-base font-bold text-slate-900 px-1">
                More Notices
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {regularNews.map((news) => {
                  const isUnread = !readIds.has(news.id);

                  return (
                    <div
                      key={news.id}
                      onClick={() => handleOpenNews(news)}
                      className="relative overflow-hidden p-5 sm:p-6 rounded-3xl bg-gradient-to-b from-white via-white to-[#F0F6FF]/50 border border-blue-100/60 shadow-[0_10px_25px_-5px_rgba(24,72,128,0.06),0_4px_10px_-4px_rgba(24,72,128,0.03)] hover:shadow-[0_14px_30px_-5px_rgba(24,72,128,0.09)] hover:border-blue-200 cursor-pointer transition-all flex flex-col justify-between space-y-3"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-medium text-slate-400">
                          <div className="flex items-center gap-2">
                            {isUnread && (
                              <span className="size-2 rounded-full bg-blue-600 shrink-0" title="Unread" />
                            )}
                            <Calendar className="size-3.5" />
                            <span>{news.date || news.createdAt?.slice(0, 10) || "Recent"}</span>
                          </div>
                          {news.audience === "classes" && (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#184880] bg-[#EBF3FE] px-2.5 py-0.5 rounded-full">
                              Class
                            </span>
                          )}
                        </div>

                        <h4 className="text-base font-bold text-slate-900 truncate hover:text-[#184880] transition-colors">
                          {news.title}
                        </h4>
                        <p className="text-xs text-slate-500 line-clamp-2">
                          {news.body}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                        <span className="text-xs text-slate-500 truncate max-w-[180px]">
                          {news.authorName || "Staff"}
                        </span>
                        <span className="text-xs font-bold text-[#184880] flex items-center gap-1">
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
