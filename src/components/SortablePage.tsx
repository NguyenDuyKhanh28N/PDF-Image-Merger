import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { PageItem } from '../types';
import { GripVertical, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface Props {
  page: PageItem;
  onRemove: (id: string) => void;
}

export function SortablePage({ page, onRemove }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: page.id,
    data: { type: 'page', fileId: page.fileId }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden flex flex-col h-64",
        isDragging && "opacity-50 shadow-lg z-50 ring-2 ring-blue-500"
      )}
    >
      <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(page.id);
          }}
          className="p-1.5 bg-red-500 text-white rounded-md hover:bg-red-600 shadow-sm"
          title="Xóa trang này"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      
      <div 
        className="flex-1 bg-slate-100 flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing p-2"
        {...attributes}
        {...listeners}
      >
        <img 
          src={page.thumbnailUrl} 
          alt={`Page ${page.pageIndex !== undefined ? page.pageIndex + 1 : 'Image'}`} 
          className="max-h-full max-w-full object-contain pointer-events-none shadow-sm border border-slate-200 bg-white"
        />
      </div>
      
      <div className="p-2 text-xs text-slate-600 border-t border-slate-100 flex items-center gap-2 bg-white">
        <div 
          className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-4 h-4" />
        </div>
        <div className="truncate flex-1" title={page.fileName}>
          <span className="font-medium text-slate-700">
            {page.type === 'pdf' ? `Trang ${page.pageIndex! + 1}` : 'Ảnh'}
          </span>
          <span className="text-slate-400 ml-1">
            ({page.fileName})
          </span>
        </div>
      </div>
    </div>
  );
}
