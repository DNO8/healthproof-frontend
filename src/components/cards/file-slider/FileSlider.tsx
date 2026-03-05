import { FileSliderCard, TAB_HEIGHT } from "./FileSliderCard";
import {
  FILE_SLIDER_ITEMS_LEFT,
  FILE_SLIDER_ITEMS_RIGHT,
  type FileSliderItem,
} from "./constants";

const CARD_BODY_HEIGHT = 320;

function FileSliderDrawer({ items }: { items: FileSliderItem[] }) {
  const drawerHeight = items.length * TAB_HEIGHT + CARD_BODY_HEIGHT;

  return (
    <div
      className="relative w-[280px] sm:w-[320px]"
      style={{ height: `${drawerHeight}px` }}
    >
      {items.map((item, index) => (
        <FileSliderCard
          index={index}
          item={item}
          key={item.id}
          total={items.length}
        />
      ))}
    </div>
  );
}

export function FileSlider() {
  return (
    <section className="w-full py-10 lg:py-20">
      <div className="flex flex-col items-center gap-4 lg:flex-row lg:justify-center lg:gap-36">
        <FileSliderDrawer items={FILE_SLIDER_ITEMS_LEFT} />
        <FileSliderDrawer items={FILE_SLIDER_ITEMS_RIGHT} />
      </div>
    </section>
  );
}
