import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Input } from "@/components/ui/input";
import { X, Search } from "lucide-react";

interface Employee {
  id: string;
  full_name: string;
}

interface EmployeeAutocompleteProps {
  employees: Employee[];
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  selectedEmployeeId: string | null;
  onSelectEmployee: (empId: string, fullName: string) => void;
  onClear: () => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
}

export function EmployeeAutocomplete({
  employees,
  searchQuery,
  onSearchQueryChange,
  selectedEmployeeId,
  onSelectEmployee,
  onClear,
  placeholder = "Personel ara...",
  className = "",
  inputClassName = "",
}: EmployeeAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onSearchQueryChange(val);
    if (val.length > 0) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  const handleClear = () => {
    onClear();
    setIsOpen(false);
  };

  const handleSelect = (emp: Employee) => {
    onSelectEmployee(emp.id, emp.full_name);
    setIsOpen(false);
  };

  // Filter employees
  const filteredEmployees = employees.filter((emp) =>
    emp.full_name.toLocaleLowerCase("tr-TR").includes(searchQuery.toLocaleLowerCase("tr-TR"))
  );

  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (isOpen && wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: 'fixed',
        top: `${rect.bottom + 4}px`,
        left: `${rect.left}px`,
        width: `${rect.width}px`,
        zIndex: 110,
      });
    }
  }, [isOpen, searchQuery, employees]); // Recalculate on relevant changes

  // Update position on scroll/resize
  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      if (wrapperRef.current) {
        const rect = wrapperRef.current.getBoundingClientRect();
        setDropdownStyle({
          position: 'fixed',
          top: `${rect.bottom + 4}px`,
          left: `${rect.left}px`,
          width: `${rect.width}px`,
          zIndex: 110,
        });
      }
    };

    window.addEventListener('scroll', updatePosition, true); // true for capturing phase to catch any scrolling parent
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen]);

  return (
    <div className={`relative ${className}`} ref={wrapperRef}>
      <div className="relative flex items-center">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10" />
        <Input
          placeholder={placeholder}
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={() => {
            if (searchQuery.length > 0) setIsOpen(true);
          }}
          className={`pl-9 pr-9 w-full ${inputClassName || "bg-slate-50 border-slate-200"}`}
        />
        {searchQuery.length > 0 && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isOpen && searchQuery.length > 0 && typeof window !== 'undefined' && document.body && createPortal(
        <div
          className="bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-auto"
          style={dropdownStyle}
        >
          {filteredEmployees.length > 0 ? (
            <ul className="py-1">
              {filteredEmployees.map((emp) => (
                <li
                  key={emp.id}
                  onClick={() => handleSelect(emp)}
                  className={`px-3 py-2 text-sm cursor-pointer hover:bg-slate-100 ${
                    selectedEmployeeId === emp.id ? "bg-slate-50 font-medium text-emerald-700" : "text-slate-700"
                  }`}
                >
                  {emp.full_name}
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-3 py-2 text-sm text-slate-500 text-center">
              Personel bulunamadı.
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}