"use client";

import { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Mail, 
  Send, 
  Users, 
  Filter,
  Search,
  Plus,
  Copy,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  RefreshCw,
  ChartBar,
  Eye,
  X,
  Upload,
  FileText,
  Edit2,
  Settings
} from 'lucide-react';
import { useToast } from '@/hooks/useToast';

// Update the Message interface
interface Message {
  id: string;
  type: 'email' | 'sms';
  subject: string;
  content: string;
  recipients: number;
  sentAt: string;
  status: 'sent' | 'failed' | 'pending';
  // Add analytics fields
  analytics: {
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    failed: number;
    lastUpdated: string;
  };
  category?: string;
  attachments?: Array<{
    name: string;
    size: number;
    type: string;
    url: string;
  }>;
}

// Add template management interface
interface Template {
  id: string;
  name: string;
  type: 'email' | 'sms';
  subject: string;
  content: string;
  category?: string;
  createdAt: string;
  updatedAt: string;
}

// Reusable confirmation modal component
const ConfirmationModal = ({ title, message, onConfirm, onCancel }: {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
    <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-xl max-w-md w-full p-6 animate-in fade-in duration-200">
      <h3 className="text-lg font-bold mb-2 dark:text-gray-100">{title}</h3>
      <p className="text-gray-600 dark:text-gray-400 mb-6">{message}</p>
      <div className="flex justify-end gap-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 dark:border-neutral-800 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-700 cursor-pointer"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 cursor-pointer"
        >
          Delete
        </button>
      </div>
    </div>
  </div>
);

// Template Management Modal Component
const TemplateManagementModal = ({ 
  onClose, 
  templates,
  onCreateTemplate,
  onUpdateTemplate,
  onDeleteTemplate,
  onSelectTemplate
}: { 
  onClose: () => void;
  templates: Template[];
  onCreateTemplate: () => void;
  onUpdateTemplate: (template: Template) => void;
  onDeleteTemplate: (id: string) => void;
  onSelectTemplate: (template: Template) => void;
}) => {
  const [showDeleteTemplateConfirmation, setShowDeleteTemplateConfirmation] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden animate-in fade-in duration-200">
        <div className="border-b border-gray-200 dark:border-neutral-800 p-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold dark:text-gray-100">Message Templates</h3>
          <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-4 flex justify-between items-center">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {templates.length} templates available
          </div>
          <button 
            onClick={onCreateTemplate}
            className="flex items-center gap-2 px-3 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Create Template</span>
          </button>
        </div>
        
        <div className="overflow-y-auto max-h-[calc(90vh-14rem)]">
          {templates.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 p-4">
              {templates.map(template => (
                <div key={template.id} className="border border-gray-200 dark:border-neutral-800 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors">
                  <div className="flex justify-between">
                    <h4 className="font-medium dark:text-gray-100">{template.name}</h4>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => onSelectTemplate(template)}
                        className="text-primary hover:text-primary-dark"
                        title="Use template"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => onUpdateTemplate(template)}
                        className="text-amber-500 hover:text-amber-600"
                        title="Edit template"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => setShowDeleteTemplateConfirmation(template.id)}
                        className="text-red-500 hover:text-red-600"
                        title="Delete template"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    {template.type === 'email' ? (
                      <div className="flex items-center">
                        <Mail className="h-3 w-3 mr-1" /> Email
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <MessageSquare className="h-3 w-3 mr-1" /> SMS
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                    {template.subject}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Last updated: {new Date(template.updatedAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-gray-500 dark:text-gray-400">
              <div className="flex flex-col items-center">
                <FileText className="h-8 w-8 text-gray-300 dark:text-gray-600 mb-2" />
                <p>No templates yet</p>
                <button 
                  onClick={onCreateTemplate}
                  className="mt-2 text-primary hover:text-primary-dark text-sm font-medium"
                >
                  Create your first template
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Confirmation modal for template deletion */}
      {showDeleteTemplateConfirmation && (
        <ConfirmationModal
          title="Delete Template"
          message="Are you sure you want to delete this template? This action cannot be undone."
          onConfirm={() => {
            onDeleteTemplate(showDeleteTemplateConfirmation);
            setShowDeleteTemplateConfirmation(null);
          }}
          onCancel={() => setShowDeleteTemplateConfirmation(null)}
        />
      )}
    </div>
  );
};

// Template Form Modal Component
const TemplateFormModal = ({ 
  template, 
  onClose, 
  onSave 
}: { 
  template: Template | null;
  onClose: () => void;
  onSave: (data: Partial<Template>) => void;
}) => {
  const [name, setName] = useState(template?.name || '');
  const [type, setType] = useState<'email' | 'sms'>(template?.type || 'email');
  const [subject, setSubject] = useState(template?.subject || '');
  const [content, setContent] = useState(template?.content || '');
  const [category, setCategory] = useState(template?.category || '');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name,
      type,
      subject,
      content,
      category
    });
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-in fade-in duration-200">
        <div className="border-b border-gray-200 dark:border-neutral-800 p-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold dark:text-gray-100">
            {template ? 'Edit Template' : 'Create Template'}
          </h3>
          <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)]">
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Template Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-neutral-800 rounded-md shadow-sm text-sm focus:outline-none focus:ring-primary focus:border-primary bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100"
                required
              />
            </div>
            
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Template Type
              </label>
              <select
                id="type"
                value={type}
                onChange={(e) => setType(e.target.value as 'email' | 'sms')}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-neutral-800 rounded-md shadow-sm text-sm focus:outline-none focus:ring-primary focus:border-primary bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100"
                required
              >
                <option value="email">Email</option>
                <option value="sms">SMS</option>
              </select>
            </div>
            
            {type === 'email' && (
              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Subject
                </label>
                <input
                  id="subject"
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 dark:border-neutral-800 rounded-md shadow-sm text-sm focus:outline-none focus:ring-primary focus:border-primary bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100"
                  required
                />
              </div>
            )}
            
            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Content
              </label>
              <textarea
                id="content"
                rows={8}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-neutral-800 rounded-md shadow-sm text-sm focus:outline-none focus:ring-primary focus:border-primary bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100"
                required
              ></textarea>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                You can use placeholders like <code>{"{{name}}"}</code>, <code>{"{{email}}"}</code>
              </p>
            </div>
            
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category
              </label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-neutral-800 rounded-md shadow-sm text-sm focus:outline-none focus:ring-primary focus:border-primary bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100"
              >
                <option value="">No Category</option>
                <option value="marketing">Marketing</option>
                <option value="announcement">Announcement</option>
                <option value="update">System Update</option>
                <option value="newsletter">Newsletter</option>
                <option value="event">Event</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-neutral-800 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-neutral-900 hover:bg-gray-50 dark:hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              {template ? 'Update Template' : 'Create Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function CommunicationsPage() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'email' | 'sms'>('email');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sentMessages, setSentMessages] = useState<Message[]>([]);
  const [filteredMessages, setFilteredMessages] = useState<Message[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  
  const [users, setUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  
  // New state for added features
  const [templates, setTemplates] = useState<Template[]>([]);

  // Add these state variables to the CommunicationsPage component
  const [showDeleteTemplateConfirmation, setShowDeleteTemplateConfirmation] = useState<string | null>(null);
  const [showDeleteMessageConfirmation, setShowDeleteMessageConfirmation] = useState<string | null>(null);
  const [showBulkDeleteConfirmation, setShowBulkDeleteConfirmation] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);

  // Load sent messages from localStorage
  useEffect(() => {
    try {
      const storedMessages = localStorage.getItem('admin_sent_messages');
      if (storedMessages) {
        setSentMessages(JSON.parse(storedMessages));
      } else {
        // Initialize with empty array if no messages found
        setSentMessages([]);
      }
    } catch (error) {
      console.error('Error loading sent messages:', error);
      setSentMessages([]);
    }
  }, []);
  
  // Load users from localStorage
  useEffect(() => {
    try {
      const usersData = localStorage.getItem('locked_users');
      if (usersData) {
        const usersObj = JSON.parse(usersData);
        const usersList = Object.values(usersObj).map((user: any) => ({
          id: user.id,
          name: user.name || 'Unknown',
          email: user.email || '',
          phone: user.phoneNumber || '',
          role: user.role || 'User',
          status: user.status || 'active'
        }));
        setUsers(usersList);
        setFilteredUsers(usersList);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  }, []);
  
  // Load templates from localStorage in useEffect
  useEffect(() => {
    try {
      const storedTemplates = localStorage.getItem('message_templates');
      if (storedTemplates) {
        setTemplates(JSON.parse(storedTemplates));
      } else {
        // Initialize with default templates
        setTemplates([...templates]);
        localStorage.setItem('message_templates', JSON.stringify(templates));
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  }, []);
  
  // Save templates to localStorage when updated
  useEffect(() => {
    if (templates.length > 0) {
      localStorage.setItem('message_templates', JSON.stringify(templates));
    }
  }, [templates]);
  
  // Apply filters and search
  useEffect(() => {
    let result = [...users];
    
    // Apply role filter
    if (filter !== 'all') {
      result = result.filter(user => user.role.toLowerCase() === filter.toLowerCase());
    }
    
    // Apply search
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(user =>
        user.name.toLowerCase().includes(lowerSearch) ||
        user.email.toLowerCase().includes(lowerSearch)
      );
    }
    
    setFilteredUsers(result);
  }, [users, filter, searchTerm]);
  
  // Add filtering logic
  useEffect(() => {
    let filtered = [...sentMessages];
    
    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(message => message.category === categoryFilter);
    }
    
    setFilteredMessages(filtered);
  }, [sentMessages, categoryFilter]);
  
  // Calculate counts for different segments
  const userCount = users.length;
  const activeUserCount = users.filter(u => u.status === 'active').length;
  const organizerCount = users.filter(u => u.role === 'organizer').length;
  
  // Sample templates
  const sampleTemplates = [
    { id: 'welcome', name: 'Welcome Email', subject: 'Welcome to Locked!', content: "Hello {{name}},\n\nWelcome to Locked! We're excited to have you on board..." },
    { id: 'event_reminder', name: 'Event Reminder', subject: 'Reminder: Your upcoming event', content: 'Hello {{name}},\n\nThis is a reminder about your upcoming event...' },
    { id: 'account_update', name: 'Account Update', subject: 'Important: Update to your account', content: 'Hello {{name}},\n\nWe wanted to inform you about an important update to your account...' }
  ];
  
  // Handle template selection
  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const templateId = e.target.value;
    setSelectedTemplate(templateId);
    
    if (templateId) {
      const template = templates.find(t => t.id === templateId);
      if (template) {
        setSubject(template.subject);
        setMessage(template.content);
      }
    }
  };
  
  // Toggle user selection
  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };
  
  // Select all visible users
  const selectAllVisible = () => {
    setSelectedUsers(filteredUsers.map(user => user.id));
  };
  
  // Clear selection
  const clearSelection = () => {
    setSelectedUsers([]);
  };
  
  // Add a function to handle message selection
  const toggleMessageSelection = (messageId: string) => {
    setSelectedMessages(prev => 
      prev.includes(messageId) 
        ? prev.filter(id => id !== messageId)
        : [...prev, messageId]
    );
  };
  
  // Function to select all messages
  const selectAllMessages = () => {
    const visibleMessages = sentMessages.filter(msg => 
      categoryFilter === 'all' || msg.category === categoryFilter
    );
    setSelectedMessages(visibleMessages.map(msg => msg.id));
  };
  
  // Function to clear selection
  const clearMessageSelection = () => {
    setSelectedMessages([]);
  };
  
  // Function to delete selected messages
  const deleteSelectedMessages = () => {
    const updatedMessages = sentMessages.filter(msg => !selectedMessages.includes(msg.id));
    setSentMessages(updatedMessages);
    localStorage.setItem('admin_sent_messages', JSON.stringify(updatedMessages));
    toast.showSuccess('Messages Deleted', `${selectedMessages.length} messages deleted`);
    setSelectedMessages([]);
    setShowBulkDeleteConfirmation(false);
  };
  
  // Handle message sending
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    
    // Get selected users' details
    const selectedUsersData = users.filter(user => selectedUsers.includes(user.id));
    
    setTimeout(() => {
      try {
        // Process attachments if any
        const processedAttachments = attachments.map(file => ({
          name: file.name,
          size: file.size,
          type: file.type,
          // In a real app, you'd upload files to storage and store URLs
          // This is just a mock representation
          url: URL.createObjectURL(file)
        }));
        
        // Create message record with new fields
        const newMessage: Message = {
          id: `msg-${Date.now()}`,
          type: activeTab,
          subject: activeTab === 'email' ? subject : message.substring(0, 20) + '...',
          content: message,
          recipients: selectedUsers.length,
          sentAt: new Date().toISOString(),
          status: 'sent',
          category: selectedCategory,
          analytics: {
            delivered: Math.floor(selectedUsers.length * 0.98), // Simulated stats
            opened: Math.floor(selectedUsers.length * 0.65),
            clicked: Math.floor(selectedUsers.length * 0.25),
            bounced: Math.floor(selectedUsers.length * 0.01),
            failed: Math.floor(selectedUsers.length * 0.01),
            lastUpdated: new Date().toISOString()
          },
          attachments: activeTab === 'email' ? processedAttachments : undefined
        };
        
        // Update state with new message
        const updatedMessages = [newMessage, ...sentMessages];
        setSentMessages(updatedMessages);
        
        // Store in localStorage
        localStorage.setItem('admin_sent_messages', JSON.stringify(updatedMessages));
        
        // Reset form
        setSubject('');
        setMessage('');
        setSelectedTemplate('');
        setSelectedUsers([]);
        setAttachments([]);
        setSelectedCategory('');
        
        toast.showSuccess('Messages Sent', `${selectedUsersData.length} ${activeTab === 'email' ? 'emails' : 'SMS messages'} sent successfully!`);
      } catch (error) {
        toast.showError('Send Failed', `Failed to send ${activeTab === 'email' ? 'emails' : 'SMS messages'}`);
        console.error('Error sending messages:', error);
      } finally {
        setIsSending(false);
      }
    }, 1500);
  };
  
  // Format date helper
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  // Copy message content
  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.showSuccess('Copied', 'Message copied to clipboard');
  };
  
  // Delete message
  const handleDeleteMessage = (id: string) => {
    setShowDeleteMessageConfirmation(id);
  };
  
  // Add actual delete function
  const confirmDeleteMessage = (id: string) => {
    const updatedMessages = sentMessages.filter(msg => msg.id !== id);
    setSentMessages(updatedMessages);
    localStorage.setItem('admin_sent_messages', JSON.stringify(updatedMessages));
    toast.showSuccess('Message Deleted', 'Message deleted successfully');
    setShowDeleteMessageConfirmation(null);
  };
  
  // Add confirmation modals
  {showDeleteMessageConfirmation && (
    <ConfirmationModal
      title="Delete Message"
      message="Are you sure you want to delete this message? This action cannot be undone."
      onConfirm={() => confirmDeleteMessage(showDeleteMessageConfirmation)}
      onCancel={() => setShowDeleteMessageConfirmation(null)}
    />
  )}

  {showBulkDeleteConfirmation && (
    <ConfirmationModal
      title="Delete Selected Messages"
      message={`Are you sure you want to delete ${selectedMessages.length} messages? This action cannot be undone.`}
      onConfirm={deleteSelectedMessages}
      onCancel={() => setShowBulkDeleteConfirmation(false)}
    />
  )}
  
  // Add a delivery analytics modal component
  const MessageAnalyticsModal = ({ message, onClose }: { message: Message; onClose: () => void }) => {
    const modalRef = useRef<HTMLDivElement>(null);
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div ref={modalRef} className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 animate-in fade-in duration-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">Message Analytics</h3>
            <button onClick={onClose} className="p-1 rounded-md text-gray-500 hover:bg-gray-100">
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="mb-4">
            <h4 className="font-medium">{message.subject}</h4>
            <p className="text-sm text-gray-500">Sent on {formatDate(message.sentAt)}</p>
          </div>
          
          <div className="grid grid-cols-5 gap-4 mb-6">
            <div className="bg-blue-50 p-3 rounded-lg text-center">
              <div className="text-xl font-bold text-blue-600">{message.recipients}</div>
              <div className="text-xs text-gray-600">Recipients</div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg text-center">
              <div className="text-xl font-bold text-green-600">{message.analytics.delivered}</div>
              <div className="text-xs text-gray-600">Delivered</div>
            </div>
            <div className="bg-amber-50 p-3 rounded-lg text-center">
              <div className="text-xl font-bold text-amber-600">{message.analytics.opened}</div>
              <div className="text-xs text-gray-600">Opened</div>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg text-center">
              <div className="text-xl font-bold text-purple-600">{message.analytics.clicked}</div>
              <div className="text-xs text-gray-600">Clicked</div>
            </div>
            <div className="bg-red-50 p-3 rounded-lg text-center">
              <div className="text-xl font-bold text-red-600">{message.analytics.bounced + message.analytics.failed}</div>
              <div className="text-xs text-gray-600">Failed</div>
            </div>
          </div>
          
          {/* Add visualization charts here */}
          <div className="h-48 border rounded-md bg-gray-50 flex items-center justify-center mb-4">
            <p className="text-gray-500">Delivery performance chart</p>
          </div>
          
          <div className="text-xs text-gray-500 text-right">
            Last updated: {formatDate(message.analytics.lastUpdated)}
          </div>
        </div>
      </div>
    );
  };
  
  const [analyticsMessage, setAnalyticsMessage] = useState<Message | null>(null);
  
  // New state for added features
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [isTemplateFormOpen, setIsTemplateFormOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedMessageForAnalytics, setSelectedMessageForAnalytics] = useState<Message | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sample data for previews
  const previewData = {
    name: "John Doe",
    email: "john.doe@example.com",
    phone: "+1234567890",
    id: "user123"
  };

  // Preview function
  const generatePreview = (content: string, data: any) => {
    let previewText = content;
    
    // Replace all personalization tags with sample data
    Object.keys(data).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      previewText = previewText.replace(regex, data[key]);
    });
    
    return previewText;
  };
  
  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const fileList = Array.from(e.target.files);
      setAttachments(prev => [...prev, ...fileList]);
    }
  };

  // Remove attachment
  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };
  
  // Toggle template manager
  const toggleTemplateManager = () => {
    setShowTemplateManager(prev => !prev);
  };
  
  // Handle template creation
  const handleCreateTemplate = () => {
    setEditingTemplate(null);
    setIsTemplateFormOpen(true);
  };
  // ConfirmationModal has been moved to the top of the file
  
  // The ConfirmationModal component is already defined at the top of the file
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold dark:text-gray-100">Communications</h1>
        <button 
          onClick={() => {
            // Refresh data
            const storedMessages = localStorage.getItem('admin_sent_messages');
            if (storedMessages) {
              setSentMessages(JSON.parse(storedMessages));
            }
          }}
          className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-600 rounded-md text-gray-700 dark:text-gray-300 transition-colors cursor-pointer"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Refresh</span>
        </button>
      </div>
      
      {/* Message Type Tabs */}
      <div className="bg-white dark:bg-neutral-900 rounded-lg border border-gray-200 dark:border-neutral-800 overflow-hidden">
        <div className="flex border-b border-gray-200 dark:border-neutral-800">
          <button
            className={`px-6 py-3 text-sm font-medium cursor-pointer ${
              activeTab === 'email' 
                ? 'text-primary border-b-2 border-primary' 
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
            onClick={() => setActiveTab('email')}
          >
            <div className="flex items-center">
              <Mail className="mr-2 h-4 w-4" />
              Email
            </div>
          </button>
          <button
            className={`px-6 py-3 text-sm font-medium cursor-pointer ${
              activeTab === 'sms' 
                ? 'text-primary border-b-2 border-primary' 
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
            onClick={() => setActiveTab('sms')}
          >
            <div className="flex items-center">
              <MessageSquare className="mr-2 h-4 w-4" />
              SMS
            </div>
          </button>
        </div>
        
        {/* Main content */}
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* User Selection Panel */}
            <div className="lg:col-span-1 border border-gray-200 dark:border-neutral-800 rounded-lg overflow-hidden">
              <div className="bg-gray-50 dark:bg-neutral-800 px-4 py-3 border-b border-gray-200 dark:border-neutral-800">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Select Recipients</h3>
                  <div className="flex gap-2">
                    {selectedUsers.length > 0 ? (
                      <button 
                        className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 px-2 py-1 bg-gray-200 dark:bg-neutral-600 hover:bg-gray-300 dark:hover:bg-neutral-500 rounded cursor-pointer transition-colors"
                        onClick={clearSelection}
                      >
                        Clear ({selectedUsers.length})
                      </button>
                    ) : (
                      <button 
                        className="text-xs text-primary hover:text-primary-dark px-2 py-1 bg-primary/10 hover:bg-primary/20 rounded cursor-pointer transition-colors"
                        onClick={selectAllVisible}
                      >
                        Select All
                      </button>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Search and filter */}
              <div className="p-4 border-b border-gray-200 dark:border-neutral-800">
                <div className="mb-3">
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                    </div>
                    <input
                      type="text"
                      placeholder="Search users..."
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-neutral-800 rounded-md text-sm focus:outline-none focus:ring-primary focus:border-primary bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="filter" className="sr-only">Filter by role</label>
                  <div className="relative">
                    <select
                      id="filter"
                      className="block w-full pl-3 pr-10 py-2 border border-gray-300 dark:border-neutral-800 rounded-md text-sm focus:outline-none focus:ring-primary focus:border-primary cursor-pointer bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100"
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                    >
                      <option value="all">All Users</option>
                      <option value="user">Regular Users</option>
                      <option value="organizer">Organizers</option>
                      <option value="venue_owner">Venue Owners</option>
                      <option value="admin">Admins</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                      <Filter className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* User list */}
              <div className="overflow-y-auto h-64">
                {filteredUsers.length > 0 ? (
                  <ul className="divide-y divide-gray-200 dark:divide-neutral-700">
                    {filteredUsers.map(user => (
                      <li key={user.id} className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-neutral-700 cursor-pointer">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            className="h-4 w-4 text-primary focus:ring-primary border-gray-300 dark:border-neutral-800 rounded cursor-pointer"
                            checked={selectedUsers.includes(user.id)}
                            onChange={() => toggleUserSelection(user.id)}
                            id={`user-${user.id}`}
                          />
                          <label 
                            htmlFor={`user-${user.id}`}
                            className="ml-3 block cursor-pointer"
                          >
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {activeTab === 'email' ? user.email : user.phone || 'No phone number'}
                            </div>
                          </label>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                    No users found matching your criteria
                  </div>
                )}
              </div>
              
              {/* User selection summary */}
              <div className="bg-gray-50 dark:bg-neutral-800 px-4 py-3 border-t border-gray-200 dark:border-neutral-800">
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  {selectedUsers.length} {selectedUsers.length === 1 ? 'recipient' : 'recipients'} selected
                </div>
              </div>
            </div>
            
            {/* Compose Message Panel */}
            <div className="lg:col-span-2 border border-gray-200 dark:border-neutral-800 rounded-lg overflow-hidden">
              <div className="bg-gray-50 dark:bg-neutral-800 px-4 py-3 border-b border-gray-200 dark:border-neutral-800">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {activeTab === 'email' ? 'Compose Email' : 'Compose SMS'}
                </h3>
              </div>
              
              <div className="p-6">
                <form onSubmit={handleSendMessage} className="space-y-4">
                  {/* Templates */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label htmlFor="template" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Message Template
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowTemplateManager(true)}
                        className="text-xs bg-black dark:bg-black text-white px-3 py-1.5 rounded-md hover:bg-gray-800 dark:hover:bg-gray-800 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Settings className="h-3 w-3" />
                        Manage Templates
                      </button>
                    </div>
                    <select
                      id="template"
                      className="block w-full px-3 py-2 border border-gray-300 dark:border-neutral-800 rounded-md shadow-sm text-sm focus:outline-none focus:ring-primary focus:border-primary cursor-pointer bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100"
                      value={selectedTemplate}
                      onChange={handleTemplateChange}
                    >
                      <option value="">Select a template</option>
                      {templates.map(template => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Subject - only for email */}
                  {activeTab === 'email' && (
                    <div>
                      <label htmlFor="subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Subject
                      </label>
                      <input
                        type="text"
                        id="subject"
                        className="block w-full px-3 py-2 border border-gray-300 dark:border-neutral-800 rounded-md shadow-sm text-sm focus:outline-none focus:ring-primary focus:border-primary bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                        placeholder="Message subject"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        required
                      />
                    </div>
                  )}
                  
                  {/* Message content */}
                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Message
                    </label>
                    <textarea
                      id="message"
                      rows={activeTab === 'sms' ? 4 : 8}
                      className="block w-full px-3 py-2 border border-gray-300 dark:border-neutral-800 rounded-md shadow-sm text-sm focus:outline-none focus:ring-primary focus:border-primary bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                      placeholder="Type your message here..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      required
                    ></textarea>
                    {activeTab === 'sms' && (
                      <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {message.length} / 160 characters
                      </div>
                    )}
                  </div>
                  
                  {/* Helper text */}
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    <p>Available placeholders: <code>{"{{name}}"}</code>, <code>{"{{email}}"}</code></p>
                  </div>
                  
                  {/* File attachment UI for email only */}
                  {activeTab === 'email' && (
                    <div className="mt-4">
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Attachments
                        </label>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-xs bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-neutral-600 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Upload className="h-3.5 w-3.5" />
                          Add File
                        </button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          className="hidden"
                          onChange={handleFileSelect}
                          multiple
                        />
                      </div>
                      
                      {/* Display selected files */}
                      {attachments.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {attachments.map((file, index) => (
                            <div key={index} className="flex items-center justify-between bg-gray-50 dark:bg-neutral-800 px-3 py-2 rounded-md">
                              <div className="flex items-center space-x-2">
                                <div className="p-1.5 bg-gray-200 dark:bg-neutral-600 rounded">
                                  <FileText className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                                </div>
                                <div>
                                  <div className="text-sm font-medium truncate max-w-[200px] dark:text-gray-100">{file.name}</div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">{(file.size / 1024).toFixed(1)} KB</div>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeAttachment(index)}
                                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Add category selection to compose form */}
                  <div>
                    <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Category
                    </label>
                    <div className="relative">
                      <select
                        id="category"
                        className="block w-full px-3 py-2 border border-gray-300 dark:border-neutral-800 rounded-md shadow-sm text-sm focus:outline-none focus:ring-primary focus:border-primary cursor-pointer bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100"
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                      >
                        <option value="">No Category</option>
                        <option value="marketing">Marketing</option>
                        <option value="announcement">Announcement</option>
                        <option value="update">System Update</option>
                        <option value="newsletter">Newsletter</option>
                        <option value="event">Event</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                  
                  {/* Action buttons */}
                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      className="flex items-center px-4 py-2 border border-gray-300 dark:border-neutral-800 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-neutral-900 hover:bg-gray-50 dark:hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary cursor-pointer transition-colors"
                      onClick={() => {
                        setSubject('');
                        setMessage('');
                        setSelectedTemplate('');
                        setAttachments([]);
                      }}
                    >
                      Clear
                    </button>
                    
                    <button
                      type="submit"
                      className="flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black dark:bg-black hover:bg-gray-800 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black dark:focus:ring-black cursor-pointer transition-colors"
                      disabled={isSending || selectedUsers.length === 0 || !message}
                    >
                      {isSending ? (
                        <>
                          <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></div>
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Send to {selectedUsers.length} {selectedUsers.length === 1 ? 'recipient' : 'recipients'}
                        </>
                      )}
                    </button>
                    
                    {/* Add preview button next to the Send button */}
                    <button
                      type="button"
                      className="flex items-center px-4 py-2 border border-gray-300 dark:border-neutral-800 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-neutral-900 hover:bg-gray-50 dark:hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary cursor-pointer transition-colors"
                      onClick={() => setShowPreview(true)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </button>
                  </div>
                </form>
                
                {/* Preview section */}
                {showPreview && (
                  <div className="mt-6 p-4 border border-gray-200 dark:border-neutral-800 rounded-md bg-gray-50 dark:bg-neutral-700">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Message Preview</h4>
                    <div className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-line">
                      {generatePreview(message, previewData)}
                    </div>
                  </div>
                )}
                
                
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Message History - Now Dynamic */}
      <div className="bg-white dark:bg-neutral-900 rounded-lg border border-gray-200 dark:border-neutral-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold dark:text-gray-100">Recent Messages</h2>
            {selectedMessages.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedMessages.length} selected
                </span>
                <button
                  onClick={() => setShowBulkDeleteConfirmation(true)}
                  className="flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-md hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors cursor-pointer text-xs"
                >
                  <Trash2 className="h-3 w-3" />
                  Delete Selected
                </button>
                <button
                  onClick={clearMessageSelection}
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 text-xs cursor-pointer"
                >
                  Clear
                </button>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {selectedMessages.length === 0 && (
              <button
                onClick={selectAllMessages}
                className="text-xs text-black dark:text-black hover:text-gray-800 dark:hover:text-gray-800 cursor-pointer px-2 py-1 bg-black/5 dark:bg-black/5 hover:bg-black/10 dark:hover:bg-black/10 rounded transition-colors"
              >
                Select All
              </button>
            )}
            
            <span className="text-sm text-gray-500 dark:text-gray-400">Filter by:</span>
            <select
              className="text-sm border-gray-200 dark:border-neutral-800 rounded-md text-gray-600 dark:text-gray-400 focus:ring-primary focus:border-primary cursor-pointer bg-white dark:bg-neutral-700"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">All Categories</option>
              <option value="marketing">Marketing</option>
              <option value="announcement">Announcement</option>
              <option value="update">System Update</option>
              <option value="newsletter">Newsletter</option>
              <option value="event">Event</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
        
        <div className="overflow-x-auto [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-gray-100 dark:[&::-webkit-scrollbar-track]:bg-neutral-800 [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-600 [&::-webkit-scrollbar-thumb]:rounded-full">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-700">
            <thead className="bg-gray-50 dark:bg-neutral-700">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Type
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Subject/Content
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Recipients
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            {/* Update the table body */}
            <tbody className="bg-white dark:bg-neutral-900 divide-y divide-gray-200 dark:divide-neutral-700">
              {filteredMessages.length > 0 ? (
                filteredMessages.map((message) => (
                  <tr key={message.id} className="hover:bg-gray-50 dark:hover:bg-neutral-700">
                    <td className="pl-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 text-primary focus:ring-primary border-gray-300 dark:border-neutral-800 rounded cursor-pointer"
                          checked={selectedMessages.includes(message.id)}
                          onChange={() => toggleMessageSelection(message.id)}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(message.sentAt)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center">
                        {message.type === 'email' ? (
                          <Mail className="h-4 w-4 mr-1 text-primary" />
                        ) : (
                          <MessageSquare className="h-4 w-4 mr-1 text-primary" />
                        )}
                        {message.type === 'email' ? 'Email' : 'SMS'}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {message.subject}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {message.recipients} {message.recipients === 1 ? 'recipient' : 'recipients'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        message.status === 'sent' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                        message.status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' :
                        'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                      }`}>
                        {message.status === 'sent' && <CheckCircle className="h-3 w-3 mr-1" />}
                        {message.status === 'pending' && <AlertCircle className="h-3 w-3 mr-1" />}
                        {message.status === 'failed' && <XCircle className="h-3 w-3 mr-1" />}
                        {message.status.charAt(0).toUpperCase() + message.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button 
                          className="p-1.5 text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 rounded cursor-pointer transition-colors"
                          onClick={() => handleCopyMessage(message.content)}
                          title="Copy message"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <button
                          className="p-1.5 text-red-400 hover:text-red-600 bg-red-50 hover:bg-red-100 rounded cursor-pointer transition-colors"
                          onClick={() => handleDeleteMessage(message.id)}
                          title="Delete message"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <button
                          className="p-1.5 text-blue-400 hover:text-blue-600 bg-blue-50 hover:bg-blue-100 rounded cursor-pointer transition-colors"
                          onClick={() => setAnalyticsMessage(message)}
                          title="View analytics"
                        >
                          <ChartBar className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    <div className="flex flex-col items-center">
                      <Mail className="h-8 w-8 text-gray-300 dark:text-gray-600 mb-2" />
                      <p>No messages found</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Analytics Modal */}
      {analyticsMessage && (
        <MessageAnalyticsModal 
          message={analyticsMessage} 
          onClose={() => setAnalyticsMessage(null)} 
        />
      )}
      
      {/* Template Management Modal */}
      {showTemplateManager && (
        <TemplateManagementModal
          onClose={() => setShowTemplateManager(false)}
          templates={templates}
          onCreateTemplate={() => {
            setEditingTemplate(null);
            setIsTemplateFormOpen(true);
          }}
          onUpdateTemplate={(template) => {
            setEditingTemplate(template);
            setIsTemplateFormOpen(true);
          }}
          onDeleteTemplate={(id) => {
            setTemplates(templates.filter(t => t.id !== id));
            toast.showSuccess('Template Deleted', 'Template deleted successfully');
          }}
          onSelectTemplate={(template) => {
            setSelectedTemplate(template.id);
            setSubject(template.subject);
            setMessage(template.content);
            setSelectedCategory(template.category || '');
            setShowTemplateManager(false);
          }}
        />
      )}
      
      {/* Template Form Modal */}
      {isTemplateFormOpen && (
        <TemplateFormModal
          template={editingTemplate}
          onClose={() => setIsTemplateFormOpen(false)}
          onSave={(templateData) => {
            if (editingTemplate) {
              // Update existing template
              setTemplates(templates.map(t => 
                t.id === editingTemplate.id 
                  ? { ...t, ...templateData, updatedAt: new Date().toISOString() } 
                  : t
              ));
              toast.showSuccess('Template Updated', 'Template updated successfully');
            } else {
              // Create new template
              const newTemplate = {
                ...templateData,
                id: `template-${Date.now()}`,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              } as Template;
              setTemplates([newTemplate, ...templates]);
              toast.showSuccess('Template Created', 'Template created successfully');
            }
            setIsTemplateFormOpen(false);
          }}
        />
      )}
      
      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-in fade-in duration-200">
            <div className="border-b border-gray-200 p-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Message Preview</h3>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)]">
              {activeTab === 'email' && (
                <>
                  <div className="mb-4 border-b pb-2">
                    <div className="text-sm text-gray-500">To: {previewData.email}</div>
                    <div className="font-medium text-lg mt-2">Subject: {subject}</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg whitespace-pre-wrap">
                    {generatePreview(message, previewData)}
                  </div>
                </>
              )}
              
              {activeTab === 'sms' && (
                <div className="bg-gray-100 p-4 rounded-lg border border-gray-200 max-w-xs mx-auto whitespace-pre-wrap">
                  <div className="bg-primary text-white p-3 rounded-lg whitespace-pre-wrap text-sm">
                    {generatePreview(message, previewData)}
                  </div>
                </div>
              )}
            </div>
            
            <div className="border-t border-gray-200 p-4 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <span className="text-gray-500 mr-2">Viewing as:</span>
                  <select 
                    className="border border-gray-300 rounded px-2 py-1 text-sm"
                    value="default"
                    onChange={(e) => {
                      // Could set different preview profiles
                    }}
                  >
                    <option value="default">John Doe (default)</option>
                    <option value="alt1">Jane Smith</option>
                  </select>
                </div>
                <button
                  onClick={() => setShowPreview(false)}
                  className="px-4 py-2 bg-primary text-white rounded"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* ADD THESE CONFIRMATION MODALS HERE */}
      {showDeleteMessageConfirmation && (
        <ConfirmationModal
          title="Delete Message"
          message="Are you sure you want to delete this message? This action cannot be undone."
          onConfirm={() => confirmDeleteMessage(showDeleteMessageConfirmation)}
          onCancel={() => setShowDeleteMessageConfirmation(null)}
        />
      )}

      {showBulkDeleteConfirmation && (
        <ConfirmationModal
          title="Delete Selected Messages"
          message={`Are you sure you want to delete ${selectedMessages.length} messages? This action cannot be undone.`}
          onConfirm={deleteSelectedMessages}
          onCancel={() => setShowBulkDeleteConfirmation(false)}
        />
      )}
    </div>
  );
}