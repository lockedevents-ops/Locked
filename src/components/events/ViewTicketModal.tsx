"use client";

import React, { useRef, useEffect, useState } from 'react';
import Image from 'next/image';
import { format, parseISO } from 'date-fns';
import { Download, X, Calendar, Clock, MapPin, Share2, PlusCircle, Users, Copy, ExternalLink, Video } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/useToast';
import QRCode from 'qrcode';
import jsPDF from 'jspdf';

interface ViewTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: {
    id: string;
    eventId: string;
    eventTitle: string;
    eventDate: string;
    eventTime?: string;
    eventEndDate?: string;
    eventEndTime?: string;
    eventImage: string;
    eventLocation?: string;
    venue: string;
    ticketType: string;
    price: number;
    purchaseDate: string;
    status: 'valid' | 'used' | 'expired';
    ticketNumber: string;
    qrCode?: string;
    userName?: string;
    userEmail?: string;
    userPhone?: string;
    organizerName?: string;
    organizerEmail?: string;
    organizerPhone?: string;
    quantityRegistered?: number;
    locationType?: 'physical' | 'online' | 'hybrid';
    onlineUrl?: string;
    onlinePlatform?: string;
    meetingCode?: string;
    meetingPassword?: string;
  };
}

export function ViewTicketModal({ isOpen, onClose, ticket }: ViewTicketModalProps) {
  if (!isOpen) return null;

  const toast = useToast();
  const eventDate = parseISO(ticket.eventDate);
  const purchaseDate = parseISO(ticket.purchaseDate);
  const ticketRef = useRef<HTMLDivElement>(null);
  const [simplifiedQRCode, setSimplifiedQRCode] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const passwordRevealTimeoutRef = useRef<number | null>(null);
  
  // Calculate if the event is currently live
  const now = new Date();
  const eventStart = new Date(`${ticket.eventDate}T${ticket.eventTime || '00:00'}`);
  const eventEnd = ticket.eventEndDate && ticket.eventEndTime 
    ? new Date(`${ticket.eventEndDate}T${ticket.eventEndTime}`)
    : new Date(eventStart.getTime() + 3 * 60 * 60 * 1000); // Default 3-hour duration
  
  const isLive = now >= eventStart && now <= eventEnd;
  
  // Determine display status based on live calculation
  const displayStatus = isLive ? 'valid' : ticket.status;
  const statusColor = displayStatus === 'valid' ? 'bg-green-500 text-white' :
                      displayStatus === 'used' ? 'bg-blue-500 text-white' :
                      'bg-red-500 text-white';
  const statusText = displayStatus === 'valid' ? 'VALID' :
                     displayStatus === 'used' ? 'USED' :
                     'EXPIRED';
  const isOnlineEvent = ticket.locationType === 'online';
  const showDownloadButton = ticket.locationType !== 'online';
  
  // Generate simplified QR code on mount
  useEffect(() => {
    const generateSimplifiedQR = async () => {
      try {
        // Encode ticket data as JSON for scanning flow
        const qrData = JSON.stringify({
          ticketNumber: ticket.ticketNumber,
          eventId: ticket.eventId,
          quantity: ticket.quantityRegistered || 1,
          registrationId: ticket.id
        });
        
        const qrCodeDataURL = await QRCode.toDataURL(qrData, {
          width: 300,
          margin: 4,
          color: {
            dark: '#1f2937',
            light: '#ffffff'
          },
          errorCorrectionLevel: 'M'
        });
        
        setSimplifiedQRCode(qrCodeDataURL);
      } catch (error) {
        console.error('Error generating simplified QR code:', error);
      }
    };
    
    if (isOpen) {
      generateSimplifiedQR();
    }
    return () => {
      if (passwordRevealTimeoutRef.current) {
        clearTimeout(passwordRevealTimeoutRef.current);
      }
    };
  }, [isOpen, ticket.ticketNumber, ticket.eventId, ticket.id, ticket.quantityRegistered]);
  
  const handleAddToCalendar = () => {
    // Logic to add to calendar
    toast.showSuccess('Calendar Updated', 'Added to calendar!');
  };
  
  const handleShare = () => {
    // Logic to share ticket
    if (navigator.share) {
      navigator.share({
        title: ticket.eventTitle,
        text: `My ticket for ${ticket.eventTitle}`,
        url: window.location.href
      });
    } else {
      toast.showInfo('Sharing Not Supported', 'Sharing is not supported on your device');
    }
  };
  
  const printableRef = useRef<HTMLDivElement>(null);
  
  const handleDownload = async () => {
    if (!printableRef.current) return;
    
    try {
      toast.showInfo('Generating Ticket', 'Creating your high-quality PDF...');
      
      const canvas = await import('html2canvas').then(mod => mod.default(printableRef.current!, {
        scale: 2, // Higher scale for better quality
        useCORS: true, // Allow loading cross-origin images
        logging: false,
        backgroundColor: '#ffffff'
      }));
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const margin = 15; // 15mm margin
      const maxWidth = pdfWidth - (margin * 2);
      const maxHeight = pdfHeight - (margin * 2);
      
      const imgRatio = canvas.width / canvas.height;
      const pdfRatio = maxWidth / maxHeight;
      
      let finalWidth, finalHeight;
      
      if (imgRatio > pdfRatio) {
        // Limited by width
        finalWidth = maxWidth;
        finalHeight = finalWidth / imgRatio;
      } else {
        // Limited by height
        finalHeight = maxHeight;
        finalWidth = finalHeight * imgRatio;
      }
      
      const xPos = (pdfWidth - finalWidth) / 2;
      const yPos = (pdfHeight - finalHeight) / 2;
      
      pdf.addImage(imgData, 'PNG', xPos, yPos, finalWidth, finalHeight);
      pdf.save(`ticket-${ticket.ticketNumber}.pdf`);
      
      toast.showSuccess('Download Complete', 'Your ticket has been downloaded successfully!');
      
    } catch (error) {
      console.error('Error downloading ticket:', error);
      toast.showError('Download Failed', 'Failed to download ticket. Please try again.');
    }
  };

  return (
    <>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div 
          ref={ticketRef}
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="relative max-w-md w-full max-h-[90vh] overflow-hidden bg-white rounded-2xl shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Ticket Header - Event Image with Overlay */}
          <div className="relative h-48 bg-[#5D5FEF4D] overflow-hidden">
            <Image
              src={ticket.eventImage}
              alt={ticket.eventTitle}
              fill
              className="object-cover opacity-100"
            />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0, 0, 0, 0.4), transparent)' }}></div>
            
            {/* Status Badge */}
            <div className="absolute top-4 right-4 flex items-center z-20 gap-2">
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor}`}>
                {statusText}
              </div>
            </div>
            
            {/* Close Button */}
            <button 
              onClick={onClose}
              className="absolute top-4 left-4 z-20 text-white bg-white/20 rounded-full p-1.5 hover:bg-white/30 transition-all cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
            
            <div className="absolute bottom-0 left-0 p-4 w-full z-10">
              <h2 className="text-xl font-bold text-white line-clamp-2">{ticket.eventTitle}</h2>
              <div className="flex flex-col gap-1 text-white/80 text-sm">
                <p className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5" />
                  {format(eventDate, 'EEEE, MMMM d, yyyy')}
                </p>
                <div className="flex items-center gap-4">
                  <p className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5" />
                    {ticket.eventTime ? format(new Date(`1970-01-01T${ticket.eventTime}`), 'h:mm a') : format(eventDate, 'h:mm a')}
                  </p>
                  <p className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5" />
                    <span className="truncate max-w-[150px]">{ticket.venue}</span>
                  </p>
                </div>
              </div>
            </div>
            
            {/* Decorative ticket tear effect */}
            <div className="absolute -bottom-1 left-0 w-full h-3">
              <svg width="100%" height="8" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M0 0C5.5 0 5.5 8 11 8C16.5 8 16.5 0 22 0C27.5 0 27.5 8 33 8C38.5 8 38.5 0 44 0C49.5 0 49.5 8 55 8C60.5 8 60.5 0 66 0C71.5 0 71.5 8 77 8C82.5 8 82.5 0 88 0C93.5 0 93.5 8 99 8C104.5 8 104.5 0 110 0C115.5 0 115.5 8 121 8C126.5 8 126.5 0 132 0C137.5 0 137.5 8 143 8C148.5 8 148.5 0 154 0C159.5 0 159.5 8 165 8C170.5 8 170.5 0 176 0C181.5 0 181.5 8 187 8C192.5 8 192.5 0 198 0C203.5 0 203.5 8 209 8C214.5 8 214.5 0 220 0C225.5 0 225.5 8 231 8C236.5 8 236.5 0 242 0C247.5 0 247.5 8 253 8C258.5 8 258.5 0 264 0C269.5 0 269.5 8 275 8C280.5 8 280.5 0 286 0C291.5 0 291.5 8 297 8C302.5 8 302.5 0 308 0C313.5 0 313.5 8 319 8C324.5 8 324.5 0 330 0C335.5 0 335.5 8 341 8C346.5 8 346.5 0 352 0C357.5 0 357.5 8 363 8C368.5 8 368.5 0 374 0C379.5 0 379.5 8 385 8C390.5 8 390.5 0 396 0C401.5 0 401.5 8 407 8C412.5 8 412.5 0 418 0H1000V8H0V0Z"
                  fill="white"
                />
              </svg>
            </div>
          </div>
          
          {/* Ticket Body */}
          <div className="px-5 pb-5 bg-white">
            {/* Divider with Ticket Type */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-dashed border-gray-300"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold">
                  {ticket.ticketType}
                </span>
              </div>
            </div>
            
            {/* Ticket Details and QR Code */}
            <div className="grid grid-cols-2 gap-4">
              {/* Left column - Ticket details */}
              <div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-3 border-b border-gray-100 bg-blue-50 px-3 rounded-lg">
                    <span className="text-xs text-blue-600 font-bold uppercase tracking-wide">TICKET ID</span>
                    <span className="font-mono text-lg font-black text-blue-900 tracking-wider text-end leading-none">{ticket.ticketNumber}</span>
                  </div>
                  {/* <div className="text-xs text-center text-gray-500 mb-3">
                    <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full font-medium">
                      Use this ID if QR code fails
                    </span>
                  </div> */}
                  <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                    <span className="text-xs text-gray-500 font-medium">PURCHASED</span>
                    <span className="font-medium text-xs text-right">{format(purchaseDate, 'MMM d, yyyy')}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                    <span className="text-xs text-gray-500 font-medium">PRICE</span>
                    <span className="font-medium text-green-600">₵{ticket.price.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                    <span className="text-xs text-gray-500 font-medium">USES</span>
                    <span className="font-bold text-green-600 text-right">{ticket.quantityRegistered || 1} check-in{(ticket.quantityRegistered || 1) !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              </div>
              
              {/* Right column - QR Code or Online Details */}
              <div className="flex flex-col items-center justify-center">
                {ticket.locationType === 'online' ? (
                  <div className="w-full h-full flex flex-col justify-center bg-gray-50 rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center gap-2 mb-3 text-primary font-semibold">
                      <Video className="w-5 h-5" />
                      <span>Online Event</span>
                    </div>
                    
                    <div className="space-y-3 w-full">
                      {ticket.onlineUrl && (
                        <div>
                          <p className="text-xs text-gray-500 font-medium mb-1">JOIN LINK</p>
                          <a 
                            href={ticket.onlineUrl.startsWith('http') ? ticket.onlineUrl : `https://${ticket.onlineUrl}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline break-all"
                          >
                            <span>Join Meeting</span>
                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                          </a>
                        </div>
                      )}

                      {ticket.meetingCode && (
                        <div>
                          <p className="text-xs text-gray-500 font-medium mb-1">MEETING CODE</p>
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(ticket.meetingCode || '');
                              toast.showSuccess('Copied', 'Meeting code copied to clipboard');
                            }}
                            className="flex items-center gap-2 w-full text-left group"
                          >
                            <span className="font-mono font-medium text-gray-900 bg-white px-2 py-1 rounded border border-gray-200 block w-full">
                              {ticket.meetingCode}
                            </span>
                            <Copy className="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors" />
                          </button>
                        </div>
                      )}

                      {ticket.meetingPassword && (
                        <div>
                          <p className="text-xs text-gray-500 font-medium mb-1">PASSWORD</p>
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(ticket.meetingPassword || '');
                              toast.showSuccess('Copied', 'Password copied to clipboard');
                              if (passwordRevealTimeoutRef.current) {
                                clearTimeout(passwordRevealTimeoutRef.current);
                              }
                              setShowPassword(true);
                              passwordRevealTimeoutRef.current = window.setTimeout(() => {
                                setShowPassword(false);
                                passwordRevealTimeoutRef.current = null;
                              }, 3000);
                            }}
                            className="flex items-center gap-2 w-full text-left group cursor-pointer"
                          >
                            <span className="font-mono font-medium text-gray-900 bg-white px-2 py-1 rounded border border-gray-200 block w-full">
                              {showPassword ? ticket.meetingPassword : '••••••••'}
                            </span>
                            <Copy className="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors" />
                          </button>
                        </div>
                      )}
                      
                      {!ticket.onlineUrl && !ticket.meetingCode && !ticket.meetingPassword && (
                        <p className="text-sm text-gray-500 italic">
                          No meeting details provided yet.
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    {simplifiedQRCode ? (
                      <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                        <Image
                          src={simplifiedQRCode}
                          alt="Ticket QR code"
                          width={140}
                          height={140}
                          className="rounded-lg"
                        />
                      </div>
                    ) : (
                      <div className="w-[140px] h-[140px] bg-gray-100 flex flex-col items-center justify-center rounded-xl border border-gray-200">
                        <svg className="w-12 h-12 text-gray-300 mb-2" fill="currentColor" viewBox="0 0 16 16">
                          <path d="M1 1h6v6H1V1zm8 0h6v6H9V1zm-8 8h6v6H1V9zm8 0h6v6H9V9z"/>
                        </svg>
                        <div className="text-center">
                          <p className="text-xs text-gray-400 font-medium">Generating QR...</p>
                          <p className="text-xs text-gray-600 font-mono font-bold mt-1">{ticket.ticketNumber}</p>
                        </div>
                      </div>
                    )}

                  </>
                )}
              </div>
            </div>
          </div>
          
          {/* Ticket Footer Actions */}
          <div className="border-t border-gray-100 p-4 bg-gray-50 flex flex-col gap-3">
            {isOnlineEvent && (
              <p className="text-xs text-gray-600 leading-snug w-full">
                Online event: use the join link and any code/password above. No download needed.
              </p>
            )}

            <div className={`gap-2 w-full ${isOnlineEvent ? 'flex flex-col' : 'flex flex-col sm:grid sm:grid-cols-3'}`}>
              {/* Top Row on Mobile: Calendar and Share */}
              <div className={`gap-2 w-full ${isOnlineEvent ? 'grid grid-cols-2' : 'flex sm:contents'}`}>
                <button
                  onClick={handleAddToCalendar}
                  className="flex items-center justify-center gap-1 px-3 py-2 bg-white border border-gray-200 rounded-md text-sm hover:bg-gray-50 transition-colors cursor-pointer w-full flex-1"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Add to Calendar</span>
                </button>
                
                <button
                  onClick={handleShare}
                  className="flex items-center justify-center gap-1 px-3 py-2 bg-white border border-gray-200 rounded-md text-sm hover:bg-gray-50 transition-colors cursor-pointer w-full flex-1"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share</span>
                </button>
              </div>

              {/* Bottom Row on Mobile: Download */}
              {showDownloadButton && (
                <button
                  onClick={handleDownload}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-md text-sm hover:bg-primary-dark transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Hidden PDF Generation Template */}
      <div 
        ref={printableRef}
        className="fixed left-[-9999px] top-0 w-[550px] font-sans"
        style={{ backgroundColor: '#ffffff', color: '#000000' }}
        aria-hidden="true"
      >
        <div className="w-full overflow-hidden rounded-none border-b" style={{ borderColor: '#f3f4f6', backgroundColor: '#ffffff' }}>
           {/* Branding Header */}
           <div className="px-8 pt-8 pb-6 bg-white">
              <div className="flex flex-col gap-1 items-start">
                <img 
                  src="/locked-logo-text.png" 
                  alt="LOCKED" 
                  className="h-6 w-auto object-contain mb-1" 
                  style={{ filter: 'brightness(0)' }}
                />
                <p className="text-[10px] font-medium tracking-wide uppercase opacity-70" style={{ color: '#111827' }}>
                  Event Discovery, Ticketing & Voting Platform
                </p>
                <p className="text-[10px] font-bold tracking-wider" style={{ color: '#5D5FEF' }}>
                  https://locked.com
                </p>
              </div>
           </div>

           {/* Header Image */}
           <div className="relative h-[250px] w-full" style={{ backgroundColor: 'rgba(93, 95, 239, 0.3)' }}>
             <div 
               style={{ 
                 backgroundImage: `url(${ticket.eventImage})`,
                 backgroundPosition: 'center',
                 backgroundSize: 'cover',
                 width: '100%',
                 height: '100%'
               }} 
             />
             <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)' }}></div>
             
             {/* Branding removed from here */}

              <div className="absolute bottom-9 left-6 right-6" style={{ color: '#ffffff' }}>
               <h1 className="text-3xl font-bold mb-2 drop-shadow-sm" style={{ color: '#ffffff' }}>{ticket.eventTitle}</h1>
               <div className="flex flex-col gap-1.5 text-base font-medium opacity-95">
                 <div className="flex items-start gap-2">
                   <div className="mt-1.5">
                     <Calendar className="w-4 h-4" />
                   </div>
                   <span className="leading-6 -mt-0.5">{format(eventDate, 'EEEE, MMMM d, yyyy')}</span>
                 </div>
                 <div className="flex items-center gap-4">
                   <div className="flex items-start gap-2">
                     <div className="mt-1.5">
                       <Clock className="w-4 h-4" />
                     </div>
                     <span className="leading-6 -mt-0.5">{ticket.eventTime ? format(new Date(`1970-01-01T${ticket.eventTime}`), 'h:mm a') : format(eventDate, 'h:mm a')}</span>
                   </div>
                 </div>
                 <div className="flex items-start gap-2 mt-1">
                   <div className="mt-1.5">
                     <MapPin className="w-4 h-4 shrink-0" />
                   </div>
                   <span className="leading-6 -mt-0.5">{ticket.venue}</span>
                 </div>
               </div>
             </div>
           </div>

           {/* Body */}
           <div className="p-8 pb-24">
             <div className="mb-6">
               <label className="text-xs font-bold uppercase tracking-wider" style={{ color: '#9ca3af' }}>TICKET TYPE</label>
               <p className="text-xl font-bold font-mono" style={{ color: '#111827' }}>{ticket.ticketType}</p>
             </div>

             <div className="grid grid-cols-2 gap-8 mb-8">
                <div className="space-y-4">
                  {/* Ticket ID */}
                  <div className="py-4 px-3 rounded-lg" style={{ backgroundColor: '#eff6ff', borderBottom: '1px solid #e5e7eb' }}>
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs font-bold uppercase tracking-wide" style={{ color: '#2563eb' }}>TICKET ID</span>
                      <span className="font-mono text-3xl font-black tracking-wider leading-none" style={{ color: '#1e3a8a' }}>{ticket.ticketNumber}</span>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="py-2 border-b" style={{ borderColor: '#e5e7eb' }}>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold uppercase tracking-wide" style={{ color: '#9ca3af' }}>PRICE</span>
                      <span className="font-semibold" style={{ color: '#10b981' }}>₵{ticket.price.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Purchased */}
                  <div className="py-2 border-b" style={{ borderColor: '#e5e7eb' }}>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold uppercase tracking-wide" style={{ color: '#9ca3af' }}>PURCHASED</span>
                      <span className="font-medium" style={{ color: '#374151' }}>{format(purchaseDate, 'MMM d, yyyy')}</span>
                    </div>
                  </div>

                  {/* Uses */}
                  <div className="py-2 border-b" style={{ borderColor: '#e5e7eb' }}>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold uppercase tracking-wide" style={{ color: '#9ca3af' }}>USES</span>
                      <span className="font-semibold" style={{ color: '#111827' }}>{ticket.quantityRegistered || 1}</span>
                    </div>
                  </div>

                  {/* Valid Until - Keep vertical layout */}
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider" style={{ color: '#9ca3af' }}>VALID UNTIL</label>
                    <p className="text-base font-medium mt-1" style={{ color: '#10b981' }}>
                      {ticket.eventEndDate && ticket.eventEndTime 
                        ? `${format(parseISO(ticket.eventEndDate), 'MMMM d, yyyy')} at ${format(new Date(`1970-01-01T${ticket.eventEndTime}`), 'h:mm a')}`
                        : 'Event Date'
                      }
                    </p>
                  </div>
               </div>

               <div className="flex flex-col items-center justify-center p-4 pb-6 rounded-xl border" style={{ backgroundColor: '#f9fafb', borderColor: '#f3f4f6' }}>
                  {simplifiedQRCode && (
                    <img src={simplifiedQRCode} alt="QR" className="w-[180px] h-[180px] rounded-lg mix-blend-multiply" />
                  )}
                  <p className="text-xs mt-2 font-mono" style={{ color: '#9ca3af' }}>{ticket.ticketNumber}</p>
               </div>
             </div>

             <div className="pt-6 mt-6 border-t" style={{ borderColor: '#f3f4f6' }}>
               <div className="grid grid-cols-2 gap-8">
                 <div>
                   <h3 className="text-sm font-bold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: '#111827' }}>
                     <Users className="w-4 h-4" /> Guest Details
                   </h3>
                   <div className="space-y-1.5" style={{ fontSize: '0.875rem' }}>
                     <p style={{ color: '#1f2937' }}>
                       <span style={{ color: '#6b7280', fontWeight: 600, marginRight: '4px' }}>Name:</span>
                       {ticket.userName || 'Guest'}
                     </p>
                     <p style={{ color: '#1f2937' }}>
                        <span style={{ color: '#6b7280', fontWeight: 600, marginRight: '4px' }}>Email:</span>
                        <span style={{ color: '#6b7280' }}>{ticket.userEmail || 'Not provided'}</span>
                      </p>
                      <p style={{ color: '#1f2937' }}>
                        <span style={{ color: '#6b7280', fontWeight: 600, marginRight: '4px' }}>Phone:</span>
                        <span style={{ color: '#6b7280' }}>{ticket.userPhone || 'Not provided'}</span>
                      </p>
                   </div>
                 </div>

                 <div>
                   <h3 className="text-sm font-bold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: '#111827' }}>
                     <Users className="w-4 h-4" style={{ color: '#1a1a1a' }} /> Host Details
                   </h3>
                   <div className="space-y-1.5" style={{ fontSize: '0.875rem' }}>
                     <p style={{ color: '#1f2937' }}>
                       <span style={{ color: '#6b7280', fontWeight: 600, marginRight: '4px' }}>Name:</span>
                       {ticket.organizerName || 'Event Organizer'}
                     </p>
                     <p style={{ color: '#1f2937' }}>
                       <span style={{ color: '#6b7280', fontWeight: 600, marginRight: '4px' }}>Email:</span>
                       <span style={{ color: '#6b7280' }}>{ticket.organizerEmail || 'Not provided'}</span>
                     </p>
                     <p style={{ color: '#1f2937' }}>
                       <span style={{ color: '#6b7280', fontWeight: 600, marginRight: '4px' }}>Phone:</span>
                       <span style={{ color: '#6b7280' }}>{ticket.organizerPhone || 'Not provided'}</span>
                     </p>
                   </div>
                 </div>
               </div>
             </div>

             <div className="mt-8 pt-4 border-t text-center" style={{ borderColor: '#f3f4f6' }}>
                <p className="text-xs" style={{ color: '#9ca3af' }}>Scan this QR code at the event entrance for verification.</p>
                <p className="text-[10px] mt-1 uppercase tracking-widest" style={{ color: '#d1d5db' }}>Powered by Locked</p>
             </div>
           </div>
        </div>
      </div>
    </>
  );
}
