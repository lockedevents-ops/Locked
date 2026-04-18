"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface AccordionItemProps {
  id: string;
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

interface MobileAccordionProps {
  items: AccordionItemProps[];
  singleOpen?: boolean; // Only allow one item open at a time (Facebook-like behavior)
}

export function MobileAccordion({ items, singleOpen = true }: MobileAccordionProps) {
  const [openItems, setOpenItems] = useState<Set<string>>(
    new Set(items.filter(item => item.defaultOpen).map(item => item.id))
  );

  const toggleItem = (itemId: string) => {
    if (singleOpen) {
      // Close all items and open only the selected one
      setOpenItems(openItems.has(itemId) ? new Set() : new Set([itemId]));
    } else {
      // Toggle individual items
      const newOpenItems = new Set(openItems);
      if (newOpenItems.has(itemId)) {
        newOpenItems.delete(itemId);
      } else {
        newOpenItems.add(itemId);
      }
      setOpenItems(newOpenItems);
    }
  };

  return (
    <div className="space-y-4">
      {items.map((item) => {
        const isOpen = openItems.has(item.id);
        
        return (
          <div key={item.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => toggleItem(item.id)}
              className="w-full px-4 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                {item.icon && (
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-primary">
                    {item.icon}
                  </div>
                )}
                <span className="font-semibold text-gray-900">{item.title}</span>
              </div>
              {isOpen ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </button>
            
            {isOpen && (
              <div className="px-4 pb-4 border-t border-gray-100">
                <div className="pt-4">
                  {item.children}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function MobileAccordionItem({ children }: { children: React.ReactNode }) {
  return <div className="space-y-4">{children}</div>;
}

export function MobileSettingRow({ 
  title, 
  description, 
  action,
  warning 
}: { 
  title: string;
  description?: string;
  action: React.ReactNode;
  warning?: string;
}) {
  return (
    <div className="flex items-start justify-between py-3">
      <div className="flex-1 mr-4">
        <p className="font-medium text-gray-900 text-sm">{title}</p>
        {description && <p className="text-sm text-gray-600 mt-1">{description}</p>}
        {warning && (
          <p className="text-xs text-amber-600 mt-1 bg-amber-50 p-2 rounded">
            {warning}
          </p>
        )}
      </div>
      <div className="flex-shrink-0">
        {action}
      </div>
    </div>
  );
}

export function MobileToggleSwitch({ 
  checked, 
  onChange, 
  disabled = false 
}: { 
  checked: boolean; 
  onChange: () => void; 
  disabled?: boolean 
}) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        checked ? 'bg-primary' : 'bg-gray-200'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

export function MobileButton({
  children,
  onClick,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  className = ''
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  className?: string;
}) {
  const baseClasses = 'rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variantClasses = {
    primary: 'bg-primary text-white hover:bg-primary-dark focus:ring-primary',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
  };
  
  const sizeClasses = {
    small: 'px-3 py-2 text-sm',
    medium: 'px-4 py-2.5 text-sm',
    large: 'px-6 py-3 text-base'
  };
  
  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : '';
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${disabledClasses} ${className}`}
    >
      {children}
    </button>
  );
}
