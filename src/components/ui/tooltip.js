import React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from "../../lib/utils";

const TooltipProvider = TooltipPrimitive.Provider;

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      "z-50 overflow-hidden rounded-md border bg-white px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      className
    )}
    {...props}
  />
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

const ContractTooltipContent = ({ item }) => {
  // Parse the objectives array from the JSON string
  const objectives = JSON.parse(item.scope_objectives || '[]');
  
  // Calculate duration in days
  const start = new Date(item.start_date);
  const end = new Date(item.end_date);
  const durationInDays = Math.round((end - start) / (1000 * 60 * 60 * 24));

  // Format currency
  const formatCurrency = (amount) => {
    if (!amount) return 'N/A';
    return amount.startsWith('$') ? amount : `$${amount}`;
  };

  // Format date
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="w-[400px] max-w-[90vw]">
      {/* Header */}
      <div className="mb-4">
        <h3 className="font-bold text-lg text-gray-900 mb-1">{item.scope_title}</h3>
        <p className="text-sm text-gray-500">{item.doc_type}</p>
      </div>

      {/* Key Details Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <span className="font-semibold text-sm text-gray-700">Amount:</span>
          <p className="text-gray-900">{formatCurrency(item.amount)}</p>
        </div>
        <div>
          <span className="font-semibold text-sm text-gray-700">Duration:</span>
          <p className="text-gray-900">{durationInDays} days</p>
        </div>
        <div>
          <span className="font-semibold text-sm text-gray-700">Start:</span>
          <p className="text-gray-900">{formatDate(item.start_date)}</p>
        </div>
        <div>
          <span className="font-semibold text-sm text-gray-700">End:</span>
          <p className="text-gray-900">{formatDate(item.end_date)}</p>
        </div>
      </div>

      {/* Reference */}
      <div className="mb-4">
        <span className="font-semibold text-sm text-gray-700">Reference:</span>
        <p className="text-sm text-gray-600 break-words">{item.filename}</p>
      </div>

      {/* Background */}
      {item.scope_background && item.scope_background !== "Not specified." && (
        <div className="mb-4">
          <span className="font-semibold text-sm text-gray-700">Background:</span>
          <p className="text-sm text-gray-600 mt-1 line-clamp-3">{item.scope_background}</p>
        </div>
      )}

      {/* Objectives/Deliverables */}
      {objectives && objectives.length > 0 && (
        <div>
          <span className="font-semibold text-sm text-gray-700">Deliverables:</span>
          <div className="mt-2 max-h-60 overflow-y-auto">
            <ul className="list-disc pl-5 space-y-1">
              {objectives.map((objective, idx) => (
                <li key={idx} className="text-sm text-gray-600">{objective}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

// Example usage component
const ContractTooltip = ({ item, children }) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent>
          <ContractTooltipContent item={item} />
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
  ContractTooltipContent,
  ContractTooltip
};