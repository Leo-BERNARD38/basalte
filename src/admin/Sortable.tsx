// Le réordonnancement, écrit une fois et employé deux fois : les sections
// d’une page, et les éléments d’une liste répétable.

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import type { ReactNode } from 'react'

export type Handle = {
  readonly ref: (element: HTMLElement | null) => void
  readonly props: Record<string, unknown>
}

export function SortableList({
  ids,
  onMove,
  children,
}: {
  readonly ids: readonly string[]
  readonly onMove: (from: number, to: number) => void
  readonly children: ReactNode
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const end = (event: DragEndEvent) => {
    const over = event.over

    if (over === null || over.id === event.active.id) return

    onMove(ids.indexOf(String(event.active.id)), ids.indexOf(String(over.id)))
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={end}
    >
      <SortableContext items={[...ids]} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  )
}

export function SortableItem({
  id,
  children,
}: {
  readonly id: string
  readonly children: (handle: Handle) => ReactNode
}) {
  const sortable = useSortable({ id })
  const shift = sortable.transform

  return (
    <div
      ref={sortable.setNodeRef}
      style={{
        transform:
          shift === null
            ? undefined
            : `translate3d(${shift.x}px, ${shift.y}px, 0)`,
        transition: sortable.transition,
        opacity: sortable.isDragging ? 0.6 : 1,
      }}
    >
      {children({
        ref: sortable.setActivatorNodeRef,
        props: { ...sortable.attributes, ...sortable.listeners },
      })}
    </div>
  )
}
