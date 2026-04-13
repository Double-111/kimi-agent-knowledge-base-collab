import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Maximize2, Network } from 'lucide-react';
import type { Entity, CrossReference, KnowledgeLayer } from '@/types/ontology';

interface KnowledgeGraphProps {
  entities: Entity[];
  crossReferences: CrossReference[];
  onSelectEntity: (entity: Entity) => void;
  selectedEntityId?: string;
}

interface Node {
  id: string;
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  entity: Entity;
}

interface Link {
  source: string;
  target: string;
  relation: string;
}

export function KnowledgeGraph({ 
  entities, 
  crossReferences, 
  onSelectEntity, 
  selectedEntityId 
}: KnowledgeGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);

  const width = 800;
  const height = 600;
  const initialOrbitRadius = Math.min(260, 180 + entities.length * 4);
  const repulsionStrength = 2800;
  const targetLinkDistance = 135;
  const springStrength = 0.006;
  const centerPullStrength = 0.0005;
  const velocityDamping = 0.86;
  const palette = ['#2563eb', '#7c3aed', '#059669', '#ea580c', '#db2777', '#0f766e', '#4f46e5', '#ca8a04'];
  const uniqueDomains = [...new Set(entities.map((entity) => entity.domain).filter(Boolean))];
  const domainColors = uniqueDomains.reduce<Record<string, string>>((accumulator, domain, index) => {
    accumulator[domain] = palette[index % palette.length];
    return accumulator;
  }, {});
  const layerStrokeColors: Record<KnowledgeLayer, string> = {
    common: '#0f766e',
    domain: '#334155',
    private: '#e11d48',
  };
  const layerLabels: Record<KnowledgeLayer, string> = {
    common: 'Common',
    domain: 'Domain',
    private: 'Private',
  };

  // 初始化节点和链接
  useEffect(() => {
    if (entities.length === 0) {
      setNodes([]);
      setLinks([]);
      return;
    }

    // 创建节点
    const initialNodes: Node[] = entities.map((entity, index) => {
      const angle = (index / entities.length) * 2 * Math.PI;
      return {
        id: entity.id,
        name: entity.name,
        x: width / 2 + Math.cos(angle) * initialOrbitRadius,
        y: height / 2 + Math.sin(angle) * initialOrbitRadius,
        vx: 0,
        vy: 0,
        radius: entity.id === selectedEntityId ? 25 : 18,
        color: domainColors[entity.domain] || '#6b7280',
        entity: entity
      };
    });

    // 创建链接
    const initialLinks: Link[] = crossReferences.map(ref => ({
      source: ref.source,
      target: ref.target,
      relation: ref.relation
    }));

    setNodes(initialNodes);
    setLinks(initialLinks);
  }, [entities, crossReferences, selectedEntityId]);

  // 力导向模拟
  useEffect(() => {
    if (nodes.length === 0) return;

    const simulation = setInterval(() => {
      setNodes(prevNodes => {
        const newNodes = [...prevNodes];
        
        // 节点间斥力
        for (let i = 0; i < newNodes.length; i++) {
          for (let j = i + 1; j < newNodes.length; j++) {
            const dx = newNodes[j].x - newNodes[i].x;
            const dy = newNodes[j].y - newNodes[i].y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = repulsionStrength / (dist * dist);
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            
            newNodes[i].vx -= fx;
            newNodes[i].vy -= fy;
            newNodes[j].vx += fx;
            newNodes[j].vy += fy;
          }
        }

        // 链接引力
        links.forEach(link => {
          const sourceNode = newNodes.find(n => n.id === link.source);
          const targetNode = newNodes.find(n => n.id === link.target);
          if (sourceNode && targetNode) {
            const dx = targetNode.x - sourceNode.x;
            const dy = targetNode.y - sourceNode.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = (dist - targetLinkDistance) * springStrength;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            
            sourceNode.vx += fx;
            sourceNode.vy += fy;
            targetNode.vx -= fx;
            targetNode.vy -= fy;
          }
        });

        // 中心引力
        newNodes.forEach(node => {
          const dx = width / 2 - node.x;
          const dy = height / 2 - node.y;
          node.vx += dx * centerPullStrength;
          node.vy += dy * centerPullStrength;
        });

        // 更新位置
        newNodes.forEach(node => {
          if (node.id !== draggedNode) {
            node.vx *= velocityDamping; // 阻尼
            node.vy *= velocityDamping;
            node.x += node.vx;
            node.y += node.vy;
            
            // 边界限制
            node.x = Math.max(node.radius, Math.min(width - node.radius, node.x));
            node.y = Math.max(node.radius, Math.min(height - node.radius, node.y));
          }
        });

        return newNodes;
      });
    }, 16);

    return () => clearInterval(simulation);
  }, [links, draggedNode]);

  const handleMouseDown = (nodeId: string) => {
    setIsDragging(true);
    setDraggedNode(nodeId);
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDragging || !draggedNode || !svgRef.current) return;
    
    const rect = svgRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - translate.x) / scale;
    const y = (e.clientY - rect.top - translate.y) / scale;
    
    setNodes(prevNodes => 
      prevNodes.map(node => 
        node.id === draggedNode 
          ? { ...node, x, y, vx: 0, vy: 0 }
          : node
      )
    );
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDraggedNode(null);
  };

  const handleZoomIn = () => setScale(s => Math.min(s * 1.2, 3));
  const handleZoomOut = () => setScale(s => Math.max(s / 1.2, 0.3));
  const handleReset = () => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Network className="w-5 h-5" />
            知识图谱
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={handleZoomOut}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleReset}>
              <Maximize2 className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleZoomIn}>
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative overflow-hidden border-t">
          <svg
            ref={svgRef}
            width={width}
            height={height}
            className="cursor-grab active:cursor-grabbing"
            style={{
              transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
              transformOrigin: 'center'
            }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* 背景网格 */}
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="1" fill="#e5e7eb" />
              </pattern>
            </defs>
            <rect width={width} height={height} fill="url(#grid)" />

            {/* 链接 */}
            {links.map((link, index) => {
              const sourceNode = nodes.find(n => n.id === link.source);
              const targetNode = nodes.find(n => n.id === link.target);
              if (!sourceNode || !targetNode) return null;
              
              return (
                <g key={index}>
                  <line
                    x1={sourceNode.x}
                    y1={sourceNode.y}
                    x2={targetNode.x}
                    y2={targetNode.y}
                    stroke="#9ca3af"
                    strokeWidth={2}
                    strokeOpacity={0.6}
                  />
                  {/* 关系标签 */}
                  <text
                    x={(sourceNode.x + targetNode.x) / 2}
                    y={(sourceNode.y + targetNode.y) / 2}
                    textAnchor="middle"
                    className="text-xs fill-gray-500"
                    style={{ fontSize: '10px' }}
                  >
                    {link.relation}
                  </text>
                </g>
              );
            })}

            {/* 节点 */}
            {nodes.map(node => (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onMouseDown={() => handleMouseDown(node.id)}
                onClick={() => onSelectEntity(node.entity)}
                className="cursor-pointer"
              >
                {/* 选中光环 */}
                {node.id === selectedEntityId && (
                  <circle
                    r={node.radius + 5}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth={3}
                    strokeDasharray="5,5"
                  />
                )}
                {/* 节点圆圈 */}
                <circle
                  r={node.radius}
                  fill={node.color}
                  stroke={layerStrokeColors[node.entity.layer]}
                  strokeWidth={node.entity.layer === 'private' ? 4 : 2.5}
                  className="hover:opacity-80 transition-opacity"
                />
                <title>
                  {`${node.entity.name}\n领域: ${node.entity.domain}\n存储层: ${layerLabels[node.entity.layer]}\n${node.entity.definition}`}
                </title>
                {/* 节点标签 */}
                <text
                  textAnchor="middle"
                  dy={node.radius + 15}
                  className="text-xs fill-gray-700 font-medium"
                  style={{ fontSize: '11px', pointerEvents: 'none' }}
                >
                  {node.name}
                </text>
              </g>
            ))}
          </svg>
        </div>
        
        {/* 图例 */}
        <div className="p-4 border-t bg-muted/30">
          <div className="flex flex-wrap gap-2">
            {Object.entries(domainColors).map(([domain, color]) => (
              <Badge key={domain} variant="outline" className="flex items-center gap-1">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: color }}
                />
                <span className="text-xs">{domain}</span>
              </Badge>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.entries(layerLabels).map(([layer, label]) => (
              <Badge key={layer} variant={layer === 'private' ? 'destructive' : 'outline'} className="flex items-center gap-1">
                <div
                  className="w-3 h-3 rounded-full border-2 bg-white"
                  style={{ borderColor: layerStrokeColors[layer as KnowledgeLayer] }}
                />
                <span className="text-xs">{label}</span>
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
