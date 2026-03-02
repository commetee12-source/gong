import React from 'react';

interface DocumentEditorProps {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  placeholder?: string;
  height?: string;
  className?: string;
}

export const DocumentEditor: React.FC<DocumentEditorProps> = ({ 
  label, 
  value, 
  onChange, 
  readOnly = false,
  placeholder,
  height = "h-64",
  className = ""
}) => {
  return (
    <div className={`flex flex-col h-full ${className}`}>
      <div className="flex justify-between items-center mb-2">
        <label className="block text-sm font-bold text-admin-900 uppercase tracking-wide">
          {label}
        </label>
      </div>
      <textarea
        className={`w-full ${height} p-4 text-sm text-gray-800 border border-admin-200 rounded-lg bg-white focus:ring-2 focus:ring-admin-500 focus:border-admin-500 outline-none resize-none font-sans leading-relaxed shadow-inner`}
        value={value}
        onChange={(e) => onChange && onChange(e.target.value)}
        readOnly={readOnly}
        placeholder={placeholder}
      />
    </div>
  );
};
