import { useState, useEffect, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Entity } from '@/types/ontology';

interface SearchPanelProps {
  onSearch: (query: string) => Entity[];
  onSelectEntity: (entity: Entity) => void;
}

export function SearchPanel({ onSearch, onSelectEntity }: SearchPanelProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Entity[]>([]);
  const [showResults, setShowResults] = useState(false);

  const handleSearch = useCallback((searchQuery: string) => {
    setQuery(searchQuery);
    if (searchQuery.trim()) {
      const searchResults = onSearch(searchQuery);
      setResults(searchResults);
      setShowResults(true);
    } else {
      setResults([]);
      setShowResults(false);
    }
  }, [onSearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleSearch(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, handleSearch]);

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setShowResults(false);
  };

  const handleSelect = (entity: Entity) => {
    onSelectEntity(entity);
    setShowResults(false);
    setQuery(entity.name);
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            type="text"
            placeholder="搜索实体、定义、领域..."
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10 pr-10"
          />
          {query && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {showResults && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-popover border rounded-lg shadow-lg z-50">
          <ScrollArea className="max-h-[400px]">
            <div className="p-2">
              <div className="text-xs text-muted-foreground px-3 py-2">
                找到 {results.length} 个结果
              </div>
              {results.map((entity) => (
                <button
                  key={entity.id}
                  onClick={() => handleSelect(entity)}
                  className="w-full text-left px-3 py-3 hover:bg-muted rounded-lg transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{entity.name}</span>
                    <div className="flex gap-1">
                      <Badge variant="outline" className="text-xs">
                        {entity.type}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {entity.domain}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {entity.definition}
                  </p>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {showResults && query && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-popover border rounded-lg shadow-lg z-50 p-4 text-center text-muted-foreground">
          未找到匹配的结果
        </div>
      )}
    </div>
  );
}
