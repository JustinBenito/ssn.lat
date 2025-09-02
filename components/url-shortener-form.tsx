"use client"
import { useState, useRef, useEffect } from "react"
import type React from "react"
import { useToast } from "@/hooks/use-toast"
import { Copy, ExternalLink, QrCode, Download, ArrowLeft } from "lucide-react"
import QRCode from "react-qr-code"

interface UrlShortenerFormProps {
  isAliasValid: (alias: string) => boolean;
  url: string;
  setUrl: React.Dispatch<React.SetStateAction<string>>;
  resetParentForm: () => void;
}

export function UrlShortenerForm({ isAliasValid, url, setUrl, resetParentForm }: UrlShortenerFormProps) {
  console.log("UrlShortenerForm re-rendered"); // Debug log for re-renders
  const [customAlias, setCustomAlias] = useState("")
  const [shortenedUrl, setShortenedUrl] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showQrCodeSection, setShowQrCodeSection] = useState(false) // State to control QR code section visibility
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("")
  const qrCodeRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  function isValidHttpUrl(value: string): boolean {
    const regex = /^(https?:\/\/)([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/[^\s]*)?$/;
    return regex.test(value.trim());
  }


  const handleShorten = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log("handleShorten called"); // Debug log
    if (!url.trim()) return

    if (customAlias && !isAliasValid(customAlias)) {
      toast({
        title: "Invalid alias",
        description: "Your custom alias contains inappropriate words.",
        variant: "destructive",
      });
      return;
    }

    if (!isValidHttpUrl(url)){
      toast({
        title: "Invalid URL",
        description: "Please enter a valid http(s) link.",
        variant: "destructive",
      })
      return;
    }

    setIsLoading(true)
    setShowQrCodeSection(false); // Hide QR code section when shortening a new URL

    try {
      const response = await fetch('/api/shorten', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          longUrl: url,
          customAlias: customAlias || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to shorten URL')
      }

      setShortenedUrl(data.shortUrl)
      toast({
        title: "URL Shortened!",
        description: "Your short URL has been created successfully.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to shorten URL",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = async () => {
    console.log("copyToClipboard called"); // Debug log
    try {
      await navigator.clipboard.writeText(shortenedUrl)
      toast({
        title: "Copied!",
        description: "Short URL copied to clipboard.",
      })
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Please copy the URL manually.",
        variant: "destructive",
      })
    }
  }

  const generateQrCodeImage = () => {
    if (qrCodeRef.current) {
      const svgElement = qrCodeRef.current.querySelector('svg');
      if (svgElement) {
        const svgData = new XMLSerializer().serializeToString(svgElement);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx?.drawImage(img, 0, 0);
          setQrCodeDataUrl(canvas.toDataURL('image/png'));
        };
        img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
      }
    }
  };

  const copyQrCodeToClipboard = async () => {
    if (qrCodeDataUrl) {
      try {
        const response = await fetch(qrCodeDataUrl);
        const blob = await response.blob();
        await navigator.clipboard.write([
          new ClipboardItem({
            'image/png': blob
          })
        ]);
        toast({
          title: "QR Code Copied!",
          description: "The QR code has been copied to your clipboard.",
        });
      } catch (error) {
        console.error("Failed to copy QR code:", error);
        toast({
          title: "Error",
          description: "Failed to copy QR Code to clipboard.",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Error",
        description: "QR Code not available for copy.",
        variant: "destructive",
      });
    }
  };

  const downloadQrCode = () => {
    if (qrCodeDataUrl) {
      const link = document.createElement('a');
      link.href = qrCodeDataUrl;
      link.download = 'qrcode.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({
        title: "QR Code Downloaded!",
        description: "The QR code has been downloaded successfully.",
      });
    } else {
      toast({
        title: "Error",
        description: "QR Code not available for download.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (showQrCodeSection && shortenedUrl) {
      generateQrCodeImage();
    }
  }, [showQrCodeSection, shortenedUrl]);

  const resetForm = () => {
    setUrl(""); // Clear the original URL input
    setCustomAlias(""); // Clear the custom alias input
    setShortenedUrl("");
    setIsLoading(false);
    setShowQrCodeSection(false);
    setQrCodeDataUrl("");
    resetParentForm(); // Call the parent reset function
  };

  return (
    <div className="w-full space-y-6 relative">
      {/* Temporary comment to force re-parse */}
      {shortenedUrl && (
        <button
          onClick={resetForm}
          className="absolute top-0 left-0 text-orange-500 hover:text-orange-600 transition-colors flex items-center gap-1"
          aria-label="Back to form"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
      )}
      <form onSubmit={handleShorten} className="space-y-4">
        <div className="space-y-3">
          <input
            type="url"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setShortenedUrl(""); // Clear shortened URL when original URL changes
              setShowQrCodeSection(false); // Hide QR code section
            }}
            placeholder="Paste your long URL here..."
            className="w-full px-4 py-3 bg-gray-11/5 border border-gray-11/10 rounded-xl text-slate-12 placeholder:text-gray-9 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/30 transition-all"
            required
            disabled={isLoading || shortenedUrl !== ""} // Disable input if URL is shortened
          />

          <input
            type="text"
            value={customAlias}
            onChange={(e) => setCustomAlias(e.target.value.replace(/[^a-zA-Z0-9-]/g, ""))}
            placeholder="Custom alias (optional)"
            className="w-full px-4 py-3 bg-gray-11/5 border border-gray-11/10 rounded-xl text-slate-12 placeholder:text-gray-9 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/30 transition-all"
            disabled={isLoading || shortenedUrl !== ""} // Disable input if URL is shortened
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || !url.trim() || shortenedUrl !== ""} // Disable submit if URL is shortened
          className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-medium py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
        >
          {isLoading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Shortening...
            </div>
          ) : (
            "Shorten URL"
          )}
        </button>
      </form>

      {shortenedUrl && (
        <div className="flex flex-col gap-4 mt-6"> {/* Added mt-6 for spacing from the form */}
          <div className="bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-950/20 dark:to-orange-900/20 border border-orange-200 dark:border-orange-800/30 rounded-xl p-4 space-y-3 animate-in fade-in-50 slide-in-from-bottom-4 duration-500">
            <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">Your shortened URL:</p>
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <a
                    href={shortenedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-orange-700 dark:text-orange-300 font-medium hover:underline truncate flex items-center gap-1"
                  >
                    {shortenedUrl}
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  </a>
                </div>
              </div>
              <button
                type="button"
                onClick={copyToClipboard}
                className="flex items-center gap-1 bg-orange-600 hover:bg-orange-700 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors"
              >
                <Copy className="w-3 h-3" />
                Copy
              </button>
            </div>
          </div>
          {!showQrCodeSection && (
            <button
              type="button"
              onClick={() => setShowQrCodeSection(true)}
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-medium py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              <div className="flex items-center justify-center gap-2">
                <QrCode className="w-5 h-5" />
                Generate QR Code
              </div>
            </button>
          )}

          {showQrCodeSection && (
            <div className="relative bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-950/20 dark:to-orange-900/20 border border-orange-200 dark:border-orange-800/30 rounded-xl p-4 flex flex-col items-center justify-center space-y-3 animate-in fade-in-50 slide-in-from-bottom-4 duration-500">
              <p className="text-xs text-orange-600 dark:text-orange-400 font-medium mb-1">QR Code for: {shortenedUrl}</p>
              <div ref={qrCodeRef} className="p-2 bg-white rounded-lg relative">
                <QRCode value={shortenedUrl} size={180} />
                  <button
                    type="button" // Explicitly set type to "button" to prevent form submission
                    onClick={(e) => {
                      e.preventDefault(); // Prevent any default form submission behavior
                      console.log("QR Code Copy button clicked"); // Debug log
                      copyQrCodeToClipboard();
                    }}
                    className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 hover:opacity-100 transition-opacity rounded-lg"
                    aria-label="Copy QR Code"
                  >
                    <Copy className="w-8 h-8" />
                  </button>
              </div>
              <button
                type="button"
                onClick={downloadQrCode}
                disabled={!qrCodeDataUrl}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-medium py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
              >
                <div className="flex items-center justify-center gap-2">
                  <Download className="w-5 h-5" />
                  Download QR
                </div>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
