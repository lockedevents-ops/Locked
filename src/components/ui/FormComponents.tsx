"use client";

import React from 'react';
import Link from 'next/link';

// Types
interface FormFieldProps {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  error?: string;
  register?: any;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

interface FormErrorProps {
  message: string;
}

interface FormSuccessProps {
  message: string;
}

interface AuthFormLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  className?: string;
}

interface FormSubmitButtonProps {
  isLoading: boolean;
  loadingText: string;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

interface AuthFormFooterProps {
  text: string;
  linkText: string;
  linkHref: string;
}

// Shared Form Field Component
export function FormField({
  label,
  name,
  type = "text",
  placeholder,
  error,
  register,
  disabled = false,
  required = false,
  className = ""
}: FormFieldProps) {
  return (
    <div className={`space-y-1 ${className}`}>
      <label htmlFor={name} className="text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        id={name}
        type={type}
        className={`w-full p-3 border rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors ${
          error ? 'border-red-500' : 'border-neutral-200'
        } ${disabled ? 'bg-gray-50 cursor-not-allowed' : ''}`}
        placeholder={placeholder}
        disabled={disabled}
        {...(register ? register(name) : {})}
      />
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}

// Form Error Message
export function FormError({ message }: FormErrorProps) {
  return (
    <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
      {message}
    </div>
  );
}

// Form Success Message
export function FormSuccess({ message }: FormSuccessProps) {
  return (
    <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-md text-sm">
      {message}
    </div>
  );
}

// Auth Form Layout Wrapper
export function AuthFormLayout({ title, subtitle, children, className = "" }: AuthFormLayoutProps) {
  return (
    <div className={`w-full max-w-md space-y-6 ${className}`}>
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <p className="text-sm text-gray-600 mt-2">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

// Submit Button with Loading State
export function FormSubmitButton({
  isLoading,
  loadingText,
  children,
  disabled = false,
  className = ""
}: FormSubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={isLoading || disabled}
      className={`w-full bg-primary text-white py-3 px-4 rounded-md hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center ${className}`}
    >
      {isLoading ? (
        <>
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {loadingText}
        </>
      ) : (
        children
      )}
    </button>
  );
}

// Auth Form Footer with Link
export function AuthFormFooter({ text, linkText, linkHref }: AuthFormFooterProps) {
  return (
    <div className="text-center text-sm text-gray-600">
      <span>{text} </span>
      <Link href={linkHref} className="text-primary hover:underline font-medium">
        {linkText}
      </Link>
    </div>
  );
}

// Reusable Form Container for consistent spacing and styling
export function FormContainer({ 
  children, 
  className = "",
  onSubmit 
}: { 
  children: React.ReactNode; 
  className?: string;
  onSubmit?: (e: React.FormEvent) => void;
}) {
  return (
    <form className={`space-y-4 ${className}`} onSubmit={onSubmit}>
      {children}
    </form>
  );
}
