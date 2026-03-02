import React, { useCallback, useState } from 'react';
import { UploadedFile } from '../types';

interface FileUploadProps {
  files: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
}

interface ProgressMap {
  [fileName: string]: number;
}

export const FileUpload: React.FC<FileUploadProps> = ({ files, onFilesChange }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<ProgressMap>({});

  const processFiles = useCallback((fileList: File[]) => {
    const newFiles: UploadedFile[] = [];
    let completedCount = 0;
    const totalFiles = fileList.length;

    // Initialize progress for these files
    const initialProgress: ProgressMap = {};
    fileList.forEach(f => { initialProgress[f.name] = 0; });
    setUploadProgress(prev => ({ ...prev, ...initialProgress }));

    fileList.forEach((file: File) => {
      const reader = new FileReader();

      reader.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(prev => ({
            ...prev,
            [file.name]: percent
          }));
        }
      };

      reader.onloadend = () => {
        newFiles.push({
          id: Math.random().toString(36).substring(7),
          name: file.name,
          type: file.type,
          data: reader.result as string,
          size: file.size
        });

        completedCount++;

        // Remove from progress map when done
        if (completedCount === totalFiles) {
          setUploadProgress(prev => {
            const next = { ...prev };
            fileList.forEach(f => delete next[f.name]);
            return next;
          });
          
          // Update parent state once all files in this batch are processed
          onFilesChange([...files, ...newFiles]);
        }
      };

      reader.readAsDataURL(file);
    });
  }, [files, onFilesChange]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      processFiles(Array.from(event.target.files));
    }
    // Reset input value to allow selecting the same file again if needed
    event.target.value = '';
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files).filter((file: File) => 
        file.type === 'application/pdf' || 
        file.type.startsWith('image/')
      );
      
      if (droppedFiles.length > 0) {
        processFiles(droppedFiles);
      }
    }
  };

  const removeFile = (id: string) => {
    onFilesChange(files.filter(f => f.id !== id));
  };

  return (
    <div className="space-y-3">
      <div 
        className="flex items-center justify-center w-full"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <label 
          htmlFor="dropzone-file" 
          className={`flex flex-col items-center justify-center w-full h-32 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
            isDragging 
              ? 'border-admin-500 bg-admin-100 scale-[1.01] shadow-inner' 
              : 'border-admin-300 border-dashed bg-admin-50 hover:bg-admin-100'
          }`}
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6 pointer-events-none">
            {isDragging ? (
               <svg className="w-10 h-10 mb-3 text-admin-600 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
            ) : (
               <svg className="w-8 h-8 mb-4 text-admin-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                 <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
               </svg>
            )}
            <p className={`mb-2 text-sm ${isDragging ? 'text-admin-800 font-bold' : 'text-admin-700'}`}>
              {isDragging ? '여기에 파일을 놓으세요' : <><span className="font-semibold">클릭하여 업로드</span> 또는 파일을 여기로 드래그</>}
            </p>
            <p className="text-xs text-admin-500">PDF, PNG, JPG (최대 10MB)</p>
          </div>
          <input 
            id="dropzone-file" 
            type="file" 
            className="hidden" 
            multiple 
            accept="application/pdf,image/png,image/jpeg,image/webp"
            onChange={handleFileChange}
          />
        </label>
      </div>
      
      {/* Uploading Progress List */}
      {Object.keys(uploadProgress).length > 0 && (
        <ul className="grid grid-cols-1 gap-2">
          {Object.entries(uploadProgress).map(([fileName, percent]) => (
            <li key={`progress-${fileName}`} className="p-2 bg-white border border-admin-100 rounded shadow-sm">
              <div className="flex justify-between mb-1">
                <span className="text-xs font-medium text-admin-700 truncate max-w-xs">{fileName}</span>
                <span className="text-xs font-medium text-admin-700">{percent}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div 
                  className="bg-admin-500 h-1.5 rounded-full transition-all duration-300 ease-out" 
                  style={{ width: `${percent}%` }}
                ></div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Completed Files List */}
      {files.length > 0 && (
        <ul className="grid grid-cols-1 gap-2">
          {files.map((file) => (
            <li key={file.id} className="flex items-center justify-between p-2 bg-white border border-admin-200 rounded shadow-sm group">
              <div className="flex items-center overflow-hidden">
                <span className="bg-admin-100 text-admin-800 text-xs font-medium mr-2 px-2.5 py-0.5 rounded uppercase flex-shrink-0">
                  {file.type.split('/')[1]}
                </span>
                <span className="text-sm text-gray-700 truncate group-hover:text-gray-900 transition-colors">
                  {file.name}
                </span>
              </div>
              <button 
                onClick={() => removeFile(file.id)}
                className="text-gray-400 hover:text-red-500 text-sm font-medium px-2 transition-colors"
                title="삭제"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};