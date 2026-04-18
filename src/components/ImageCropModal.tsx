"use client";

import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { X, RotateCw, ZoomIn, ZoomOut } from 'lucide-react';

interface ImageCropModalProps {
  image: string;
  isOpen: boolean;
  onClose: () => void;
  onCropComplete: (croppedImage: Blob) => void;
  aspect?: number;
  title?: string;
  cropShape?: 'rect' | 'round';
}

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function ImageCropModal({
  image,
  isOpen,
  onClose,
  onCropComplete,
  aspect = 16 / 9, // Default banner aspect ratio
  title = 'Position Image',
  cropShape = 'rect'
}: ImageCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropArea | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Extract the image type from title (e.g., "Position Your Avatar" -> "Avatar")
  const getImageType = () => {
    const titleLower = title.toLowerCase();
    if (titleLower.includes('avatar')) return 'Avatar';
    if (titleLower.includes('logo')) return 'Logo';
    if (titleLower.includes('banner')) return 'Banner';
    return 'Image';
  };

  const onCropChange = useCallback((location: { x: number; y: number }) => {
    setCrop(location);
  }, []);

  const onZoomChange = useCallback((zoom: number) => {
    setZoom(zoom);
  }, []);

  const onCropCompleteHandler = useCallback(
    (croppedArea: CropArea, croppedAreaPixels: CropArea) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.src = url;
    });

  const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: CropArea,
    rotation = 0
  ): Promise<Blob> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('No 2d context');
    }

    const maxSize = Math.max(image.width, image.height);
    const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2));

    canvas.width = safeArea;
    canvas.height = safeArea;

    ctx.translate(safeArea / 2, safeArea / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-safeArea / 2, -safeArea / 2);

    ctx.drawImage(
      image,
      safeArea / 2 - image.width * 0.5,
      safeArea / 2 - image.height * 0.5
    );

    const data = ctx.getImageData(0, 0, safeArea, safeArea);

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.putImageData(
      data,
      Math.round(0 - safeArea / 2 + image.width * 0.5 - pixelCrop.x),
      Math.round(0 - safeArea / 2 + image.height * 0.5 - pixelCrop.y)
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        }
      }, 'image/jpeg', 0.95);
    });
  };

  const handleSave = async () => {
    if (!croppedAreaPixels) return;

    setIsProcessing(true);
    try {
      const croppedImage = await getCroppedImg(image, croppedAreaPixels, rotation);
      onCropComplete(croppedImage);
      onClose();
    } catch (e) {
      console.error('Error cropping image:', e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-[600px] h-[600px] bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-200 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-black">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Cropper Area */}
        <div className="relative flex-1 bg-gray-100 p-6">
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={aspect}
            cropShape={cropShape}
            onCropChange={onCropChange}
            onZoomChange={onZoomChange}
            onCropComplete={onCropCompleteHandler}
          />
        </div>

        {/* Controls */}
        <div className="px-4 py-4 space-y-4 bg-white border-t border-gray-200 flex-shrink-0">
          {/* Zoom Control */}
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="p-2 bg-gray-100 rounded-lg">
              <ZoomOut className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
            </div>
            <div className="flex-1 relative">
              <input
                type="range"
                min={1}
                max={3}
                step={0.001}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer simple-slider"
              />
            </div>
            <div className="p-2 bg-gray-100 rounded-lg">
              <ZoomIn className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
            </div>
            <div className="min-w-[50px] sm:min-w-[60px] text-center">
              <span className="text-xs sm:text-sm font-semibold text-gray-900">{Math.round(zoom * 100)}%</span>
            </div>
          </div>

          {/* Rotation Control */}
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="p-2 bg-gray-100 rounded-lg">
              <RotateCw className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
            </div>
            <div className="flex-1 relative">
              <input
                type="range"
                min={0}
                max={360}
                step={0.01}
                value={rotation}
                onChange={(e) => setRotation(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer simple-slider"
              />
            </div>
            <div className="min-w-[50px] sm:min-w-[60px] text-center">
              <span className="text-xs sm:text-sm font-semibold text-gray-900">{rotation.toFixed(1)}°</span>
            </div>
          </div>
        </div>


        {/* Action Button */}
        <div className="px-4 py-4 bg-gray-50 border-t border-gray-200">
          <button
            onClick={handleSave}
            disabled={isProcessing}
            className="w-full bg-black text-white font-medium py-3 rounded-lg hover:bg-gray-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer"
          >
            {isProcessing ? 'Saving...' : `Save new ${getImageType()}`}
          </button>
        </div>
      </div>
      
      <style jsx global>{`
        .simple-slider::-webkit-slider-thumb {
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #000;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          transition: transform 0.2s ease;
        }
        
        .simple-slider::-webkit-slider-thumb:hover {
          transform: scale(1.1);
        }
        
        .simple-slider::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #000;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          transition: transform 0.2s ease;
        }
        
        .simple-slider::-moz-range-thumb:hover {
          transform: scale(1.1);
        }
      `}</style>
    </div>
  );
}
