/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useCallback } from 'react';
import { PDFDocument } from 'pdf-lib';
import { saveAs } from 'file-saver';
import { UploadCloud, FileOutput, Loader2, Download, Trash2, Plus, Layers } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { PageItem, FileGroup } from './types';
import { extractPdfPages } from './lib/pdf';
import { SortablePage } from './components/SortablePage';
import { SortableFileGroup } from './components/SortableFileGroup';

export default function App() {
  const [fileGroups, setFileGroups] = useState<FileGroup[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [mergedPdfUrl, setMergedPdfUrl] = useState<string | null>(null);
  const [mergedPdfBlob, setMergedPdfBlob] = useState<Blob | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const processFiles = async (fileList: FileList | File[]) => {
    setIsProcessing(true);
    setProgress(0);
    setMergedPdfUrl(null);
    setMergedPdfBlob(null);

    const files = Array.from(fileList);
    const newGroups: FileGroup[] = [];
    const totalFiles = files.length;

    for (let i = 0; i < totalFiles; i++) {
      const file = files[i];
      const fileId = Math.random().toString(36).substring(2, 9);
      const groupPages: PageItem[] = [];

      if (file.type === 'application/pdf') {
        try {
          const extractedPages = await extractPdfPages(file, (pageProgress) => {
            const baseProgress = (i / totalFiles) * 100;
            const currentFileProgress = (pageProgress / totalFiles) * 100;
            setProgress(Math.round(baseProgress + currentFileProgress));
          });
          extractedPages.forEach((ep) => {
            groupPages.push({
              id: `${fileId}-${ep.pageIndex}`,
              fileId,
              fileName: file.name,
              type: 'pdf',
              pageIndex: ep.pageIndex,
              thumbnailUrl: ep.thumbnailUrl,
              file,
            });
          });
        } catch (error) {
          console.error('Error extracting PDF pages:', error);
          setAlertMessage(`Không thể đọc tệp PDF: ${file.name}`);
        }
      } else if (file.type.startsWith('image/')) {
        const thumbnailUrl = URL.createObjectURL(file);
        groupPages.push({
          id: `${fileId}-img`,
          fileId,
          fileName: file.name,
          type: 'image',
          thumbnailUrl,
          file,
        });
      } else {
        setAlertMessage(`Định dạng không được hỗ trợ: ${file.name}`);
      }
      
      if (groupPages.length > 0) {
        newGroups.push({
          id: fileId,
          name: file.name,
          isExpanded: true,
          pages: groupPages,
        });
      }
      
      setProgress(Math.round(((i + 1) / totalFiles) * 100));
    }

    setFileGroups((prev) => [...prev, ...newGroups]);
    setIsProcessing(false);
    setProgress(0);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
    // Reset input so the same files can be selected again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDragOverDnd = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeType = active.data.current?.type;
    const overType = over.data.current?.type;

    if (activeType === 'page') {
      const activeId = active.id as string;
      const overId = over.id as string;

      setFileGroups((groups) => {
        const activeGroupIndex = groups.findIndex(g => g.pages.some(p => p.id === activeId));
        let overGroupIndex = groups.findIndex(g => g.pages.some(p => p.id === overId));

        if (overType === 'file') {
          overGroupIndex = groups.findIndex(g => g.id === overId);
        }

        if (activeGroupIndex === -1 || overGroupIndex === -1) return groups;
        if (activeGroupIndex === overGroupIndex) return groups;

        const newGroups = [...groups];
        const activeGroup = { ...newGroups[activeGroupIndex] };
        const overGroup = { ...newGroups[overGroupIndex] };

        const activePageIndex = activeGroup.pages.findIndex(p => p.id === activeId);
        const [movedPage] = activeGroup.pages.splice(activePageIndex, 1);

        if (overType === 'page') {
          const overPageIndex = overGroup.pages.findIndex(p => p.id === overId);
          // Insert at the over index
          overGroup.pages.splice(overPageIndex, 0, movedPage);
        } else {
          // Dropped on a file group, add to the end
          overGroup.pages.push(movedPage);
        }

        newGroups[activeGroupIndex] = activeGroup;
        newGroups[overGroupIndex] = overGroup;

        return newGroups;
      });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeType = active.data.current?.type;
    const overType = over.data.current?.type;

    if (activeType === 'file' && overType === 'file') {
      if (active.id !== over.id) {
        setFileGroups((items) => {
          const oldIndex = items.findIndex((item) => item.id === active.id);
          const newIndex = items.findIndex((item) => item.id === over.id);
          return arrayMove(items, oldIndex, newIndex);
        });
      }
    } else if (activeType === 'page' && overType === 'page') {
      const activeId = active.id as string;
      const overId = over.id as string;
      
      setFileGroups((groups) => {
        const activeGroupIndex = groups.findIndex(g => g.pages.some(p => p.id === activeId));
        const overGroupIndex = groups.findIndex(g => g.pages.some(p => p.id === overId));

        if (activeGroupIndex === overGroupIndex && activeGroupIndex !== -1) {
          if (activeId !== overId) {
            const newGroups = [...groups];
            const group = { ...newGroups[activeGroupIndex] };
            const oldIndex = group.pages.findIndex((p) => p.id === activeId);
            const newIndex = group.pages.findIndex((p) => p.id === overId);
            group.pages = arrayMove(group.pages, oldIndex, newIndex);
            newGroups[activeGroupIndex] = group;
            return newGroups;
          }
        }
        return groups;
      });
    }
  };

  const handleRemovePage = (id: string) => {
    setFileGroups((prev) => prev.map(g => ({
      ...g,
      pages: g.pages.filter(p => p.id !== id)
    })));
    setMergedPdfUrl(null);
    setMergedPdfBlob(null);
  };

  const handleRemoveGroup = (id: string) => {
    setFileGroups((prev) => prev.filter(g => g.id !== id));
    setMergedPdfUrl(null);
    setMergedPdfBlob(null);
  };

  const handleToggleExpand = (id: string) => {
    setFileGroups((prev) => prev.map(g => 
      g.id === id ? { ...g, isExpanded: !g.isExpanded } : g
    ));
  };

  const handleClearAll = () => {
    setShowClearConfirm(true);
  };

  const confirmClearAll = () => {
    setFileGroups([]);
    setMergedPdfUrl(null);
    setMergedPdfBlob(null);
    setShowClearConfirm(false);
  };

  const mergePages = async () => {
    const allPages = fileGroups.flatMap(g => g.pages);
    if (allPages.length === 0) return;

    setIsProcessing(true);
    setProgress(0);

    try {
      const mergedPdf = await PDFDocument.create();
      const loadedPdfs: Record<string, PDFDocument> = {};

      for (let i = 0; i < allPages.length; i++) {
        const page = allPages[i];

        if (page.type === 'pdf') {
          if (!loadedPdfs[page.fileId]) {
            const arrayBuffer = await page.file.arrayBuffer();
            loadedPdfs[page.fileId] = await PDFDocument.load(arrayBuffer);
          }
          const pdfDoc = loadedPdfs[page.fileId];
          const [copiedPage] = await mergedPdf.copyPages(pdfDoc, [page.pageIndex!]);
          mergedPdf.addPage(copiedPage);
        } else if (page.type === 'image') {
          const arrayBuffer = await page.file.arrayBuffer();
          let image;
          if (page.file.type === 'image/jpeg' || page.file.type === 'image/jpg') {
            image = await mergedPdf.embedJpg(arrayBuffer);
          } else if (page.file.type === 'image/png') {
            image = await mergedPdf.embedPng(arrayBuffer);
          } else {
            console.warn('Unsupported image type:', page.file.type);
            continue;
          }

          const dims = image.scale(1);
          const newPage = mergedPdf.addPage([dims.width, dims.height]);
          newPage.drawImage(image, {
            x: 0,
            y: 0,
            width: dims.width,
            height: dims.height,
          });
        }

        setProgress(Math.round(((i + 1) / allPages.length) * 100));
      }

      const pdfBytes = await mergedPdf.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      setMergedPdfBlob(blob);
      setMergedPdfUrl(url);
    } catch (error) {
      console.error('Error merging PDF:', error);
      setAlertMessage('Đã xảy ra lỗi khi ghép PDF.');
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const downloadPdf = () => {
    if (mergedPdfBlob) {
      saveAs(mergedPdfBlob, 'Merged_Document.pdf');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              PDF & Image Merger
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {fileGroups.length > 0 && (
              <button
                onClick={handleClearAll}
                className="text-slate-500 hover:text-red-600 px-3 py-2 text-sm font-medium transition-colors"
                disabled={isProcessing}
              >
                Xóa tất cả
              </button>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              Thêm tệp
            </button>
            <button
              onClick={mergePages}
              disabled={fileGroups.length === 0 || isProcessing || fileGroups.every(g => g.pages.length === 0)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileOutput className="w-4 h-4" />
              )}
              Ghép PDF
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <input
          type="file"
          accept=".pdf,image/jpeg,image/png,image/jpg"
          multiple
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileChange}
        />

        {fileGroups.length === 0 && !isProcessing ? (
          <div
            className="border-2 border-dashed border-slate-300 rounded-2xl p-12 text-center hover:bg-slate-100 transition-colors cursor-pointer bg-white mt-12"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
          >
            <UploadCloud className="w-16 h-16 text-blue-500 mx-auto mb-4" />
            <h3 className="text-xl font-medium mb-2">Kéo thả tệp PDF hoặc Ảnh vào đây</h3>
            <p className="text-slate-500 mb-4">hoặc click để chọn tệp từ máy tính</p>
            <p className="text-sm text-slate-400">Hỗ trợ: .pdf, .jpg, .png</p>
          </div>
        ) : (
          <div className="space-y-6">
            {isProcessing && (
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 text-center">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Đang xử lý...</h3>
                <div className="w-full bg-slate-100 rounded-full h-2.5 mb-2 overflow-hidden">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-slate-500">{progress}% hoàn thành</p>
              </div>
            )}

            {mergedPdfUrl && !isProcessing && (
              <div className="bg-green-50 border border-green-200 p-6 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="text-green-800 font-medium text-lg">Ghép tệp thành công!</h3>
                  <p className="text-green-600 text-sm">Tệp PDF của bạn đã sẵn sàng để tải xuống.</p>
                </div>
                <button
                  onClick={downloadPdf}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors whitespace-nowrap"
                >
                  <Download className="w-5 h-5" />
                  Tải xuống PDF
                </button>
              </div>
            )}

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-800">
                  Các tệp đã tải lên
                </h2>
                <span className="text-sm text-slate-500">
                  {fileGroups.reduce((acc, g) => acc + g.pages.length, 0)} trang
                </span>
              </div>

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragOver={handleDragOverDnd}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={fileGroups.map(g => g.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-4">
                    {fileGroups.map((group) => (
                      <SortableFileGroup 
                        key={group.id} 
                        group={group} 
                        onRemovePage={handleRemovePage} 
                        onRemoveGroup={handleRemoveGroup}
                        onToggleExpand={handleToggleExpand}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          </div>
        )}
      </main>

      {/* Alert Modal */}
      {alertMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-sm w-full p-6 space-y-4">
            <h3 className="text-lg font-semibold text-slate-900">Thông báo</h3>
            <p className="text-slate-600 text-sm">{alertMessage}</p>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setAlertMessage(null)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Clear Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-sm w-full p-6 space-y-4">
            <h3 className="text-lg font-semibold text-slate-900">Xác nhận xóa</h3>
            <p className="text-slate-600 text-sm">Bạn có chắc chắn muốn xóa tất cả các trang đã tải lên không? Hành động này không thể hoàn tác.</p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={confirmClearAll}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                Xóa tất cả
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

