import React, { useRef } from 'react';
import { Template, UploadedFile } from '../types';
import { DEFAULT_TEMPLATES } from '../constants';

interface TemplateSelectorProps {
  selectedTemplateStructure: string;
  onSelect: (structure: string) => void;
  templateFile: UploadedFile | null;
  onTemplateFileChange: (file: UploadedFile | null) => void;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({ 
  selectedTemplateStructure, 
  onSelect,
  templateFile,
  onTemplateFileChange
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === 'application/pdf') {
        // Handle PDF: Read as Data URL to pass to API
        const reader = new FileReader();
        reader.onloadend = () => {
             const uploadedFile: UploadedFile = {
                 id: Math.random().toString(36).substring(7),
                 name: file.name,
                 type: file.type,
                 data: reader.result as string,
                 size: file.size
             };
             onTemplateFileChange(uploadedFile);
             onSelect(`[PDF 서식 파일 적용 중]\n파일명: ${file.name}\n\n이 파일의 서식을 분석하여 문서를 작성합니다.`);
        };
        reader.readAsDataURL(file);
      } else {
        // Handle Text/MD/Form: Read as Text for editing
        const reader = new FileReader();
        reader.onload = (e) => {
          const text = e.target?.result as string;
          if (text) {
            onSelect(text);
            onTemplateFileChange(null); // Clear any previous PDF template file
          }
        };
        reader.readAsText(file);
      }
    }
    // Reset value so same file can be selected again if needed
    if (event.target) {
        event.target.value = '';
    }
  };

  const isCustom = !DEFAULT_TEMPLATES.some(t => t.structure === selectedTemplateStructure);
  const isPdfMode = templateFile !== null;

  const handlePresetSelect = (structure: string) => {
    onSelect(structure);
    onTemplateFileChange(null); // Clear template file when selecting a preset
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-end border-b border-gray-200 pb-2">
        <label className="block text-sm font-bold text-admin-900 uppercase tracking-wide">
          문서 서식 선택 (Template)
        </label>
        <div className="flex space-x-2">
            <button
                onClick={() => fileInputRef.current?.click()}
                className="text-xs bg-admin-50 hover:bg-admin-100 text-admin-700 px-3 py-1.5 rounded border border-admin-200 flex items-center transition-colors"
            >
                <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                내 서식 불러오기 (PDF/TXT)
            </button>
             <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".txt,.md,.form,.pdf"
                className="hidden"
            />
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {DEFAULT_TEMPLATES.map((tmpl) => (
          <button
            key={tmpl.id}
            onClick={() => handlePresetSelect(tmpl.structure)}
            className={`text-left p-3 rounded-lg border transition-all duration-200 group relative overflow-hidden ${
              selectedTemplateStructure === tmpl.structure && !isPdfMode
                ? 'bg-admin-600 text-white border-admin-700 shadow-md ring-2 ring-admin-200'
                : 'bg-white text-gray-700 border-admin-200 hover:bg-admin-50 hover:border-admin-300'
            }`}
          >
             <div className="flex justify-between items-start">
                <div className="font-bold text-sm">{tmpl.name}</div>
                {selectedTemplateStructure === tmpl.structure && !isPdfMode && (
                    <svg className="w-4 h-4 text-admin-200" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.291a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
                )}
             </div>
            <div className={`text-xs mt-1 truncate ${selectedTemplateStructure === tmpl.structure && !isPdfMode ? 'text-admin-100' : 'text-gray-400 group-hover:text-gray-600'}`}>
              {tmpl.description}
            </div>
          </button>
        ))}
        
        {/* Custom Template Button */}
        <button
            onClick={() => {
                if (!isCustom) {
                    onSelect(''); 
                    onTemplateFileChange(null);
                }
            }}
            className={`text-left p-3 rounded-lg border border-dashed transition-all duration-200 ${
            isCustom
                ? 'bg-admin-50 text-admin-900 border-admin-400 shadow-sm ring-2 ring-admin-200'
                : 'bg-slate-50 text-gray-500 border-gray-300 hover:bg-gray-100 hover:border-gray-400'
            }`}
        >
            <div className="flex items-center font-bold text-sm">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                {isPdfMode ? 'PDF 서식 파일 적용 중' : '직접 입력 / 사용자 서식'}
            </div>
            <div className="text-xs mt-1 text-gray-500 truncate">
                {isPdfMode 
                    ? `첨부됨: ${templateFile?.name}`
                    : '원하는 서식을 직접 편집하거나 파일을 로드합니다.'
                }
            </div>
        </button>
      </div>

      <div className={`relative rounded-xl border transition-colors duration-200 overflow-hidden ${isCustom ? 'border-admin-400 bg-white ring-4 ring-admin-50' : 'border-gray-200 bg-gray-50'}`}>
        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                {isPdfMode 
                    ? '참조 서식 파일 (텍스트 편집 불가)' 
                    : isCustom 
                        ? '사용자 정의 서식 내용 (편집 가능)' 
                        : '선택된 서식 미리보기 (수정 시 사용자 정의로 전환)'}
            </span>
            {isCustom && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${isPdfMode ? 'bg-red-100 text-red-700' : 'bg-admin-100 text-admin-700'}`}>
                    {isPdfMode ? 'PDF Template Mode' : 'Custom Mode'}
                </span>
            )}
        </div>
        <textarea
            value={selectedTemplateStructure}
            onChange={(e) => !isPdfMode && onSelect(e.target.value)}
            readOnly={isPdfMode}
            className={`w-full h-56 p-4 text-xs font-mono leading-relaxed outline-none resize-none 
                ${isPdfMode ? 'text-gray-500 bg-gray-50 cursor-not-allowed' : isCustom ? 'text-gray-800 bg-white' : 'text-gray-600 bg-gray-50'}`}
            placeholder="[서식 입력란]&#13;&#10;이곳에 원하는 문서 구조를 입력하세요.&#13;&#10;&#13;&#10;예시:&#13;&#10;1. 개요&#13;&#10;2. 주요 내용&#13;&#10;3. 결론"
        />
      </div>
    </div>
  );
};