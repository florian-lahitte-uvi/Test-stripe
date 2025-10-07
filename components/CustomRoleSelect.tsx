import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Users, Heart, Stethoscope } from 'lucide-react';

interface RoleOption {
  value: 'Parent' | 'Family' | 'Medical';
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  description: string;
}

interface CustomRoleSelectProps {
  value: string;
  onChange: (value: 'Parent' | 'Family' | 'Medical') => void;
  error?: boolean;
  className?: string;
}

const roleOptions: RoleOption[] = [
  {
    value: 'Parent',
    label: 'Parent',
    icon: Users,
    description: 'Primary caregiver or guardian'
  },
  {
    value: 'Family',
    label: 'Family',
    icon: Heart,
    description: 'Family member or relative'
  },
  {
    value: 'Medical',
    label: 'Medical',
    icon: Stethoscope,
    description: 'Healthcare professional'
  }
];

export default function CustomRoleSelect({ value, onChange, error = false, className = '' }: CustomRoleSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = roleOptions.find(option => option.value === value) || roleOptions[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Dropdown Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-1 transition-all duration-200 flex items-center justify-between ${
          error 
            ? 'border-red-400 focus:border-red-500 focus:ring-red-200' 
            : 'border-gray-300 focus:border-teal-500 focus:ring-teal-200 hover:border-gray-400'
        } ${isOpen ? 'ring-1 ring-teal-200' : ''}`}
      >
        <div className="flex items-center space-x-3">
          <selectedOption.icon size={18} className="text-gray-600" />
          <span className="text-gray-700">{selectedOption.label}</span>
        </div>
        <ChevronDown 
          size={18} 
          className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
          {roleOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`w-full px-4 py-3 flex items-center space-x-3 hover:bg-gray-50 transition-colors text-left ${
                value === option.value ? 'bg-teal-50 border-l-4 border-teal-500' : ''
              }`}
            >
              <option.icon 
                size={18} 
                className={`${value === option.value ? 'text-teal-600' : 'text-gray-500'}`} 
              />
              <div className="flex-1">
                <div className={`font-medium ${value === option.value ? 'text-teal-700' : 'text-gray-700'}`}>
                  {option.label}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {option.description}
                </div>
              </div>
              {value === option.value && (
                <div className="w-2 h-2 bg-teal-500 rounded-full" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}