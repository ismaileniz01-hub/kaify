import type { ReactNode } from "react";
import Image from "next/image";
import { User } from "lucide-react";
import { chatUserInitials, isChatUserPhoto } from "@/lib/chat/chat-avatar";

/** Fixed 32px slot so bubbles stay aligned whether or not the avatar shows. */
export function ChatAvatarSlot({ children }: { children?: ReactNode }) {
  return (
    <div className="flex h-8 w-8 shrink-0 self-end" aria-hidden>
      {children}
    </div>
  );
}

/** Coach art is a transparent character sprite: contain, never crop. */
export function CoachChatAvatar({ src }: { src: string }) {
  return (
    <div className="contact-avatar h-8 w-8">
      <Image
        src={src}
        alt=""
        width={32}
        height={32}
        unoptimized
        className="h-full w-full object-contain"
      />
    </div>
  );
}

/** Real profile photo, else initials — never the brand logo. */
export function UserChatAvatar({
  src,
  name,
}: {
  src: string | null | undefined;
  name: string | null | undefined;
}) {
  if (isChatUserPhoto(src)) {
    return (
      <div className="h-8 w-8 overflow-hidden rounded-full ring-1 ring-white/15">
        <Image
          src={src}
          alt=""
          width={32}
          height={32}
          unoptimized
          className="h-full w-full object-cover"
        />
      </div>
    );
  }
  const initials = chatUserInitials(name);
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-[11px] font-bold tracking-wide text-white ring-1 ring-white/15">
      {initials || <User className="h-4 w-4 text-zinc-300" />}
    </div>
  );
}
