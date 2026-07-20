'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Filter, Plus, X, ChevronDown } from 'lucide-react'

export type FilterCondition = {
  id: string
  field: string
  operator: string
  value: any
}

type FilterBarProps = {
  filters: FilterCondition[]
  setFilters: (filters: FilterCondition[]) => void
}

const FILTER_FIELDS = [
  { id: 'owner', label: 'Owner', type: 'text' },
  { id: 'contributors', label: 'Contributors', type: 'text' },
  { id: 'reviewer', label: 'Reviewer', type: 'text' },
  { id: 'review_status', label: 'Review Status', type: 'select', options: ['PENDING', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED'] },
  { id: 'status', label: 'Document Status', type: 'select', options: ['DRAFT', 'PUBLISHED', 'PRIVATE'] },
  { id: 'favorites', label: 'Favorites', type: 'boolean' },
  { id: 'archived', label: 'Archived', type: 'boolean' },
  { id: 'created_date', label: 'Created Date', type: 'date' },
  { id: 'updated_date', label: 'Updated Date', type: 'date' },
  { id: 'folder', label: 'Folder', type: 'text' },
  { id: 'workspace', label: 'Space', type: 'text' },
  { id: 'tags', label: 'Tags', type: 'text' },
]

const getOperators = (type: string) => {
  switch (type) {
    case 'text':
      return [
        { value: 'is', label: 'Is' },
        { value: 'is_not', label: 'Is not' },
        { value: 'contains', label: 'Contains' },
        { value: 'not_contains', label: 'Does not contain' }
      ]
    case 'select':
    case 'boolean':
      return [
        { value: 'eq', label: 'Is' },
        { value: 'neq', label: 'Is not' }
      ]
    case 'date':
      return [
        { value: 'eq', label: 'Is' },
        { value: 'before', label: 'Is before' },
        { value: 'after', label: 'Is after' }
      ]
    default:
      return [{ value: 'eq', label: 'Is' }]
  }
}

export function FilterBar({ filters, setFilters }: FilterBarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const addFilter = () => {
    const availableField = FILTER_FIELDS.find(f => !filters.some(active => active.field === f.id)) || FILTER_FIELDS[0]
    setFilters([
      ...filters,
      {
        id: Math.random().toString(36).substr(2, 9),
        field: availableField.id,
        operator: getOperators(availableField.type)[0].value,
        value: availableField.type === 'boolean' ? true : ''
      }
    ])
  }

  const removeFilter = (id: string) => {
    setFilters(filters.filter(f => f.id !== id))
  }

  const updateFilter = (id: string, updates: Partial<FilterCondition>) => {
    setFilters(filters.map(f => {
      if (f.id === id) {
        const nextFilter = { ...f, ...updates }
        // If field changed, reset operator and value appropriately
        if (updates.field && updates.field !== f.field) {
          const fieldDef = FILTER_FIELDS.find(field => field.id === updates.field)
          nextFilter.operator = getOperators(fieldDef?.type || 'text')[0].value
          nextFilter.value = fieldDef?.type === 'boolean' ? true : ''
        }
        return nextFilter
      }
      return f
    }))
  }

  const clearAll = () => {
    setFilters([])
    setIsOpen(false)
  }

  return (
    <div className="relative flex items-center" ref={popoverRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-semibold transition-all ${
          filters.length > 0 
            ? 'bg-[#78C6C9]/12 border-[#78C6C9]/45 text-[#256D85] shadow-sm' 
            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
        }`}
      >
        <Filter className="w-4 h-4" /> 
        Filter {filters.length > 0 && <span className="ml-1 px-1.5 py-0.5 bg-[#78C6C9]/18 rounded text-xs">{filters.length}</span>}
      </button>
      
      {isOpen && (
        <div className="premium-card absolute top-full left-0 mt-2 w-[640px] max-w-[90vw] rounded-2xl z-50 p-4 animate-doc-fade-up">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800">Filters</h3>
            {filters.length > 0 && (
              <button onClick={clearAll} className="text-xs text-slate-400 hover:text-slate-600 transition">
                Clear all
              </button>
            )}
          </div>

          <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto">
            {filters.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">No active filters</div>
            ) : (
              filters.map((filter, index) => {
                const fieldDef = FILTER_FIELDS.find(f => f.id === filter.field)
                const operators = getOperators(fieldDef?.type || 'text')
                
                return (
                  <div key={filter.id} className="flex items-center gap-2 group">
                    <span className="text-xs font-medium text-slate-400 w-10 shrink-0 uppercase tracking-wider">
                      {index === 0 ? 'Where' : 'And'}
                    </span>
                    
                    {/* Field Selector */}
                    <div className="relative flex-1">
                      <select 
                        value={filter.field}
                        onChange={(e) => updateFilter(filter.id, { field: e.target.value })}
                        className="premium-control w-full appearance-none rounded-lg bg-slate-50 px-3 py-1.5 text-sm text-slate-700 outline-none cursor-pointer"
                      >
                        {FILTER_FIELDS.map(f => (
                          <option key={f.id} value={f.id}>{f.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                    
                    {/* Operator Selector */}
                    <div className="relative w-36 shrink-0">
                      <select 
                        value={filter.operator}
                        onChange={(e) => updateFilter(filter.id, { operator: e.target.value })}
                        className="premium-control w-full appearance-none rounded-lg bg-slate-50 px-3 py-1.5 text-sm text-slate-700 outline-none cursor-pointer"
                      >
                        {operators.map(op => (
                          <option key={op.value} value={op.value}>{op.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>

                    {/* Value Input */}
                    <div className="flex-1">
                      {fieldDef?.type === 'select' ? (
                        <div className="relative">
                          <select 
                            value={filter.value} 
                            onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                            className="premium-control w-full appearance-none rounded-lg px-3 py-1.5 text-sm text-slate-700 outline-none cursor-pointer"
                          >
                            <option value="">Select value...</option>
                            {fieldDef.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      ) : fieldDef?.type === 'boolean' ? (
                        <div className="relative">
                          <select 
                            value={String(filter.value)} 
                            onChange={(e) => updateFilter(filter.id, { value: e.target.value === 'true' })}
                            className="premium-control w-full appearance-none rounded-lg px-3 py-1.5 text-sm text-slate-700 outline-none cursor-pointer"
                          >
                            <option value="true">True</option>
                            <option value="false">False</option>
                          </select>
                          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      ) : fieldDef?.type === 'date' ? (
                        <input 
                          type="date"
                          value={filter.value}
                          onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                          className="premium-control w-full rounded-lg px-3 py-1.5 text-sm text-slate-700 outline-none"
                        />
                      ) : (
                        <input 
                          type="text"
                          value={filter.value}
                          onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                          placeholder="Enter value..."
                          className="premium-control w-full rounded-lg px-3 py-1.5 text-sm text-slate-700 outline-none placeholder:text-slate-300"
                        />
                      )}
                    </div>
                    
                    <button 
                      onClick={() => removeFilter(filter.id)} 
                      className="p-1.5 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-lg opacity-0 group-hover:opacity-100 transition-all shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )
              })
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <button 
              onClick={addFilter}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 hover:text-[#256D85] hover:bg-[#78C6C9]/14 rounded-lg transition font-medium"
            >
              <Plus className="w-4 h-4" /> Add filter
            </button>
            <button 
              onClick={() => setIsOpen(false)}
              className="arctic-primary px-4 py-1.5 text-sm font-medium rounded-lg transition"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
