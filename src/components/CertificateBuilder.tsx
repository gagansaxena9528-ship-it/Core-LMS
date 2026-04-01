import React, { useState, useEffect, useRef } from 'react';
import { Stage, Layer, Text, Rect, Circle, Image as KonvaImage, Transformer, Group } from 'react-konva';
import useImage from 'use-image';
import { 
  Type, 
  Square, 
  Circle as CircleIcon, 
  Image as ImageIcon, 
  Save, 
  Trash2, 
  Move, 
  Layers,
  ChevronLeft,
  X,
  Plus,
  Settings,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CertificateTemplate } from '../types';

interface Element {
  id: string;
  type: 'text' | 'rect' | 'circle' | 'image';
  x: number;
  y: number;
  width?: number;
  height?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontStyle?: string;
  align?: string;
  src?: string;
  radius?: number;
  rotation?: number;
  opacity?: number;
}

interface CertificateBuilderProps {
  template: CertificateTemplate;
  onSave: (canvasData: string) => void;
  onClose: () => void;
}

const URLImage = ({ src, x, y, width, height, id, onSelect, isSelected }: any) => {
  const [image] = useImage(src, 'anonymous');
  return (
    <KonvaImage
      image={image}
      x={x}
      y={y}
      width={width}
      height={height}
      id={id}
      onClick={onSelect}
      onTap={onSelect}
      draggable
    />
  );
};

const CertificateBuilder: React.FC<CertificateBuilderProps> = ({ template, onSave, onClose }) => {
  const [elements, setElements] = useState<Element[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [bgImage] = useImage(template.backgroundUrl || '', 'anonymous');
  const stageRef = useRef<any>(null);
  const transformerRef = useRef<any>(null);

  useEffect(() => {
    if (template.canvasData) {
      try {
        setElements(JSON.parse(template.canvasData));
      } catch (e) {
        console.error('Failed to parse canvas data', e);
      }
    }
  }, [template.canvasData]);

  useEffect(() => {
    if (selectedId && transformerRef.current) {
      const selectedNode = stageRef.current.findOne('#' + selectedId);
      if (selectedNode) {
        transformerRef.current.nodes([selectedNode]);
        transformerRef.current.getLayer().batchDraw();
      }
    }
  }, [selectedId]);

  const addText = () => {
    const newElement: Element = {
      id: `text-${Date.now()}`,
      type: 'text',
      x: 100,
      y: 100,
      text: 'New Text',
      fontSize: 24,
      fontFamily: 'serif',
      fill: '#000000',
      rotation: 0,
      opacity: 1
    };
    setElements([...elements, newElement]);
    setSelectedId(newElement.id);
  };

  const addRect = () => {
    const newElement: Element = {
      id: `rect-${Date.now()}`,
      type: 'rect',
      x: 100,
      y: 100,
      width: 100,
      height: 100,
      fill: '#3b82f6',
      opacity: 0.5,
      rotation: 0
    };
    setElements([...elements, newElement]);
    setSelectedId(newElement.id);
  };

  const addCircle = () => {
    const newElement: Element = {
      id: `circle-${Date.now()}`,
      type: 'circle',
      x: 150,
      y: 150,
      radius: 50,
      fill: '#ef4444',
      opacity: 0.5,
      rotation: 0
    };
    setElements([...elements, newElement]);
    setSelectedId(newElement.id);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const addImage = (url: string) => {
    const newElement: Element = {
      id: `image-${Date.now()}`,
      type: 'image',
      x: 100,
      y: 100,
      width: 100,
      height: 100,
      src: url,
      rotation: 0,
      opacity: 1
    };
    setElements([...elements, newElement]);
    setSelectedId(newElement.id);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          addImage(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragEnd = (e: any) => {
    const id = e.target.id();
    const newElements = elements.map(el => {
      if (el.id === id) {
        return {
          ...el,
          x: e.target.x(),
          y: e.target.y()
        };
      }
      return el;
    });
    setElements(newElements);
  };

  const handleTransformEnd = (e: any) => {
    const id = e.target.id();
    const node = e.target;
    const newElements = elements.map(el => {
      if (el.id === id) {
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        node.scaleX(1);
        node.scaleY(1);
        
        const updated: any = {
          ...el,
          x: node.x(),
          y: node.y(),
          rotation: node.rotation()
        };

        if (el.type === 'rect' || el.type === 'image') {
          updated.width = Math.max(5, node.width() * scaleX);
          updated.height = Math.max(5, node.height() * scaleY);
        } else if (el.type === 'circle') {
          updated.radius = Math.max(5, (node.width() * scaleX) / 2);
        } else if (el.type === 'text') {
          updated.fontSize = Math.max(5, el.fontSize! * scaleX);
        }
        return updated;
      }
      return el;
    });
    setElements(newElements);
  };

  const deleteSelected = () => {
    if (selectedId) {
      setElements(elements.filter(el => el.id !== selectedId));
      setSelectedId(null);
    }
  };

  const handleSave = () => {
    onSave(JSON.stringify(elements));
  };

  const selectedElement = elements.find(el => el.id === selectedId);

  const updateSelected = (updates: Partial<Element>) => {
    if (selectedId) {
      setElements(elements.map(el => el.id === selectedId ? { ...el, ...updates } : el));
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <div className="h-16 border-b border-border flex items-center justify-between px-6 bg-card">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 hover:bg-muted/10 rounded-lg transition-colors">
            <ChevronLeft size={20} />
          </button>
          <div>
            <h2 className="font-bold text-foreground">Certificate Builder</h2>
            <p className="text-xs text-muted">{template.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleSave}
            className="px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary/90 transition-all flex items-center gap-2 shadow-lg shadow-secondary/20"
          >
            <Save size={18} />
            Save Template
          </button>
          <button onClick={onClose} className="p-2 hover:bg-destructive/10 text-muted hover:text-destructive rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Toolbar */}
        <div className="w-64 border-r border-border bg-card flex flex-col overflow-y-auto">
          <div className="p-4 space-y-4">
            <h3 className="text-xs font-bold text-muted uppercase tracking-widest">Add Elements</h3>
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={addText}
                className="flex flex-col items-center justify-center gap-2 p-4 bg-muted/5 border border-border rounded-xl hover:border-secondary/50 hover:text-secondary transition-all"
              >
                <Type size={20} />
                <span className="text-[10px] font-bold uppercase">Text</span>
              </button>
              <button 
                onClick={addRect}
                className="flex flex-col items-center justify-center gap-2 p-4 bg-muted/5 border border-border rounded-xl hover:border-secondary/50 hover:text-secondary transition-all"
              >
                <Square size={20} />
                <span className="text-[10px] font-bold uppercase">Rectangle</span>
              </button>
              <button 
                onClick={addCircle}
                className="flex flex-col items-center justify-center gap-2 p-4 bg-muted/5 border border-border rounded-xl hover:border-secondary/50 hover:text-secondary transition-all"
              >
                <CircleIcon size={20} />
                <span className="text-[10px] font-bold uppercase">Circle</span>
              </button>
              <button 
                onClick={() => {
                  fileInputRef.current?.click();
                }}
                className="flex flex-col items-center justify-center gap-2 p-4 bg-muted/5 border border-border rounded-xl hover:border-secondary/50 hover:text-secondary transition-all"
              >
                <ImageIcon size={20} />
                <span className="text-[10px] font-bold uppercase">Upload Logo</span>
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                className="hidden" 
                accept="image/*"
              />
            </div>

            <div className="pt-4 space-y-4">
              <h3 className="text-xs font-bold text-muted uppercase tracking-widest">Placeholders</h3>
              <div className="space-y-2">
                {[
                  { label: 'Student Name', value: '{{studentName}}' },
                  { label: 'Course Name', value: '{{courseName}}' },
                  { label: 'Issue Date', value: '{{date}}' },
                  { label: 'Certificate ID', value: '{{certificateId}}' },
                  { label: 'Grade', value: '{{grade}}' },
                  { label: 'Score', value: '{{score}}' },
                  { label: 'Institute Name', value: '{{instituteName}}' },
                  { label: 'QR Code', value: '{{qrCode}}' },
                ].map((ph) => (
                  <button
                    key={ph.value}
                    onClick={() => {
                      const newElement: Element = {
                        id: `text-${Date.now()}`,
                        type: 'text',
                        x: 100,
                        y: 100,
                        text: ph.value,
                        fontSize: 24,
                        fontFamily: 'serif',
                        fill: '#000000',
                        rotation: 0,
                        opacity: 1
                      };
                      setElements([...elements, newElement]);
                      setSelectedId(newElement.id);
                    }}
                    className="w-full text-left px-3 py-2 bg-muted/5 border border-border rounded-lg text-[11px] hover:border-secondary/50 transition-all flex items-center justify-between group"
                  >
                    <span>{ph.label}</span>
                    <Plus size={12} className="text-muted group-hover:text-secondary" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 bg-muted/10 flex items-center justify-center p-8 overflow-auto relative">
          <div className="bg-white shadow-2xl relative" style={{ width: 800, height: 600 }}>
            <Stage
              width={800}
              height={600}
              ref={stageRef}
              onMouseDown={(e) => {
                if (e.target === e.target.getStage()) {
                  setSelectedId(null);
                }
              }}
            >
              <Layer>
                {bgImage && (
                  <KonvaImage
                    image={bgImage}
                    width={800}
                    height={600}
                    listening={false}
                  />
                )}
                {elements.map((el) => {
                  if (el.type === 'text') {
                    const isQRCode = el.text === '{{qrCode}}';
                    if (isQRCode) {
                      return (
                        <Group
                          key={el.id}
                          x={el.x}
                          y={el.y}
                          draggable
                          onDragEnd={handleDragEnd}
                          onClick={() => setSelectedId(el.id)}
                          onTap={() => setSelectedId(el.id)}
                          onTransformEnd={handleTransformEnd}
                        >
                          <Rect
                            width={80}
                            height={80}
                            fill="#eee"
                            stroke="#ccc"
                            strokeWidth={1}
                          />
                          <Text
                            text="QR CODE"
                            fontSize={10}
                            width={80}
                            height={80}
                            align="center"
                            verticalAlign="middle"
                            fill="#666"
                          />
                        </Group>
                      );
                    }
                    return (
                      <Text
                        key={el.id}
                        {...el}
                        draggable
                        onDragEnd={handleDragEnd}
                        onClick={() => setSelectedId(el.id)}
                        onTap={() => setSelectedId(el.id)}
                        onTransformEnd={handleTransformEnd}
                      />
                    );
                  }
                  if (el.type === 'rect') {
                    return (
                      <Rect
                        key={el.id}
                        {...el}
                        draggable
                        onDragEnd={handleDragEnd}
                        onClick={() => setSelectedId(el.id)}
                        onTap={() => setSelectedId(el.id)}
                        onTransformEnd={handleTransformEnd}
                      />
                    );
                  }
                  if (el.type === 'circle') {
                    return (
                      <Circle
                        key={el.id}
                        {...el}
                        draggable
                        onDragEnd={handleDragEnd}
                        onClick={() => setSelectedId(el.id)}
                        onTap={() => setSelectedId(el.id)}
                        onTransformEnd={handleTransformEnd}
                      />
                    );
                  }
                  if (el.type === 'image') {
                    return (
                      <URLImage
                        key={el.id}
                        {...el}
                        onSelect={() => setSelectedId(el.id)}
                      />
                    );
                  }
                  return null;
                })}
                <Transformer
                  ref={transformerRef}
                  boundBoxFunc={(oldBox, newBox) => {
                    if (newBox.width < 5 || newBox.height < 5) {
                      return oldBox;
                    }
                    return newBox;
                  }}
                />
              </Layer>
            </Stage>
          </div>

          {/* Canvas Controls */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 p-2 bg-card border border-border rounded-2xl shadow-xl">
            <button className="p-2 hover:bg-muted/10 rounded-lg text-muted hover:text-foreground transition-colors" title="Zoom In">
              <Plus size={20} />
            </button>
            <div className="w-px h-4 bg-border mx-1" />
            <span className="text-xs font-bold px-2">100%</span>
            <div className="w-px h-4 bg-border mx-1" />
            <button className="p-2 hover:bg-muted/10 rounded-lg text-muted hover:text-foreground transition-colors" title="Zoom Out">
              <X size={20} className="rotate-45" />
            </button>
          </div>
        </div>

        {/* Right Properties Panel */}
        <div className="w-72 border-l border-border bg-card flex flex-col overflow-y-auto">
          {selectedElement ? (
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-muted uppercase tracking-widest">Properties</h3>
                <button 
                  onClick={deleteSelected}
                  className="p-2 text-muted hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="space-y-4">
                {selectedElement.type === 'text' && (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-muted uppercase">Text Content</label>
                      <textarea 
                        value={selectedElement.text}
                        onChange={(e) => updateSelected({ text: e.target.value })}
                        className="w-full px-3 py-2 bg-muted/5 border border-border rounded-lg text-sm focus:outline-none focus:border-secondary min-h-[80px]"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-muted uppercase">Font Size</label>
                        <input 
                          type="number"
                          value={Math.round(selectedElement.fontSize || 24)}
                          onChange={(e) => updateSelected({ fontSize: parseInt(e.target.value) })}
                          className="w-full px-3 py-2 bg-muted/5 border border-border rounded-lg text-sm focus:outline-none focus:border-secondary"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-muted uppercase">Color</label>
                        <input 
                          type="color"
                          value={selectedElement.fill}
                          onChange={(e) => updateSelected({ fill: e.target.value })}
                          className="w-full h-10 p-1 bg-muted/5 border border-border rounded-lg cursor-pointer"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-muted uppercase">Font Family</label>
                      <select 
                        value={selectedElement.fontFamily}
                        onChange={(e) => updateSelected({ fontFamily: e.target.value })}
                        className="w-full px-3 py-2 bg-muted/5 border border-border rounded-lg text-sm focus:outline-none focus:border-secondary"
                      >
                        <option value="serif">Serif</option>
                        <option value="sans-serif">Sans-Serif</option>
                        <option value="monospace">Monospace</option>
                        <option value="cursive">Cursive</option>
                      </select>
                    </div>
                  </>
                )}

                {(selectedElement.type === 'rect' || selectedElement.type === 'circle') && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-muted uppercase">Fill Color</label>
                      <input 
                        type="color"
                        value={selectedElement.fill}
                        onChange={(e) => updateSelected({ fill: e.target.value })}
                        className="w-full h-10 p-1 bg-muted/5 border border-border rounded-lg cursor-pointer"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-muted uppercase">Opacity</label>
                      <input 
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={selectedElement.opacity}
                        onChange={(e) => updateSelected({ opacity: parseFloat(e.target.value) })}
                        className="w-full"
                      />
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-border space-y-4">
                  <h4 className="text-[10px] font-bold text-muted uppercase">Position & Size</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] text-muted uppercase">X Position</label>
                      <input 
                        type="number"
                        value={Math.round(selectedElement.x)}
                        onChange={(e) => updateSelected({ x: parseInt(e.target.value) })}
                        className="w-full px-2 py-1 bg-muted/5 border border-border rounded text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-muted uppercase">Y Position</label>
                      <input 
                        type="number"
                        value={Math.round(selectedElement.y)}
                        onChange={(e) => updateSelected({ y: parseInt(e.target.value) })}
                        className="w-full px-2 py-1 bg-muted/5 border border-border rounded text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-muted/10 flex items-center justify-center text-muted">
                <Settings size={24} />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">No Selection</p>
                <p className="text-xs text-muted">Select an element on the canvas to edit its properties.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CertificateBuilder;
