'use client';

import { useCallback, useRef, useState } from 'react';

import {
  Camera,
  CircleStop,
  Monitor,
  ScreenShare,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@kit/ui/dialog';

interface RecordingControlsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScreenshotCapture: (screenshot: Blob, stepInfo: {
    title: string;
    url?: string;
    clickTarget?: string;
  }) => void;
}

export function RecordingControls({
  open,
  onOpenChange,
  onScreenshotCapture,
}: RecordingControlsProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [captureCount, setCaptureCount] = useState(0);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const startScreenCapture = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'browser' } as MediaTrackConstraints,
        audio: false,
      });

      streamRef.current = stream;
      setIsRecording(true);
      setCaptureCount(0);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Stop recording when the user stops sharing
      stream.getVideoTracks()[0]?.addEventListener('ended', () => {
        stopRecording();
      });

      toast.success(
        'Screen capture started. Click "Capture Step" to save screenshots.',
      );
    } catch (err) {
      if ((err as Error).name !== 'NotAllowedError') {
        toast.error('Failed to start screen capture');
      }
    }
  }, []);

  const captureStep = useCallback(async () => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);

    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob(
        (b) => resolve(b ?? new Blob()),
        'image/png',
      );
    });

    const stepNum = captureCount + 1;
    setCaptureCount(stepNum);

    onScreenshotCapture(blob, {
      title: `Step ${stepNum}`,
    });

    toast.success(`Step ${stepNum} captured`);
  }, [captureCount, onScreenshotCapture]);

  const stopRecording = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsRecording(false);
    onOpenChange(false);

    if (captureCount > 0) {
      toast.success(`Recording complete. ${captureCount} steps captured.`);
    }
  }, [captureCount, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Record Guide</DialogTitle>
          <DialogDescription>
            Share your screen and capture steps as you perform them.
          </DialogDescription>
        </DialogHeader>

        {!isRecording ? (
          <div className="space-y-4 py-4">
            <div className="text-muted-foreground rounded-lg border border-dashed p-8 text-center">
              <Monitor className="mx-auto mb-3 h-12 w-12 opacity-50" />
              <p className="mb-1 text-sm font-medium">Screen Capture</p>
              <p className="mb-4 text-xs">
                Share your screen, then click &quot;Capture Step&quot; at each
                point you want to document.
              </p>
              <Button onClick={startScreenCapture}>
                <ScreenShare className="mr-2 h-4 w-4" />
                Start Screen Capture
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Preview */}
            <div className="overflow-hidden rounded-md border bg-black">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="max-h-64 w-full object-contain"
              />
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="destructive" className="animate-pulse">
                  Recording
                </Badge>
                <span className="text-muted-foreground text-sm">
                  {captureCount} steps captured
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button onClick={captureStep}>
                  <Camera className="mr-2 h-4 w-4" />
                  Capture Step
                </Button>
                <Button variant="destructive" onClick={stopRecording}>
                  <CircleStop className="mr-2 h-4 w-4" />
                  Stop
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
