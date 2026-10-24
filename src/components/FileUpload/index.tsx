import React, { useCallback, useRef, useState } from 'react';
import { Modal, Button } from '@arco-design/web-react';
import {
  IconUpload,
  IconLoading,
  IconCheckCircle,
  IconExclamationCircle,
} from '@arco-design/web-react/icon';
import { useLocale } from '@/locale/LocaleContext';

const MAX_SIZE = 10 * 1024 * 1024;

export interface UploadOutcome {
  /** Files that produced statement data and were not already parsed. */
  parsed: number;
  /** Files rejected here or skipped as duplicates upstream. */
  skipped: number;
  /** Parsing threw, or no statement data was found. */
  failed: boolean;
}

interface FileUploadProps {
  onFilesParsed: (files: File[]) => Promise<UploadOutcome>;
  loading: boolean;
}

const FileUploadComponent: React.FC<FileUploadProps> = ({ onFilesParsed, loading }) => {
  const { t } = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const [visible, setVisible] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [outcome, setOutcome] = useState<UploadOutcome | null>(null);

  const submit = useCallback(
    async (files: File[]) => {
      const valid = files.filter(
        (f) => f.name.toLowerCase().endsWith('.pdf') && f.size <= MAX_SIZE
      );
      const rejected = files.length - valid.length;
      if (valid.length === 0) {
        setOutcome({ parsed: 0, skipped: rejected, failed: false });
        return;
      }
      setOutcome(null);
      const result = await onFilesParsed(valid);
      const merged: UploadOutcome = {
        ...result,
        skipped: result.skipped + rejected,
      };
      setOutcome(merged);
      // Close only on a clean run; otherwise the result lines explain what happened
      if (merged.parsed > 0 && merged.skipped === 0 && !merged.failed) setVisible(false);
    },
    [onFilesParsed]
  );

  const close = useCallback(() => {
    setVisible(false);
    setDragOver(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      e.target.value = '';
      if (files.length > 0) void submit(files);
    },
    [submit]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (loading) return;
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) void submit(files);
    },
    [loading, submit]
  );

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        multiple
        style={{ display: 'none' }}
        onChange={handleInputChange}
      />
      <button
        type="button"
        className="nav-icon-btn"
        disabled={loading}
        title={t('fileUpload.buttonText')}
        onClick={() => {
          setOutcome(null);
          setVisible(true);
        }}
      >
        {loading ? <IconLoading spin /> : <IconUpload />}
      </button>

      <Modal
        title={t('fileUpload.buttonText')}
        visible={visible}
        onCancel={close}
        alignCenter
        footer={
          <Button onClick={close}>{t('fileUpload.close')}</Button>
        }
        className="upload-modal"
        mountOnEnter
        unmountOnExit
        autoFocus={false}
      >
        <button
          type="button"
          className={`upload-dropzone${dragOver ? ' upload-dropzone-active' : ''}`}
          disabled={loading}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            if (!loading) setDragOver(true);
          }}
          onDragLeave={(e) => {
            // Ignore leaves toward descendants, otherwise the highlight flickers
            if (e.currentTarget.contains(e.relatedTarget as Node)) return;
            setDragOver(false);
          }}
          onDrop={handleDrop}
        >
          {loading ? (
            <IconLoading spin className="upload-dropzone-icon" />
          ) : (
            <IconUpload className="upload-dropzone-icon" />
          )}
          <span className="upload-dropzone-text">
            {loading ? t('fileUpload.processing') : t('fileUpload.dragText')}
          </span>
          <span className="upload-dropzone-hint">{t('fileUpload.limitText')}</span>
        </button>

        {outcome && (
          <div className="upload-result">
            {outcome.parsed > 0 && (
              <span className="upload-result-item">
                <IconCheckCircle /> {outcome.parsed} {t('fileUpload.parsedCount')}
              </span>
            )}
            {outcome.skipped > 0 && (
              <span className="upload-result-item upload-result-muted">
                {outcome.skipped} {t('fileUpload.skippedCount')}
              </span>
            )}
            {outcome.failed && (
              <span className="upload-result-item upload-result-failed">
                <IconExclamationCircle /> {t('fileUpload.error')}
              </span>
            )}
          </div>
        )}
      </Modal>
    </>
  );
};

export default FileUploadComponent;
