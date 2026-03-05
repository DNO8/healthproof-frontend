"use client";

import { useRef, useLayoutEffect, useState } from "react";
import gsap from "gsap";
import { CardFile } from "@/components/ui";
import type { FileSliderItem } from "./constants";

type FileSliderCardProps = {
  item: FileSliderItem;
  index: number;
  total: number;
};

export const TAB_HEIGHT = 72;

const ANIM_DURATION = 0.8;
const ANIM_EASE = "power3.out";
const PERSPECTIVE = 1600;
const Z_STEP = -2;
const Z_OPEN = 100;
const Y_OPEN = -40;
const Z_INDEX_OPEN = 50;
const REST_ROTATE_X = -235;
const REST_SCALE_Y = -1;
const TAB_OFFSET_BASE = 16;
const TAB_OFFSET_STEP = 40;

const CARD_BODY_HEIGHT = 280;

export function FileSliderCard({ item, index, total }: FileSliderCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  const restZ = index * Z_STEP;

  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    gsap.set(el, {
      rotateX: REST_ROTATE_X,
      scaleY: REST_SCALE_Y,
      z: restZ,
      y: 0,
      transformPerspective: PERSPECTIVE,
      transformOrigin: "center bottom",
    });
  }, [restZ]);

  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const target = isOpen
      ? { rotateX: 0, scaleY: 1, z: Z_OPEN, y: Y_OPEN }
      : { rotateX: REST_ROTATE_X, scaleY: REST_SCALE_Y, z: restZ, y: 0 };

    gsap.to(el, {
      ...target,
      duration: ANIM_DURATION,
      ease: ANIM_EASE,
      overwrite: true,
    });
  }, [isOpen, restZ]);

  const handleEnter = () => setIsOpen(true);
  const handleLeave = () => setIsOpen(false);

  const isLast = index === total - 1;
  const hitHeight = isLast ? TAB_HEIGHT + CARD_BODY_HEIGHT : TAB_HEIGHT;

  return (
    <div
      className="absolute left-0 w-[280px] sm:w-[320px]"
      style={{
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
