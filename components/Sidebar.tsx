"use client";

import { NexusLogo } from "./NexusBrand";

import {
  Archive,
  ArchiveRestore,
  Brain,
  Cloud,
  Code2,
  GraduationCap,
  LogOut,
  MessageSquare,
  PanelLeftClose,
  Pencil,
  PenTool,
  Pin,
  Plus,
  Search,
  Settings,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Chat, Gem } from "../types/nexus";

type SidebarProps = {
  mobileMenu: boolean;
  onCloseMobile: () => void;
  onCollapseSidebar: () => void;
  onCreateChat: (gemId?: string) => void;
  search: string;
  onSearchChange: (val: string) => void;
  archiveView: boolean;
  onToggleArchiveView: () => void;
  visibleChats: Chat[];
  activeId: string;
  onSelectChat: (id: string) => void;
  onRenameChat: (chat: Chat) => void;
  onToggleChatFlag: (id: string, key: "pinned" | "archived") => void;
  onDeleteChat: (id: string) => void;
  gems: Gem[];
  activeGemId?: string;
  onOpenGemModal: (gem?: Gem) => void;
  syncStatus: string;
  approvedMemoryCount: number;
  onOpenSettings: (tab: "general" | "gems" | "memory" | "account" | "system") => void;
  email: string;
  onLogout: () => void;
};

export function renderGemIcon(icon: Gem["icon"], size = 14) {
  switch (icon) {
    case "code":
      return <Code2 size={size} />;
    case "search":
      return <Search size={size} />;
    case "pen":
      return <PenTool size={size} />;
    case "graduation":
      return <GraduationCap size={size} />;
    default:
      return <Sparkles size={size} />;
  }
}

export function Sidebar({
  mobileMenu,
  onCloseMobile,
  onCollapseSidebar,
  onCreateChat,
  search,
  onSearchChange,
  archiveView,
  onToggleArchiveView,
  visibleChats,
  activeId,
  onSelectChat,
  onRenameChat,
  onToggleChatFlag,
  onDeleteChat,
  gems,
  activeGemId,
  onOpenGemModal,
  syncStatus,
  approvedMemoryCount,
  onOpenSettings,
  email,
  onLogout,
}: SidebarProps) {
  return (
    <>
      {mobileMenu && (
        <button
          type="button"
          className="mobile-scrim"
          onClick={onCloseMobile}
          aria-label="Menüyü kapat"
        />
      )}
      <aside className={`sidebar ${mobileMenu ? "mobile-open" : ""}`}>
        <div className="sidebar-brand">
          <div className="brand-symbol">
            <NexusLogo size={34} decorative />
          </div>
          <div className="brand-word">
            <b>NEXUS</b>
            <span>5.2 · EXPERIENCE PREVIEW</span>
          </div>
          <button
            type="button"
            className="icon-button sidebar-close"
            title="Paneli kapat"
            onClick={onCollapseSidebar}
          >
            <PanelLeftClose size={17} />
          </button>
        </div>

        <button type="button" className="new-chat-button" onClick={() => onCreateChat()}>
          <Plus size={17} />
          Yeni sohbet <kbd>⌘ K</kbd>
        </button>

        <div className="sidebar-search">
          <Search size={15} />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Sohbetlerde ara…"
          />
          <kbd>⌘/</kbd>
        </div>

        {/* Gemini-inspired Gems (Custom AI Personas) */}
        <div className="chat-list-heading">
          <span>GEMS · ASİSTANLAR</span>
          <button type="button" onClick={() => onOpenGemModal()} title="Yeni Gem oluştur">
            <Plus size={13} /> Yeni
          </button>
        </div>
        <div className="gem-list">
          {gems.map((gem) => (
            <div
              key={gem.id}
              className={`gem-item ${activeGemId === gem.id ? "active" : ""}`}
            >
              <button
                type="button"
                className="gem-select"
                onClick={() => onCreateChat(gem.id)}
                title={gem.description}
              >
                <span className="gem-badge">{renderGemIcon(gem.icon, 13)}</span>
                <span>{gem.name}</span>
              </button>
              {!gem.builtIn && (
                <button
                  type="button"
                  className="gem-edit-btn"
                  onClick={() => onOpenGemModal(gem)}
                  title="Gem'i düzenle"
                >
                  <Pencil size={12} />
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="chat-list-heading">
          <span>{archiveView ? "ARŞİV" : "SON SOHBETLER"}</span>
          <button type="button" onClick={onToggleArchiveView}>
            {archiveView ? <ArchiveRestore size={14} /> : <Archive size={14} />}{" "}
            {archiveView ? "Sohbetler" : "Arşiv"}
          </button>
        </div>

        <div className="chat-list">
          {visibleChats.map((chat) => (
            <div
              className={`chat-list-item ${chat.id === activeId ? "active" : ""}`}
              key={chat.id}
            >
              <button
                type="button"
                className="chat-select"
                onClick={() => onSelectChat(chat.id)}
              >
                <MessageSquare size={15} />
                <span>{chat.title}</span>
                {chat.pinned && <Pin size={12} className="pin-indicator" />}
              </button>
              <div className="chat-actions">
                <button
                  type="button"
                  title="Yeniden adlandır"
                  onClick={() => onRenameChat(chat)}
                >
                  <Pencil size={13} />
                </button>
                <button
                  type="button"
                  title={chat.pinned ? "Sabitlemeyi kaldır" : "Sabitle"}
                  onClick={() => onToggleChatFlag(chat.id, "pinned")}
                >
                  <Pin size={13} />
                </button>
                <button
                  type="button"
                  title={chat.archived ? "Arşivden çıkar" : "Arşivle"}
                  onClick={() => onToggleChatFlag(chat.id, "archived")}
                >
                  <Archive size={13} />
                </button>
                <button
                  type="button"
                  title="Sil"
                  onClick={() => onDeleteChat(chat.id)}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
          {!visibleChats.length && (
            <div className="empty-history">
              {search ? "Eşleşen sohbet bulunamadı." : "Henüz sohbet yok."}
            </div>
          )}
        </div>

        <div className="sidebar-bottom">
          <div className="sync-line">
            <span
              className={`sync-dot ${syncStatus.toLowerCase().includes("hata") ? "warning" : ""}`}
            />
            <span>{syncStatus}</span>
            <Cloud size={13} />
          </div>
          <button
            type="button"
            className="nav-button"
            onClick={() => onOpenSettings("memory")}
          >
            <Brain size={16} />
            Hafızam <span>{approvedMemoryCount}</span>
          </button>
          <button
            type="button"
            className="nav-button"
            onClick={() => onOpenSettings("general")}
          >
            <Settings size={16} />
            Ayarlar
          </button>
          <div className="user-panel">
            <div className="user-avatar">{email.charAt(0).toUpperCase() || "N"}</div>
            <div className="user-meta">
              <b>{email.split("@")[0] || "NEXUS Kullanıcısı"}</b>
              <span>{email}</span>
            </div>
            <button
              type="button"
              className="subtle-icon"
              onClick={onLogout}
              title="Çıkış yap"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}