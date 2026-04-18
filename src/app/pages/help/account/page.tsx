"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronUp, Search, ArrowRight, User, Shield, Key, Mail, AlertTriangle } from 'lucide-react';

export default function AccountHelpPage() {
  const [activeTab, setActiveTab] = useState('basics');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const topics = [
    { id: 'basics', name: 'Account Basics', icon: <User className="w-5 h-5" /> },
    { id: 'security', name: 'Security', icon: <Shield className="w-5 h-5" /> },
    { id: 'organizer', name: 'Organizer Accounts', icon: <Key className="w-5 h-5" /> },
    { id: 'troubleshoot', name: 'Troubleshooting', icon: <AlertTriangle className="w-5 h-5" /> },
  ];

  type HelpContentItem = {
    title: string;
    content: React.ReactNode | string;
    keywords?: string[];
  };

  const helpContent: {
    [key: string]: HelpContentItem[];
  } = {
    basics: [
      {
        title: "Creating Your Account",
        keywords: ["signup", "register", "join", "verify", "email", "google", "facebook"],
        content: (
          <div className="space-y-4">
            <p>Creating an account on Locked is free and easy. Follow these steps to get started:</p>
            <ol className="list-decimal pl-5 space-y-2">
              <li>Click on the <strong>Sign Up</strong> button in the top right corner of the page</li>
              <li>Enter your email address, name, and create a strong password</li>
              <li>Verify your email address by clicking the link sent to your inbox</li>
              <li>Complete your profile information to enhance your experience</li>
            </ol>
            <p>You can also sign up using your Google or Facebook account for a faster registration process.</p>
            
            <div className="my-6">
              <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <Mail className="w-4 h-4 text-primary" />
                  </div>
                  <span className="font-medium">Didn't receive a verification email?</span>
                </div>
                <p className="text-sm text-neutral-600 mb-3">
                  If you haven't received your verification email within 5 minutes, check your spam folder or click the button below to resend.
                </p>
                <Link 
                  href="/auth/resend-verification" 
                  className="text-primary font-medium text-sm hover:text-primary-dark"
                >
                  Resend Verification Email
                </Link>
              </div>
            </div>
          </div>
        )
      },
      {
        title: "Managing Your Profile",
        keywords: ["profile", "settings", "update", "avatar", "bio", "location", "contact"],
        content: (
          <div className="space-y-4">
            <p>Your profile helps other users and event organizers know more about you. To update your profile:</p>
            <ol className="list-decimal pl-5 space-y-2">
              <li>Sign in to your account</li>
              <li>Click on your profile picture in the top right corner</li>
              <li>Select <strong>Profile Settings</strong> from the dropdown menu</li>
              <li>Update your information as needed</li>
              <li>Click <strong>Save Changes</strong> to confirm</li>
            </ol>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
              <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
                <h4 className="font-medium mb-2">Profile Information</h4>
                <ul className="text-sm space-y-1 text-neutral-600">
                  <li>• Display name</li>
                  <li>• Profile photo</li>
                  <li>• Bio/About me</li>
                  <li>• Location</li>
                  <li>• Interests</li>
                </ul>
              </div>
              
              <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
                <h4 className="font-medium mb-2">Contact Information</h4>
                <ul className="text-sm space-y-1 text-neutral-600">
                  <li>• Email address</li>
                  <li>• Phone number (optional)</li>
                  <li>• Social media links</li>
                  <li>• Communication preferences</li>
                </ul>
              </div>
            </div>
          </div>
        )
      },
      {
        title: "Managing Email Preferences",
        keywords: ["notifications", "email", "preferences", "marketing", "updates", "reminders"],
        content: (
          <div className="space-y-4">
            <p>Control which emails you receive from Locked:</p>
            <ol className="list-decimal pl-5 space-y-2">
              <li>Sign in to your account</li>
              <li>Go to <strong>Profile Settings</strong> &gt; <strong>Notification Preferences</strong></li>
              <li>Toggle the switches for different notification types</li>
              <li>Click <strong>Save Changes</strong> to confirm</li>
            </ol>
            
            <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4 my-6">
              <h4 className="font-medium mb-2">Notification Types</h4>
              <ul className="text-sm space-y-2 text-neutral-600">
                <li>
                  <span className="font-medium text-neutral-800">Event Updates</span>
                  <p>Changes to events you're interested in or have tickets for</p>
                </li>
                <li>
                  <span className="font-medium text-neutral-800">Reminders</span>
                  <p>Notifications before events you're attending</p>
                </li>
                <li>
                  <span className="font-medium text-neutral-800">Marketing</span>
                  <p>Promotions, recommendations, and special offers</p>
                </li>
                <li>
                  <span className="font-medium text-neutral-800">Account Updates</span>
                  <p>Security alerts and important account information</p>
                </li>
              </ul>
            </div>
            
            <p className="text-sm text-neutral-500">
              Note: You cannot opt out of essential account emails like password resets or security notifications.
            </p>
          </div>
        )
      }
    ],
    security: [
      {
        title: "Password Management",
        keywords: ["password", "change", "reset", "forgot", "security"],
        content: (
          <div className="space-y-4">
            <p>Keeping your password secure is essential for protecting your account. Here's how to manage your password:</p>
            
            <h4 className="font-medium mt-6 mb-2">Changing Your Password</h4>
            <ol className="list-decimal pl-5 space-y-2">
              <li>Sign in to your account</li>
              <li>Go to <strong>Profile Settings</strong> &gt; <strong>Security</strong></li>
              <li>Click on <strong>Change Password</strong></li>
              <li>Enter your current password</li>
              <li>Create and confirm your new password</li>
              <li>Click <strong>Update Password</strong> to confirm</li>
            </ol>
            
            <h4 className="font-medium mt-6 mb-2">Forgot Your Password?</h4>
            <ol className="list-decimal pl-5 space-y-2">
              <li>Click <strong>Sign In</strong> at the top of the page</li>
              <li>Select <strong>Forgot Password</strong></li>
              <li>Enter the email address associated with your account</li>
              <li>Check your email for a password reset link</li>
              <li>Create a new password</li>
            </ol>
            
            <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4 my-6">
              <h4 className="font-medium mb-2">Strong Password Tips</h4>
              <ul className="text-sm space-y-1 text-neutral-600">
                <li>• Use at least 8 characters</li>
                <li>• Include uppercase and lowercase letters</li>
                <li>• Add numbers and special characters</li>
                <li>• Avoid using personal information</li>
                <li>• Don't reuse passwords from other sites</li>
              </ul>
            </div>
            
            <div className="mt-4">
              <Link 
                href="/auth/forgot-password" 
                className="text-primary font-medium hover:text-primary-dark"
              >
                Reset Your Password
              </Link>
            </div>
          </div>
        )
      },
      {
        title: "Account Security Settings",
        keywords: ["2fa", "two-factor", "authentication", "login history", "security", "sessions"],
        content: (
          <div className="space-y-4">
            <p>Enhance your account security with these additional settings and best practices:</p>
            
            <h4 className="font-medium mt-6 mb-2">Two-Factor Authentication (2FA)</h4>
            <p>Add an extra layer of security by enabling two-factor authentication:</p>
            <ol className="list-decimal pl-5 space-y-2">
              <li>Go to <strong>Profile Settings</strong> &gt; <strong>Security</strong></li>
              <li>Click <strong>Enable Two-Factor Authentication</strong></li>
              <li>Choose your preferred authentication method (SMS or authenticator app)</li>
              <li>Follow the instructions to complete the setup</li>
            </ol>
            
            <h4 className="font-medium mt-6 mb-2">Login History</h4>
            <p>Review your recent login activity:</p>
            <ol className="list-decimal pl-5 space-y-2">
              <li>Go to <strong>Profile Settings</strong> &gt; <strong>Security</strong></li>
              <li>View the <strong>Recent Login Activity</strong> section</li>
              <li>If you see any suspicious activity, change your password immediately</li>
            </ol>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 my-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-yellow-100 rounded-full">
                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                </div>
                <span className="font-medium text-yellow-800">Security Best Practices</span>
              </div>
              <ul className="text-sm space-y-2 text-yellow-700">
                <li>• Sign out when using shared or public computers</li>
                <li>• Don't share your account credentials with others</li>
                <li>• Update your password regularly</li>
                <li>• Be cautious of phishing attempts requesting your login information</li>
                <li>• Only access your account through the official Locked website or app</li>
              </ul>
            </div>
          </div>
        )
      },
      {
        title: "Privacy Settings",
        keywords: ["privacy", "visibility", "sharing", "data", "export", "delete data"],
        content: (
          <div className="space-y-4">
            <p>Control your privacy on Locked by managing these settings:</p>
            
            <h4 className="font-medium mt-6 mb-2">Profile Visibility</h4>
            <p>Determine who can see your profile information:</p>
            <ol className="list-decimal pl-5 space-y-2">
              <li>Go to <strong>Profile Settings</strong> &gt; <strong>Privacy</strong></li>
              <li>Adjust the visibility settings for different profile elements</li>
              <li>Choose from options like "Public," "Registered Users," or "Private"</li>
            </ol>
            
            <h4 className="font-medium mt-6 mb-2">Activity Sharing</h4>
            <p>Control what activities are visible to others:</p>
            <ol className="list-decimal pl-5 space-y-2">
              <li>Go to <strong>Profile Settings</strong> &gt; <strong>Privacy</strong></li>
              <li>Adjust settings for &quot;Events I'm Attending,&quot; &quot;Events I'm Interested In,&quot; etc.</li>
              <li>Toggle visibility for each activity type</li>
            </ol>
            
            <h4 className="font-medium mt-6 mb-2">Data Management</h4>
            <p>Manage your personal data:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Request a copy of your personal data</li>
              <li>Delete specific information from your profile</li>
              <li>Understand how your data is used by Locked</li>
            </ul>
            
            <div className="mt-4">
              <Link 
                href="/pages/legal/privacy-policy" 
                className="text-primary font-medium hover:text-primary-dark"
              >
                View Privacy Policy
              </Link>
            </div>
          </div>
        )
      },
      {
        title: "Account Deletion",
        keywords: ["delete", "remove", "close", "cancel account", "grace period", "restore"],
        content: (
          <div className="space-y-4">
            <p>If you wish to delete your account from Locked, follow these steps:</p>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 my-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-red-100 rounded-full">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                </div>
                <span className="font-medium text-red-800">Important Notice</span>
              </div>
              <p className="text-sm text-red-700 mb-2">
                Account deletion is permanent and cannot be undone. This will:
              </p>
              <ul className="text-sm space-y-1 text-red-700">
                <li>• Delete all your personal information</li>
                <li>• Remove access to tickets you've purchased</li>
                <li>• Cancel any upcoming event registrations</li>
                <li>• Remove your event history and locked events</li>
                <li>• Cancel any active organizer accounts and listings</li>
              </ul>
            </div>
            
            <h4 className="font-medium mt-6 mb-2">Deletion Process</h4>
            <ol className="list-decimal pl-5 space-y-2">
              <li>Sign in to your account</li>
              <li>Click on your profile picture and select <strong>Profile Settings</strong></li>
              <li>Go to the <strong>Security</strong> tab</li>
              <li>Scroll to the <strong>Delete Account</strong> section and click the button</li>
              <li>Read the information about account deletion</li>
              <li>Type <strong>DELETE ACCOUNT</strong> exactly as shown to confirm</li>
              <li>Click <strong>Delete Account</strong> to finalize the request</li>
            </ol>
            
            <p className="mt-4">
              After requesting deletion, you will be automatically logged out. Your account will be recoverable for a <strong>30-day grace period</strong>. During this time, you can contact our support team at <a href="mailto:lockedeventsgh@gmail.com" className="text-primary hover:underline">lockedeventsgh@gmail.com</a> if you wish to restore your account.
            </p>
            
            <h4 className="font-medium mt-6 mb-2">Need Assistance?</h4>
            <p>
              If you're having trouble deleting your account or have questions about the process, contact our support team.
            </p>
            
            <div className="mt-4">
              <Link 
                href="/contact" 
                className="text-primary font-medium hover:text-primary-dark inline-flex items-center gap-2"
              >
                Contact Support <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )
      },
    ],
    organizer: [
      {
        title: "Upgrading to an Organizer Account",
        keywords: ["organizer", "upgrade", "business", "verification", "application"],
        content: (
          <div className="space-y-4">
            <p>Organizer accounts allow you to create and manage events on Locked. Here's how to upgrade your account:</p>
            
            <h4 className="font-medium mt-6 mb-2">Upgrade Process</h4>
            <ol className="list-decimal pl-5 space-y-2">
              <li>Sign in to your existing account</li>
              <li>Go to <strong>Account Settings</strong> &gt; <strong>Become an Organizer</strong></li>
              <li>Fill out the required information about your organization</li>
              <li>Provide necessary verification documents</li>
              <li>Accept the organizer terms of service</li>
              <li>Submit your application</li>
            </ol>
            
            <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4 my-6">
              <h4 className="font-medium mb-2">Required Information</h4>
              <ul className="text-sm space-y-1 text-neutral-600">
                <li>• Organization name</li>
                <li>• Organization description</li>
                <li>• Contact information</li>
                <li>• Organization logo</li>
                <li>• Business registration details (for business organizers)</li>
              </ul>
            </div>
            
            <p>After submission, our team will review your application. This process typically takes 1-3 business days.</p>
            
            <div className="mt-4">
              <Link 
                href="/organizer/register" 
                className="bg-primary text-white px-4 py-2 rounded-md font-medium hover:bg-primary-dark inline-block"
              >
                Become an Organizer
              </Link>
            </div>
          </div>
        )
      },
      {
        title: "Managing Your Organizer Profile",
        keywords: ["organizer profile", "dashboard", "branding", "logo", "description"],
        content: (
          <div className="space-y-4">
            <p>Your organizer profile is how attendees learn about you and your events. Keep it updated with current information:</p>
            
            <h4 className="font-medium mt-6 mb-2">Updating Organizer Details</h4>
            <ol className="list-decimal pl-5 space-y-2">
              <li>Sign in to your account</li>
              <li>Go to <strong>Organizer Dashboard</strong> &gt; <strong>Profile</strong></li>
              <li>Edit your organization information, including:</li>
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li>Organization name and description</li>
                <li>Logo and banner images</li>
                <li>Contact information</li>
                <li>Social media links</li>
              </ul>
              <li>Click <strong>Save Changes</strong> to update your profile</li>
            </ol>
            
            <h4 className="font-medium mt-6 mb-2">Public Organizer Page</h4>
            <p>Your public organizer page shows attendees:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Your organization details</li>
              <li>Upcoming events</li>
              <li>Past events</li>
              <li>Reviews and ratings</li>
            </ul>
            <p className="text-sm text-neutral-500 mt-2">
              Tip: Preview your public organizer page to see how it appears to potential attendees
            </p>
            
            <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4 my-6">
              <h4 className="font-medium mb-2">Best Practices</h4>
              <ul className="text-sm space-y-2 text-neutral-600">
                <li>• Use a high-quality logo (recommended size: 500x500px)</li>
                <li>• Write a clear, concise organization description</li>
                <li>• Include all relevant contact information</li>
                <li>• Add social media links to build your following</li>
                <li>• Respond promptly to attendee messages</li>
              </ul>
            </div>
          </div>
        )
      },
      {
        title: "Billing & Payments",
        keywords: ["payouts", "billing", "payments", "earnings", "bank", "mobile money"],
        content: (
          <div className="space-y-4">
            <p>As an organizer, you can manage your payment settings and track your event earnings:</p>
            
            <h4 className="font-medium mt-6 mb-2">Setting Up Payment Methods</h4>
            <ol className="list-decimal pl-5 space-y-2">
              <li>Go to <strong>Organizer Dashboard</strong> &gt; <strong>Payment Settings</strong></li>
              <li>Click <strong>Add Payment Method</strong></li>
              <li>Choose from available options:</li>
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li>Bank account (for direct deposits)</li>
                <li>Mobile money (MTN, Telecel, etc.)</li>
              </ul>
              <li>Complete the required information</li>
              <li>Set your preferred payment method as default</li>
            </ol>
            
            <h4 className="font-medium mt-6 mb-2">Viewing Your Earnings</h4>
            <p>Track your event proceeds and payouts:</p>
            <ol className="list-decimal pl-5 space-y-2">
              <li>Go to <strong>Organizer Dashboard</strong> &gt; <strong>Financials</strong></li>
              <li>View summaries of ticket sales by event</li>
              <li>Check pending and completed payouts</li>
              <li>Download financial reports for your records</li>
            </ol>
            
            <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4 my-6">
              <h4 className="font-medium mb-2">Payment Schedule</h4>
              <p className="text-sm text-neutral-600 mb-2">
                Funds are typically disbursed according to this schedule:
              </p>
              <ul className="text-sm space-y-1 text-neutral-600">
                <li>• Events under 1000 attendees: 3 business days after event completion</li>
                <li>• Events with 1000+ attendees: 5 business days after event completion</li>
                <li>• Advance payouts may be available for qualifying organizers</li>
              </ul>
            </div>
            
            <p className="text-sm text-neutral-500">
              For specific questions about payouts or payment issues, please contact our <a href="/contact" className="text-primary">support team</a>.
            </p>
          </div>
        )
      }
    ],
    troubleshoot: [
      {
        title: "Can't Sign In",
        keywords: ["login", "signin", "access", "password", "forgot", "locked"],
        content: (
          <div className="space-y-4">
            <p>If you're having trouble signing in to your account, try these solutions:</p>
            
            <div className="grid grid-cols-1 gap-6 my-6">
              <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
                <h4 className="font-medium mb-3">Forgot Your Password</h4>
                <p className="text-sm text-neutral-600 mb-3">
                  If you can't remember your password:
                </p>
                <ol className="list-decimal pl-5 space-y-2 text-sm">
                  <li>Click <strong>Sign In</strong> at the top of the page</li>
                  <li>Select <strong>Forgot Password</strong></li>
                  <li>Enter the email address associated with your account</li>
                  <li>Check your email for a password reset link</li>
                  <li>Create a new password</li>
                </ol>
                <div className="mt-4">
                  <Link 
                    href="/auth/forgot-password" 
                    className="text-primary text-sm font-medium hover:text-primary-dark"
                  >
                    Reset Password
                  </Link>
                </div>
              </div>

              <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
                <h4 className="font-medium mb-3">Email Not Recognized</h4>
                <p className="text-sm text-neutral-600 mb-3">
                  If the system doesn't recognize your email address:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-sm">
                  <li>Check for typos in the email address</li>
                  <li>Try any other email addresses you might have used</li>
                  <li>Check if you signed up using a social account (Google, Facebook)</li>
                  <li>Make sure you've created an account and didn't just browse as a guest</li>
                </ul>
              </div>

              <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
                <h4 className="font-medium mb-3">Account Locked</h4>
                <p className="text-sm text-neutral-600 mb-3">
                  Your account may be temporarily locked after multiple failed login attempts:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-sm">
                  <li>Wait 30 minutes and try again</li>
                  <li>Use the password reset option to regain access</li>
                  <li>Check your email for any security notifications</li>
                </ul>
              </div>
            </div>
            
            <p>If you're still unable to access your account, contact our support team for assistance.</p>
            
            <div className="mt-4">
              <Link 
                href="/contact" 
                className="text-primary font-medium hover:text-primary-dark inline-flex items-center gap-2"
              >
                Contact Support <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )
      },
      {
        title: "Updating Account Information",
        keywords: ["update", "change", "edit", "name", "email", "profile", "photo"],
        content: (
          <div className="space-y-4">
            <p>Having trouble updating your account information? Here are some common issues and solutions:</p>
            
            <h4 className="font-medium mt-6 mb-2">Email Address Changes</h4>
            <p>To change the email address associated with your account:</p>
            <ol className="list-decimal pl-5 space-y-2">
              <li>Sign in to your account</li>
              <li>Go to <strong>Profile Settings</strong> &gt; <strong>Account</strong></li>
              <li>Update your email address</li>
              <li>A verification email will be sent to the new address</li>
              <li>Click the verification link to confirm the change</li>
            </ol>
            <p className="text-sm text-neutral-500 mt-2">
              Note: You must verify your new email address before the change takes effect
            </p>
            
            <h4 className="font-medium mt-6 mb-2">Name Changes</h4>
            <p>If you need to update your name:</p>
            <ol className="list-decimal pl-5 space-y-2">
              <li>Go to <strong>Profile Settings</strong> &gt; <strong>Personal Information</strong></li>
              <li>Update your first and last name</li>
              <li>Click <strong>Save Changes</strong></li>
            </ol>
            <p className="text-sm text-neutral-500 mt-2">
              For organizer accounts, name changes may require additional verification
            </p>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 my-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-yellow-100 rounded-full">
                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                </div>
                <span className="font-medium text-yellow-800">Common Issues</span>
              </div>
              <ul className="text-sm space-y-2 text-yellow-700">
                <li>• <strong>Changes not saving:</strong> Refresh the page and try again</li>
                <li>• <strong>Verification email not received:</strong> Check spam folder or request a new verification email</li>
                <li>• <strong>Error messages:</strong> Make sure all required fields are filled correctly</li>
                <li>• <strong>Profile photo not uploading:</strong> Ensure the image is under 5MB and in JPG, PNG, or GIF format</li>
              </ul>
            </div>
          </div>
        )
      }
    ]
  };

  const faqs = [
    {
      question: "How do I change my email address?",
      answer: "To change your email address, go to Profile Settings &gt; Account &gt; Update Email. You'll receive a verification email at your new address. Click the verification link to complete the change."
    },
    {
      question: "Can I have multiple accounts with the same email?",
      answer: "No, each email address can only be associated with one account on Locked. If you need separate accounts for personal use and as an organizer, you'll need to use different email addresses."
    },
    {
      question: "How do I reset my password if I can't access my email?",
      answer: "If you can't access the email associated with your account, contact our support team through the Contact page. You'll need to verify your identity before we can help you regain access to your account."
    },
    {
      question: "How do I merge multiple accounts?",
      answer: "Currently, Locked doesn't support merging accounts. If you have multiple accounts, we recommend choosing one to keep active and deleting the others. Make sure to transfer any important information or tickets first."
    },
    {
      question: "How do I change my account from personal to organizer?",
      answer: "You can upgrade to an organizer account by going to Account Settings > Become an Organizer. You'll need to provide additional information about your organization for verification purposes."
    },
    {
      question: "How do I delete my account?",
      answer: "To delete your account, go to Profile Settings > Security and scroll to the 'Delete Account' section. You'll need to confirm by typing 'DELETE ACCOUNT'. Note that there is a 30-day grace period during which you can contact support to restore your account."
    }
  ];

  // Filter content based on search query
  const isSearching = searchQuery.trim() !== '';
  const searchLower = searchQuery.toLowerCase();

  const allHelpItems = Object.entries(helpContent).flatMap(([category, items]) => 
    items.map(item => ({ ...item, category }))
  );

  const searchResults = allHelpItems.filter(item => 
    item.title.toLowerCase().includes(searchLower) ||
    item.keywords?.some(kw => kw.toLowerCase().includes(searchLower)) ||
    (typeof item.content === 'string' && item.content.toLowerCase().includes(searchLower))
  );

  // Filter FAQs based on search query
  const filteredFaqs = !isSearching
    ? faqs
    : faqs.filter(faq => 
        faq.question.toLowerCase().includes(searchLower) || 
        faq.answer.toLowerCase().includes(searchLower)
      );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-primary text-white py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold mb-4 mt-24">Account Help Center</h1>
          <p className="text-white/80 max-w-2xl">
            Find information and guidance on managing your Locked account, 
            security settings, and troubleshooting common issues.
          </p>
          
          {/* Search Box */}
          <div className="max-w-xl mt-8 relative">
            <div className="bg-white rounded-full shadow-lg flex items-center px-4 py-2">
              <Search className="h-5 w-5 text-gray-400 mr-2" />
              <input
                type="text"
                placeholder="Search for help topics..."
                className="flex-grow bg-transparent outline-none text-gray-800"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Clear search</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Topic Sidebar */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-4 sticky top-8">
              <h2 className="text-lg font-semibold mb-4">Help Topics</h2>
              <nav className="space-y-1">
                {topics.map(topic => (
                  <button
                    key={topic.id}
                    onClick={() => setActiveTab(topic.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition ${
                      activeTab === topic.id
                        ? 'bg-primary text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span className={activeTab === topic.id ? 'text-white' : 'text-primary'}>
                      {topic.icon}
                    </span>
                    <span>{topic.name}</span>
                  </button>
                ))}
              </nav>

              <div className="border-t border-gray-200 my-4 pt-4">
                <h3 className="font-medium mb-2">Need more help?</h3>
                <Link 
                  href="/contact" 
                  className="text-primary hover:text-primary-dark font-medium inline-flex items-center gap-2"
                >
                  Contact Support <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="md:col-span-3">
            {/* Display message when search has no results */}
            {isSearching && 
              searchResults.length === 0 && 
              filteredFaqs.length === 0 && (
                <div className="bg-white rounded-xl p-8 shadow-sm text-center">
                  <h3 className="text-xl font-semibold mb-2">No results found</h3>
                  <p className="text-gray-600 mb-4">
                    We couldn't find any help articles matching "{searchQuery}".
                  </p>
                  <button 
                    className="text-primary font-medium"
                    onClick={() => setSearchQuery('')}
                  >
                    Clear search
                  </button>
                </div>
            )}

            {/* Help content */}
            {(!isSearching || searchResults.length > 0) && (
              <div className="space-y-8">
                <h2 className="text-2xl font-bold mb-6">
                  {isSearching 
                    ? `Search Results for "${searchQuery}"` 
                    : topics.find(t => t.id === activeTab)?.name}
                </h2>
                
                {(isSearching ? searchResults : helpContent[activeTab]).map((item, index) => (
                  <div key={index} className="bg-white rounded-xl p-6 shadow-sm">
                    {isSearching && (
                      <span className="text-xs font-semibold uppercase tracking-wider text-primary mb-2 block">
                        {topics.find(t => t.id === (item as any).category)?.name}
                      </span>
                    )}
                    <h3 className="text-xl font-semibold mb-4">{item.title}</h3>
                    <div className="prose max-w-none">{item.content}</div>
                  </div>
                ))}
              </div>
            )}

            {/* FAQs */}
            {(!searchQuery.trim() || filteredFaqs.length > 0) && (
              <div className="mt-12">
                <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                  {filteredFaqs.map((faq, index) => (
                    <div key={index} className="border-b border-gray-200 last:border-0">
                      <button
                        onClick={() => toggleFaq(index)}
                        className="w-full flex justify-between items-center p-6 text-left focus:outline-none"
                      >
                        <h3 className="text-lg font-semibold">{faq.question}</h3>
                        {openFaqIndex === index ? (
                          <ChevronUp className="w-5 h-5 text-gray-500" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-500" />
                        )}
                      </button>
                      <div
                        className={`px-6 overflow-hidden transition-all duration-300 ${
                          openFaqIndex === index ? 'max-h-96 pb-6' : 'max-h-0'
                        }`}
                      >
                        <p className="text-gray-600">{faq.answer}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Related Help Pages */}
            <div className="mt-12">
              <h2 className="text-2xl font-bold mb-6">Related Help Pages</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Link href="/faqs">
                  <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-primary/10 rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                          <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                      </div>
                      <h3 className="font-semibold text-lg">Frequently Asked Questions</h3>
                    </div>
                    <p className="text-gray-600">Browse our comprehensive FAQ section for quick answers to common questions.</p>
                  </div>
                </Link>

                <Link href="/help/booking">
                  <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-primary/10 rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                      </div>
                      <h3 className="font-semibold text-lg">Booking Help</h3>
                    </div>
                    <p className="text-gray-600">Learn how to book events, manage your tickets, and handle event changes.</p>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}