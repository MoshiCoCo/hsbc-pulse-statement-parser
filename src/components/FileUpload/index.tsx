import React, { useCallback } from 'react';
import { Upload, Message } from '@arco-design/web-react';
import { IconUpload } from '@arco-design/web-react/icon';
import locale from '@/locale';

interface FileUploadProps {
  onFileParsed: (file: File) => void;
  loading: boolean;
}

const FileUploadComponent: React.FC<FileUploadProps> = ({ onFileParsed, loading }) => {
  const customRequest = useCallback(
    (option: any) => {
      const { fileItem, onSuccess, onError } = option;
      const file = fileItem.file as File;

      if (!file.name.toLowerCase().endsWith('.pdf')) {
        onError(fileItem);
        Message.error('Please upload a PDF file');
        return;
      }

      onFileParsed(file);
      onSuccess(fileItem);
    },
    [onFileParsed]
  );

  return (
    <Upload
      drag
      customRequest={customRequest}
      accept=".pdf"
      showUploadList={false}
      disabled={loading}
      style={{ width: '100%' }}
    >
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <IconUpload style={{ fontSize: 48, color: '#165DFF', marginBottom: 16 }} />
        <div style={{ fontSize: 16, color: '#1D2129', marginBottom: 8 }}>
          {loading ? locale['fileUpload.processing'] : locale['fileUpload.dragText']}
        </div>
        <div style={{ fontSize: 13, color: '#86909C' }}>
          {locale['fileUpload.supportText']}
        </div>
      </div>
    </Upload>
  );
};

export default FileUploadComponent;
