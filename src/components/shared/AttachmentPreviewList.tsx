import { Download, ExternalLink, FileText, Image, Upload, X } from "lucide-react";
import type { GlossaryAttachment } from "@/lib/api";
import { Button } from "@/components/ui/button";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

function getAttachmentUrl(url: string) {
  return `${API_BASE}${url}`;
}

function isPdfAttachment(attachment: GlossaryAttachment) {
  return (
    attachment.content_type?.includes("pdf") ||
    attachment.name.toLowerCase().endsWith(".pdf")
  );
}

function isVideoAttachment(attachment: GlossaryAttachment) {
  return attachment.content_type?.startsWith("video/") || false;
}

function isAudioAttachment(attachment: GlossaryAttachment) {
  return attachment.content_type?.startsWith("audio/") || false;
}

interface AttachmentPreviewListProps {
  attachments: GlossaryAttachment[];
  title?: string;
  emptyText?: string;
  uploadingText?: string;
  onUpload?: (files: FileList | null) => void;
  onRemove?: (attachmentUrl: string) => void;
}

export function AttachmentPreviewList({
  attachments,
  title = "Attachments",
  emptyText,
  uploadingText = "Upload images or files",
  onUpload,
  onRemove,
}: AttachmentPreviewListProps) {
  return (
    <div className="space-y-3">
      <div className="text-sm font-medium text-foreground">{title}</div>

      {onUpload && (
        <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
          <Upload className="h-4 w-4" />
          {uploadingText}
          <input
            type="file"
            multiple
            className="hidden"
            onChange={(event) => void onUpload(event.target.files)}
          />
        </label>
      )}

      {attachments.length === 0 && emptyText ? (
        <div className="text-sm text-muted-foreground">{emptyText}</div>
      ) : null}

      <div className="space-y-3">
        {attachments.map((attachment) => (
          <div key={`${attachment.url}-${attachment.name}`} className="rounded-lg border border-border p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                {attachment.kind === "image" ? (
                  <Image className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <FileText className="h-4 w-4 text-muted-foreground" />
                )}
                <div className="min-w-0">
                  <a
                    href={getAttachmentUrl(attachment.url)}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate text-sm text-blue-600 underline"
                  >
                    {attachment.name}
                  </a>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {attachment.content_type || attachment.kind || "file"}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={getAttachmentUrl(attachment.url)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open
                </a>
                <a
                  href={getAttachmentUrl(attachment.url)}
                  download={attachment.name}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </a>
                {onRemove && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onRemove(attachment.url)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>

            {attachment.kind === "image" && (
              <img
                src={getAttachmentUrl(attachment.url)}
                alt={attachment.name}
                className="mt-3 max-h-72 w-full rounded-md border border-border object-cover"
              />
            )}
            {isPdfAttachment(attachment) && (
              <iframe
                title={attachment.name}
                src={getAttachmentUrl(attachment.url)}
                className="mt-3 h-80 w-full rounded-md border border-border bg-white"
              />
            )}
            {isVideoAttachment(attachment) && (
              <video
                controls
                src={getAttachmentUrl(attachment.url)}
                className="mt-3 max-h-80 w-full rounded-md border border-border"
              />
            )}
            {isAudioAttachment(attachment) && (
              <audio
                controls
                src={getAttachmentUrl(attachment.url)}
                className="mt-3 w-full"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
