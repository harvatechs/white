"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useWhite } from "@/lib/store";
import { Bookmark as BookmarkIcon, Trash2, ExternalLink, Search } from "lucide-react";
import type { BookmarkItem } from "@/lib/types";

interface BookmarksDialogProps {
  onPick: (q: string) => void;
}

export function BookmarksDialog({ onPick }: BookmarksDialogProps) {
  const open = useWhite((s) => s.showBookmarks);
  const setOpen = useWhite((s) => s.setShowBookmarks);
  const bookmarks = useWhite((s) => s.bookmarks);
  const removeBookmark = useWhite((s) => s.removeBookmark);
  const prefs = useWhite((s) => s.prefs);

  const onDelete = async (url: string) => {
    removeBookmark(url);
    await fetch(`/api/bookmarks?url=${encodeURIComponent(url)}`, { method: "DELETE" }).catch(() => {});
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[85vh] overflow-y-auto ws-scroll ws-surface ws-hairline rounded-2xl p-0 sm:max-w-[560px]">
        <DialogHeader className="px-7 pt-7 pb-3 ws-hairline-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-xl font-semibold tracking-tight">
              <BookmarkIcon className="size-5" style={{ color: "var(--ws-accent)" }} strokeWidth={1.75} />
              Bookmarks
            </DialogTitle>
            <span className="ws-pill">{bookmarks.length} saved</span>
          </div>
          <DialogDescription className="text-[13px] text-foreground/55">
            Results you chose to keep. Stored only in your anonymous session — never sent anywhere.
          </DialogDescription>
        </DialogHeader>

        <div className="px-3 py-3">
          {bookmarks.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div
                className="mb-4 flex size-12 items-center justify-center rounded-2xl"
                style={{ background: "var(--ws-accent-soft)" }}
              >
                <BookmarkIcon className="size-6" style={{ color: "var(--ws-accent)" }} strokeWidth={1.5} />
              </div>
              <p className="text-[14px] font-medium">No bookmarks yet</p>
              <p className="mt-1 max-w-[280px] text-[12.5px] text-foreground/50">
                Click the bookmark icon on any result to save it here. Bookmarks stay private to your session.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col">
              {bookmarks.map((b) => (
                <BookmarkRow
                  key={b.id}
                  item={b}
                  onPick={onPick}
                  onDelete={onDelete}
                  openNewTab={prefs.openNewTab}
                />
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BookmarkRow({
  item,
  onPick,
  onDelete,
  openNewTab,
}: {
  item: BookmarkItem;
  onPick: (q: string) => void;
  onDelete: (url: string) => void;
  openNewTab: boolean;
}) {
  const host = item.host.replace(/^www\./, "");
  return (
    <li className="group flex items-start gap-3 rounded-xl px-4 py-3 hover:ws-whisper transition-colors">
      <div className="ws-letterbox mt-0.5 shrink-0">{(item.title || host || "?").charAt(0).toUpperCase()}</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-[11px] text-foreground/50">
          <span className="truncate">{host}</span>
          <span className="text-foreground/25">·</span>
          <span>{new Date(item.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
        </div>
        <a
          href={item.url}
          target={openNewTab ? "_blank" : "_self"}
          rel={openNewTab ? "noopener noreferrer" : undefined}
          className="mt-0.5 block truncate text-[14px] font-medium hover:underline underline-offset-2"
          style={{ color: "var(--ws-accent)" }}
        >
          {item.title}
        </a>
        {item.snippet && (
          <p className="mt-0.5 line-clamp-1 text-[12.5px] text-foreground/55">{item.snippet}</p>
        )}
        <button
          type="button"
          onClick={() => onPick(item.query)}
          className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-foreground/40 hover:text-foreground/70 transition-colors"
        >
          <Search className="size-3" strokeWidth={1.75} />
          re-search &ldquo;{item.query}&rdquo;
        </button>
      </div>
      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full p-1.5 text-foreground/30 hover:bg-foreground/5 hover:text-foreground/60 transition-colors"
          aria-label="Open"
        >
          <ExternalLink className="size-3.5" strokeWidth={1.75} />
        </a>
        <button
          type="button"
          onClick={() => onDelete(item.url)}
          className="rounded-full p-1.5 text-foreground/30 hover:bg-foreground/5 hover:text-foreground/60 transition-colors"
          aria-label="Remove bookmark"
        >
          <Trash2 className="size-3.5" strokeWidth={1.75} />
        </button>
      </div>
    </li>
  );
}
