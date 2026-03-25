import React from 'react';
import { useSortable, SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FileGroup } from '../types';
import { GripVertical, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { SortablePage } from './SortablePage';

interface Props {
  group: FileGroup;
  onRemovePage: (id: string) => void;
  onRemoveGroup: (id: string) => void;
  onToggleExpand: (id: string) => void;
}

export function SortableFileGroup({ group, onRemovePage, onRemoveGroup, onToggleExpand }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: group.id,
    data: { type: 'file' }
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
        "bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden",
        isDragging && "opacity-50 z-50 ring-2 ring-blue-500"
      )}
    >
      <div className="flex items-center justify-between p-4 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div 
            {...attributes} 
            {...listeners} 
            className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 p-1"
          >
            <GripVertical className="w-5 h-5" />
          </div>
          <button 
            onClick={() => onToggleExpand(group.id)} 
            className="flex items-center gap-2 hover:text-blue-600 transition-colors"
          >
            {group.isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            <span className="font-medium text-slate-700">{group.name}</span>
            <span className="text-sm text-slate-500">({group.pages.length} trang)</span>
          </button>
        </div>
        <button 
          onClick={() => onRemoveGroup(group.id)} 
          className="text-slate-400 hover:text-red-600 p-2 rounded-md hover:bg-red-50 transition-colors"
          title="Xóa tệp này"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
      
      {group.isExpanded && group.pages.length > 0 && (
        <div className="p-4">
          <SortableContext items={group.pages.map(p => p.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {group.pages.map(page => (
                <SortablePage key={page.id} page={page} onRemove={onRemovePage} />
              ))}
            </div>
          </SortableContext>
        </div>
      )}
      
      {group.isExpanded && group.pages.length === 0 && (
        <div className="p-8 text-center text-slate-500 text-sm">
          Tệp này không còn trang nào.
        </div>
      )}
    </div>
  );
}
