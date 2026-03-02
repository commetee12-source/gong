import React, { useState, useRef, useEffect } from 'react';
import { FileUpload } from './components/FileUpload';
import { DocumentEditor } from './components/DocumentEditor';
import { TemplateSelector } from './components/TemplateSelector';
import { UploadedFile, ProcessingStatus } from './types';
import { DEFAULT_TEMPLATES } from './constants';
import { generateReport } from './services/geminiService';
import { marked } from 'marked';
import html2pdf from 'html2pdf.js';
import { asBlob } from 'html-docx-js-typescript';

const App: React.FC = () => {
  const [inputFiles, setInputFiles] = useState<UploadedFile[]>([]);
  const [inputText, setInputText] = useState<string>('');
  
  // Template State
  const [templateStructure, setTemplateStructure] = useState<string>(DEFAULT_TEMPLATES[0].structure);
  const [templateFile, setTemplateFile] = useState<UploadedFile | null>(null);

  const [generatedOutput, setGeneratedOutput] = useState<string>('');
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Download menu state
  const [isDownloadMenuOpen, setIsDownloadMenuOpen] = useState(false);
  const downloadMenuRef = useRef<HTMLDivElement>(null);

  // Close download menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target as Node)) {
        setIsDownloadMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleGenerate = async () => {
    if (inputFiles.length === 0 && !inputText.trim()) {
      setErrorMessage("분석할 자료(파일 또는 텍스트)를 입력해주세요.");
      return;
    }

    setStatus('analyzing');
    setErrorMessage(null);
    setGeneratedOutput('');

    try {
      setStatus('generating');
      // Pass templateFile to service
      const result = await generateReport(inputText, inputFiles, templateStructure, templateFile);
      setGeneratedOutput(result);
      setStatus('completed');
    } catch (error) {
      console.error(error);
      setErrorMessage("문서 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
      setStatus('error');
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedOutput);
    alert('클립보드에 복사되었습니다.');
  };

  const getFilename = (extension: string) => {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `report_${date}.${extension}`;
  };

  const downloadReport = async (format: 'md' | 'docx' | 'pdf') => {
    if (!generatedOutput || generatedOutput.trim() === '') {
      alert("다운로드할 내용이 없습니다. 먼저 문서를 생성해 주세요.");
      return;
    }

    // Close menu after a short delay to ensure click is processed
    setTimeout(() => setIsDownloadMenuOpen(false), 100);

    try {
      const filename = getFilename(format);
      const htmlContent = marked.parse(generatedOutput) as string;
      
      if (format === 'md') {
        const blob = new Blob([generatedOutput], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.style.display = 'none';
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }, 1000);
      } else if (format === 'pdf') {
        // PDF Generation
        const container = document.createElement('div');
        container.innerHTML = `
          <div style="padding: 40px; font-family: 'Malgun Gothic', 'Pretendard', sans-serif; font-size: 11pt; line-height: 1.6; color: #333;">
            ${htmlContent}
          </div>
        `;
        
        const opt = {
          margin: 15,
          filename: filename,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        const html2pdfLib = (html2pdf as any).default || html2pdf;
        
        if (typeof html2pdfLib === 'function') {
          await html2pdfLib().set(opt).from(container).save();
        } else {
          throw new Error("PDF 라이브러리를 찾을 수 없습니다.");
        }
      } else if (format === 'docx') {
        // DOCX Generation
        const styledHtml = `
            <!DOCTYPE html>
            <html>
            <head>
            <meta charset="utf-8">
            <style>
                body { font-family: 'Malgun Gothic', 'Pretendard', sans-serif; font-size: 11pt; line-height: 1.6; }
                h1 { font-size: 18pt; font-weight: bold; margin-top: 24px; margin-bottom: 12px; border-bottom: 1px solid #eee; padding-bottom: 8px; }
                h2 { font-size: 15pt; font-weight: bold; margin-top: 20px; margin-bottom: 10px; color: #075985; }
                p { margin-bottom: 10px; text-align: justify; }
                ul, ol { margin-bottom: 10px; padding-left: 20px; }
                table { border-collapse: collapse; width: 100%; margin-bottom: 15px; }
                th, td { border: 1px solid #ccc; padding: 8px; }
                th { background-color: #f8fafc; }
            </style>
            </head>
            <body>${htmlContent}</body>
            </html>
        `;
        
        const blob = await asBlob(styledHtml);
        if (blob) {
            const url = URL.createObjectURL(blob as Blob);
            const link = document.createElement('a');
            link.style.display = 'none';
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            setTimeout(() => {
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
            }, 1000);
        }
      }
    } catch (error) {
      console.error(`${format} download error:`, error);
      alert(`${format.toUpperCase()} 다운로드 중 오류가 발생했습니다. Markdown 다운로드를 시도해 보세요.`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans">
      {/* Header */}
      <header className="bg-admin-800 text-white shadow-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-white p-1.5 rounded-full">
              <svg className="w-6 h-6 text-admin-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">AdminDraft AI</h1>
              <p className="text-xs text-admin-200 font-light">행정·기획 공문서 자동 생성 시스템</p>
            </div>
          </div>
          <div className="hidden md:block">
            <span className="px-3 py-1 bg-admin-700 rounded text-xs font-mono border border-admin-600">
              Gemini 3 Pro Powered
            </span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
          
          {/* Left Column: Input & Configuration */}
          <div className="space-y-6 flex flex-col h-full">
            {/* Section 1: Data Input */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h2 className="text-lg font-bold text-admin-800 mb-4 flex items-center">
                <span className="bg-admin-100 text-admin-600 w-6 h-6 rounded-full flex items-center justify-center text-sm mr-2">1</span>
                자료 입력 (Data Input)
              </h2>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-600">파일 업로드 (참고자료)</label>
                  <FileUpload files={inputFiles} onFilesChange={setInputFiles} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-600">텍스트 / 메모 / 링크</label>
                  <DocumentEditor 
                    label="" 
                    value={inputText} 
                    onChange={setInputText} 
                    placeholder="보도자료 초안, 회의 메모, 주요 수치 등을 자유롭게 입력하세요."
                    height="h-40"
                    className="mb-0"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Template Selection */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex-grow">
              <h2 className="text-lg font-bold text-admin-800 mb-4 flex items-center">
                <span className="bg-admin-100 text-admin-600 w-6 h-6 rounded-full flex items-center justify-center text-sm mr-2">2</span>
                서식 지정 (Formatting)
              </h2>
              <TemplateSelector 
                selectedTemplateStructure={templateStructure} 
                onSelect={setTemplateStructure}
                templateFile={templateFile}
                onTemplateFileChange={setTemplateFile}
              />
            </div>
          </div>

          {/* Right Column: Output */}
          <div className="flex flex-col h-full space-y-4">
             {/* Action Bar */}
             <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center sticky top-24 z-40">
                <div className="flex items-center space-x-2">
                  {status === 'generating' || status === 'analyzing' ? (
                     <div className="flex items-center text-admin-600 font-semibold animate-pulse">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-admin-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        문서 작성 중... (약 10-20초 소요)
                     </div>
                  ) : (
                    <span className="text-sm text-gray-500">
                      {status === 'completed' ? '작성 완료' : '준비됨'}
                    </span>
                  )}
                </div>
                <button
                  onClick={handleGenerate}
                  disabled={status === 'generating' || status === 'analyzing'}
                  className={`px-6 py-2.5 rounded-lg text-white font-bold shadow-md transition-all transform active:scale-95 ${
                    status === 'generating' || status === 'analyzing'
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-admin-600 hover:bg-admin-700 hover:shadow-lg'
                  }`}
                >
                  문서 생성하기
                </button>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded shadow-sm">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{errorMessage}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Output Area */}
            <div className="flex-grow bg-white rounded-xl shadow-lg border border-slate-200 flex flex-col overflow-hidden relative min-h-[500px]">
              <div className="bg-admin-50 px-6 py-3 border-b border-admin-100 flex justify-between items-center">
                <h2 className="font-bold text-admin-800 flex items-center">
                   <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                   결과 보고서 (Output)
                </h2>
                {generatedOutput && (
                  <div className="flex space-x-2">
                    <div className="relative" ref={downloadMenuRef}>
                        <button 
                        onClick={() => setIsDownloadMenuOpen(!isDownloadMenuOpen)}
                        className="text-xs bg-white border border-admin-200 hover:bg-admin-50 text-admin-700 px-3 py-1.5 rounded flex items-center transition-colors"
                        title="다운로드 옵션"
                        >
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                        다운로드
                        <svg className={`w-3 h-3 ml-1 transition-transform ${isDownloadMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </button>
                        
                        {isDownloadMenuOpen && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-50 border border-gray-100 py-1">
                                <button
                                    onClick={() => downloadReport('md')}
                                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                                >
                                    <span className="font-mono text-xs w-12 text-gray-500 mr-2">[.md]</span>
                                    Markdown (원본)
                                </button>
                                <button
                                    onClick={() => downloadReport('docx')}
                                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                                >
                                    <span className="font-mono text-xs w-12 text-blue-600 mr-2">[.docx]</span>
                                    Word 문서
                                </button>
                                <button
                                    onClick={() => downloadReport('pdf')}
                                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                                >
                                    <span className="font-mono text-xs w-12 text-red-600 mr-2">[.pdf]</span>
                                    PDF 문서
                                </button>
                            </div>
                        )}
                    </div>

                    <button 
                      onClick={copyToClipboard}
                      className="text-xs bg-white border border-admin-200 hover:bg-admin-50 text-admin-700 px-3 py-1.5 rounded flex items-center transition-colors"
                    >
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path></svg>
                      복사하기
                    </button>
                  </div>
                )}
              </div>
              
              <div className="flex-grow relative">
                <DocumentEditor 
                  label="" 
                  value={generatedOutput} 
                  readOnly={true} 
                  placeholder="분석 결과가 이곳에 표시됩니다."
                  height="h-full"
                  className="absolute inset-0 p-0"
                />
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default App;