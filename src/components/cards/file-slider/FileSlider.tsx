import { FileSliderCard, TAB_HEIGHT } from "./FileSliderCard";
import type { FileSliderItem } from "./constants";

const CARD_BODY_HEIGHT = 320;

type FileSliderDrawerProps = {
  items: FileSliderItem[];
  cardWidth?: { base: number; sm: number };
};

export function FileSliderDrawer({ items, cardWidth }: FileSliderDrawerProps) {
  const width = cardWidth?.base ?? 280;
  const drawerHeight = items.length * TAB_HEIGHT + CARD_BODY_HEIGHT;

  return (
    <div className="relative" style={{ width, height: `${drawerHeight}px` }}>
      {items.map((item, index) => (
        <FileSliderCard
          cardWidth={cardWidth}
          index={index}
          item={item}
          key={item.id}
          total={items.length}
        />
      ))}
    </div>
  );
}
