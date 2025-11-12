import { useState, useCallback } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CloudUpload, Upload, X } from "lucide-react";

interface FileUploadProps {
  onFilesUpload: (files: File[]) => void;
  disabled?: boolean;
  maxFiles?: number;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function FileUpload({ onFilesUpload, disabled, maxFiles = 10 }: FileUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  const revokePreviews = useCallback((urls: string[]) => {
    urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (!acceptedFiles.length) return;

      const combined = [...selectedFiles];
      const newPreviews: string[] = [];

      for (const file of acceptedFiles) {
        if (combined.length >= maxFiles) break;
        if (file.size > MAX_FILE_SIZE) continue;
        combined.push(file);
        newPreviews.push(URL.createObjectURL(file));
      }

      setSelectedFiles(combined);
      setPreviewUrls((prev) => [...prev, ...newPreviews]);
    },
    [selectedFiles, maxFiles]
  );

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp'],
    },
    maxSize: MAX_FILE_SIZE,
    maxFiles,
    multiple: true,
    disabled,
  });

  const handleUpload = () => {
    if (selectedFiles.length === 0) {
      console.log('No files selected');
      return;
    }
    onFilesUpload(selectedFiles);
  };

  const handleRemove = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => {
      const next = [...prev];
      const [removedUrl] = next.splice(index, 1);
      if (removedUrl) URL.revokeObjectURL(removedUrl);
      return next;
    });
  };

  const handleClearAll = () => {
    revokePreviews(previewUrls);
    setSelectedFiles([]);
    setPreviewUrls([]);
  };

  const rejectedMessages = fileRejections.map((rejection: FileRejection) => {
    if (rejection.errors.some((error) => error.code === 'file-too-large')) {
      return `${rejection.file.name} 超過 5MB，已忽略。`;
    }
    if (rejection.errors.some((error) => error.code === 'too-many-files')) {
      return `超過最多 ${maxFiles} 張圖片的限制。`;
    }
    return `${rejection.file.name} 格式不支援。`;
  });

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold mb-4">上傳商品圖片</h3>
        
        {selectedFiles.length === 0 ? (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
              isDragActive 
                ? "border-primary bg-primary/5" 
                : "border-neutral-300 hover:border-primary"
            } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <input {...getInputProps()} />
            <CloudUpload className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-neutral-900 mb-2">
              {isDragActive ? "放開以上傳圖片" : "拖拽圖片到此處或點擊上傳"}
            </p>
            <p className="text-sm text-neutral-600">
              支援 JPG、PNG、WEBP 格式，單張最大 5MB，最多 {maxFiles} 張
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {selectedFiles.map((file, index) => (
                <div key={`${file.name}-${index}`} className="relative border rounded-lg overflow-hidden">
                  <img
                    src={previewUrls[index]}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-40 object-cover"
                  />
                  <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                    #{index + 1}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => handleRemove(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                  <div className="p-3 text-xs text-neutral-600 space-y-1">
                    <p className="font-medium truncate" title={file.name}>{file.name}</p>
                    <p>{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="text-sm text-neutral-600">
                已選擇 {selectedFiles.length} 張 / 最多 {maxFiles} 張
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={handleClearAll}>
                  重新選擇
                </Button>
                <Button onClick={handleUpload} disabled={disabled}>
                  <Upload className="w-4 h-4 mr-2" />
                  開始分析
                </Button>
              </div>
            </div>
          </div>
        )}

        {rejectedMessages.length > 0 && (
          <div className="mt-4 space-y-1 text-sm text-red-600">
            {rejectedMessages.map((message, index) => (
              <p key={index}>{message}</p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
