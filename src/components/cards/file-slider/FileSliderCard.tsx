"use client";

import { useRef, useLayoutEffect, useState } from "react";
import gsap from "gsap";
import { CardFile } from "@/components/ui";
import type { FileSliderItem } from "./constants";

type FileSliderCardProps = {
  item: FileSliderItem;
  index: number;
  total: number;
  cardWidth?: { base: number; sm: number };
};

export const TAB_HEIGHT = 72;

const ANIM_DURATION = 0.8;
const ANIM_EASE = "power3.out";
const PERSPECTIVE = 1200;
const REST_ROTATE_X = -35;
const Y_OPEN = -80;
const Z_INDEX_OPEN = 50;
const TAB_OFFSET_BASE = 16;
const TAB_OFFSET_STEP = 40;

const CARD_BODY_HEIGHT = 280;

const DEFAULT_WIDTH = { base: 280, sm: 320 };

export function FileSliderCard({
  item,
  index,
  total,
  cardWidth = DEFAULT_WIDTH,
}: FileSliderCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    gsap.set(el, {
      rotateX: REST_ROTATE_X,
      y: 0,
      scale: 0.95,
      opacity: 0.85,
      transformPerspective: PERSPECTIVE,
      transformOrigin: "center top",
    });
  }, []);

  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    if (tlRef.current) {
      tlRef.current.kill();
    }

    const tl = gsap.timeline();
    tlRef.current = tl;

    if (isOpen) {
      tl.to(el, {
        y: Y_OPEN,
        scale: 1,
        opacity: 1,
        duration: ANIM_DURATION * 0.5,
        ease: ANIM_EASE,
      });
      tl.to(el, {
        rotateX: 0,
        duration: ANIM_DURATION * 0.5,
        ease: ANIM_EASE,
      });
    } else {
      tl.to(el, {
        rotateX: REST_ROTATE_X,
        duration: ANIM_DURATION * 0.5,
        ease: ANIM_EASE,
      });
      tl.to(el, {
        y: 0,
        scale: 0.95,
        opacity: 0.85,
        duration: ANIM_DURATION * 0.5,
        ease: ANIM_EASE,
      });
    }
  }, [isOpen]);

  const handleEnter = () => setIsOpen(true);
  const handleLeave = () => setIsOpen(false);

  const isLast = index === total - 1;
  const hitHeight = isLast ? TAB_HEIGHT + CARD_BODY_HEIGHT : TAB_HEIGHT;

  return (
    <div
      className="absolute left-0 mt-20"
      style={{
        width: cardWidth.base,
        zIndex: isOpen ? Z_INDEX_OPEN : index,
        top: index * TAB_HEIGHT,
        height: `${hitHeight}px`,
      }}
    >
      {/* Static hit-area — matches the visible zone of the card */}
      <div
        className="absolute inset-0 z-10 cursor-pointer"
        onPointerEnter={handleEnter}
        onPointerLeave={handleLeave}
      />

      <div
        ref={cardRef}
        className="file-drawer-card absolute top-0 left-0 w-full pointer-events-none"
      >
        <CardFile
          className="h-full"
          description={item.description}
          tabLabel={item.tabLabel}
          tabOffset={TAB_OFFSET_BASE + index * TAB_OFFSET_STEP}
          title={item.title}
        >
          <div className="mt-3 flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-(--hp-success)" />
            <span className="text-xs text-(--hp-muted)">Hash verificado</span>
          </div>
        </CardFile>
      </div>
    </div>
  );
}
