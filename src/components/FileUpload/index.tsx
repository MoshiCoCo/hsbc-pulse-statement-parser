import React, { useRef, useCallback } from 'react';
import { Button } from '@arco-design/web-react';
import { IconUpload } from '@arco-design/web-react/icon';
import { useLocale } from '@/locale/LocaleContext';

const MAX_SIZE = 10 * 1024 * 1024;

interface FileUploadProps {
  onFilesParsed: (files: File[]) => Promise<void>;
  loading: boolean;
}

const FileUploadComponent: React.FC<FileUploadProps> = ({ onFilesParsed, loading }) => {
  const { t } = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;

      const valid = files.filter((f) => {
        if (!f.name.toLowerCase().endsWith('.pdf')) return false;
        if (f.size > MAX_SIZE) return false;
        return true;
      });

      if (valid.length > 0) {
        await onFilesParsed(valid);
      }
      e.target.value = '';
    },
    [onFilesParsed]
  );

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        multiple
        style={{ display: 'none' }}
        onChange={handleChange}
      />
      <Button
        type="primary"
        icon={<IconUpload />}
        loading={loading}
        onClick={() => inputRef.current?.click()}
      >
        {t('fileUpload.buttonText')}
      </Button>
    </>
  );
};

export default FileUploadComponent;
