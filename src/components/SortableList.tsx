import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type React from "react";
import { Button } from "@/components/shared/Button";
import { t } from "@/i18n";

const SORTABLE_LIST_CLASS_NAMES = {
  item: "sortable-item",
  itemContent: "sortable-item-content",
  list: "sortable-list",
} as const;

interface SortableListProps<T extends { id: string }> {
  children: (item: T) => React.ReactNode;
  items: T[];
  onReorder: (items: T[]) => void;
}

/**
 * 汎用的なドラッグ&ドロップ可能なリストコンポーネント
 * @template T - IDを持つオブジェクト型
 */
export function SortableList<T extends { id: string }>({
  children,
  items,
  onReorder,
}: SortableListProps<T>) {
  // センサー設定（マウス・タッチ・キーボード対応）
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      onReorder(arrayMove(items, oldIndex, newIndex));
    }
  }

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      sensors={sensors}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <ul className={SORTABLE_LIST_CLASS_NAMES.list}>
          {items.map((item) => (
            <SortableListItem
              item={item}
              key={item.id}
              renderContent={children}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

interface SortableListItemProps<T extends { id: string }> {
  item: T;
  renderContent: (item: T) => React.ReactNode;
}

function SortableListItem<T extends { id: string }>({
  item,
  renderContent,
}: SortableListItemProps<T>) {
  const content = renderContent(item);

  return <SortableItem id={item.id}>{content}</SortableItem>;
}

interface SortableItemProps {
  children: React.ReactNode;
  id: string;
}

/**
 * ドラッグ&ドロップ可能な個別アイテムコンポーネント
 */
function SortableItem({ id, children }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <li ref={setNodeRef} style={style} {...attributes}>
      <div className={SORTABLE_LIST_CLASS_NAMES.item}>
        <Button
          type="button"
          variant="dragHandle"
          {...listeners}
          aria-label={t("common.dragToReorder")}
        >
          ⋮⋮
        </Button>
        <div className={SORTABLE_LIST_CLASS_NAMES.itemContent}>{children}</div>
      </div>
    </li>
  );
}
