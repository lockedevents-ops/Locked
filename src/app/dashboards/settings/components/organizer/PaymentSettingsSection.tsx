"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/hooks/useToast";
import {
  Plus,
  Trash2,
  CreditCard,
  TrendingUp,
  AlertCircle,
  Smartphone,
  Building,
} from "lucide-react";
import { AddPaymentMethodModal } from "../shared/AddPaymentMethodModal";

export function PaymentSettingsSection({ user, roleContext, isMobile }: any) {
  const toast = useToast();
  const [paymentData, setPaymentData] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);

  // Load payment settings on mount
  useEffect(() => {
    const loadPaymentData = async () => {
      if (!user?.id) return;
      
      try {
        // Load empty payment data for MVP
        setPaymentData({
          paymentMethods: [],
          payoutSettings: {
            organizerPayouts: {
              method: '',
              frequency: 'weekly',
              minimumAmount: 25.00,
              accountId: ''
            },
            venuePayouts: {
              method: '',
              frequency: 'bi-weekly',
              minimumAmount: 50.00,
              accountId: ''
            }
          },
          taxInfo: {
            businessName: '',
            taxId: '',
            w9OnFile: false,
            businessType: ''
          },
          recentTransactions: []
        });
      } catch (error) {
        console.error('Error loading payment data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadPaymentData();
  }, [user]);

  const updatePayoutSettings = async (role: string, updates: any) => {
    setIsSaving(true);
    try {
      const updated = {
        ...paymentData,
        payoutSettings: {
          ...paymentData.payoutSettings,
          [role]: {
            ...paymentData.payoutSettings[role],
            ...updates
          }
        }
      };
      setPaymentData(updated);
      toast.showSuccess('Settings Updated', 'Payout settings updated successfully');
    } catch (error) {
      toast.showError('Update Failed', 'Failed to update payout settings');
    } finally {
      setIsSaving(false);
    }
  };

  const removePaymentMethod = async (paymentMethodId: string) => {
    if (!confirm('Are you sure you want to remove this payment method?')) return;
    
    setIsSaving(true);
    try {
      const updatedMethods = paymentData.paymentMethods.filter((pm: any) => pm.id !== paymentMethodId);
      setPaymentData({ ...paymentData, paymentMethods: updatedMethods });
      toast.showSuccess('Method Removed', 'Payment method removed successfully');
    } catch (error) {
      toast.showError('Removal Failed', 'Failed to remove payment method');
    } finally {
      setIsSaving(false);
    }
  };

  const setDefaultPaymentMethod = async (paymentMethodId: string) => {
    setIsSaving(true);
    try {
      const updatedMethods = paymentData.paymentMethods.map((pm: any) => ({
        ...pm,
        isDefault: pm.id === paymentMethodId
      }));
      setPaymentData({ ...paymentData, paymentMethods: updatedMethods });
      toast.showSuccess('Default Updated', 'Default payment method updated');
    } catch (error) {
      toast.showError('Update Failed', 'Failed to update default payment method');
    } finally {
      setIsSaving(false);
    }
  };

  const getPaymentMethodIcon = (type: string, brand?: string) => {
    if (type === 'momo') {
      return <Smartphone className="h-5 w-5" />;
    } else if (type === 'bank') {
      return <Building className="h-5 w-5" />;
    } else if (type === 'card') {
      return <CreditCard className="h-5 w-5" />;
    }
    return <CreditCard className="h-5 w-5" />;
  };

  // Get currency symbol from preferences (this would normally come from a context or prop)
  const getCurrencySymbol = (currency: string = 'GHS') => {
    const currencySymbols: { [key: string]: string } = {
      'GHS': '₵',
      'XOF': 'CFA',
      'NGN': '₦',
      'USD': '$',
      'EUR': '€',
      'GBP': '£'
    };
    return currencySymbols[currency] || currency;
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header Section */}
      <div className="mb-6 sm:mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Settings</h2>
        <p className="text-gray-600">Manage payment methods, payouts, and financial details.</p>
      </div>
      
      {roleContext.isOrganizer && roleContext.isVenueOwner && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
          <p className="text-sm text-purple-800">
            <strong>Dual revenue streams:</strong> Configure separate payout methods for 
            event ticket sales (organizer) and venue bookings (venue owner).
          </p>
        </div>
      )}
      
      <div className="space-y-6">
        {/* Payment Methods */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 sm:p-5 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Payment Methods
              </h3>
              <button
                onClick={() => setShowAddPaymentModal(true)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Add Payment Method
              </button>
            </div>
          </div>
          
          <div className="p-4 sm:p-5">
            <div className="space-y-3">{paymentData?.paymentMethods?.length > 0 ? (
              paymentData.paymentMethods.map((method: any) => (
                <div key={method.id} className="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-200">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex items-center gap-3 sm:gap-4 flex-1">
                      <div className="w-12 h-8 bg-white rounded flex items-center justify-center border border-gray-200 flex-shrink-0">
                        {getPaymentMethodIcon(method.type, method.brand)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">
                          {method.type === 'momo' 
                            ? `${method.provider?.toUpperCase()} •••• ${method.last4}`
                            : method.type === 'bank'
                            ? `${method.bank} •••• ${method.last4}`
                            : method.type === 'card' 
                            ? `${method.brand?.toUpperCase()} •••• ${method.last4}`
                            : 'Unknown method'
                          }
                        </div>
                        <div className="text-sm text-gray-600 truncate">
                          {method.type === 'momo'
                            ? `${method.accountName || 'Mobile Money'}`
                            : method.type === 'bank'
                            ? `${method.accountName || 'Bank Account'}`
                            : method.type === 'card' 
                            ? `Expires ${method.expiryMonth}/${method.expiryYear}`
                            : 'Payment method'
                          }
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Used for: {method.usage.join(', ')}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 sm:gap-3 justify-end sm:justify-start">
                      {method.isDefault && (
                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full whitespace-nowrap">
                          Default
                        </span>
                      )}
                      {!method.isDefault && (
                        <button
                          onClick={() => setDefaultPaymentMethod(method.id)}
                          disabled={isSaving}
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium cursor-pointer disabled:cursor-not-allowed whitespace-nowrap"
                        >
                          Set Default
                        </button>
                      )}
                      <button
                        onClick={() => removePaymentMethod(method.id)}
                        disabled={isSaving}
                        className="p-1.5 text-red-600 hover:text-red-700 transition-colors cursor-pointer disabled:cursor-not-allowed flex-shrink-0"
                        title="Remove payment method"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 sm:py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                <CreditCard className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mb-3 sm:mb-4" />
                <p className="text-gray-500 mb-2">No payment methods added yet</p>
                <p className="text-sm text-gray-400">Add a payment method to start accepting payments</p>
              </div>
            )}
          </div>
          </div>
        </div>

        {/* Payout Settings */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 sm:p-5 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <span className="text-lg text-primary font-bold">₵</span>
              Payout Settings
            </h3>
          </div>
          
          <div className="p-4 sm:p-5 space-y-4 sm:space-y-6">
            {/* Organizer Payouts */}
            {roleContext.isOrganizer && (
              <div className="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-200">
                <h4 className="font-medium text-gray-900 mb-3 sm:mb-4">Event Ticket Sales (Organizer)</h4>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payout Frequency
                    </label>
                    <select
                      value={paymentData?.payoutSettings?.organizerPayouts?.frequency || ''}
                      onChange={(e) => updatePayoutSettings('organizerPayouts', { frequency: e.target.value })}
                      disabled={isSaving}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="bi-weekly">Bi-weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Payout Amount
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-sm text-gray-400 font-medium">₵</span>
                      <input
                        type="number"
                        min="1"
                        step="0.01"
                        value={paymentData?.payoutSettings?.organizerPayouts?.minimumAmount || ''}
                        onChange={(e) => updatePayoutSettings('organizerPayouts', { minimumAmount: parseFloat(e.target.value) })}
                        disabled={isSaving}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="25.00"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payout Account
                    </label>
                    <select
                      value={paymentData?.payoutSettings?.organizerPayouts?.accountId || ''}
                      onChange={(e) => updatePayoutSettings('organizerPayouts', { accountId: e.target.value })}
                      disabled={isSaving}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      {paymentData?.paymentMethods
                        ?.filter((pm: any) => pm.type === 'bank_account')
                        ?.map((account: any) => (
                          <option key={account.id} value={account.id}>
                            {account.bank} •••• {account.last4}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
            
            {/* Venue Owner Payouts */}
            {roleContext.isVenueOwner && (
              <div className="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-200">
                <h4 className="font-medium text-gray-900 mb-3 sm:mb-4">Venue Bookings (Venue Owner)</h4>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payout Frequency
                    </label>
                    <select
                      value={paymentData?.payoutSettings?.venuePayouts?.frequency || ''}
                      onChange={(e) => updatePayoutSettings('venuePayouts', { frequency: e.target.value })}
                      disabled={isSaving}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="bi-weekly">Bi-weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Payout Amount
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-sm text-gray-400 font-medium">₵</span>
                      <input
                        type="number"
                        min="1"
                        step="0.01"
                        value={paymentData?.payoutSettings?.venuePayouts?.minimumAmount || ''}
                        onChange={(e) => updatePayoutSettings('venuePayouts', { minimumAmount: parseFloat(e.target.value) })}
                        disabled={isSaving}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="50.00"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payout Account
                    </label>
                    <select
                      value={paymentData?.payoutSettings?.venuePayouts?.accountId || ''}
                      onChange={(e) => updatePayoutSettings('venuePayouts', { accountId: e.target.value })}
                      disabled={isSaving}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      {paymentData?.paymentMethods
                        ?.filter((pm: any) => pm.type === 'bank_account')
                        ?.map((account: any) => (
                          <option key={account.id} value={account.id}>
                            {account.bank} •••• {account.last4}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tax Information */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 sm:p-5 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Tax Information</h3>
          </div>
          
          <div className="p-4 sm:p-5">
            <div className="grid sm:grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Name
                </label>
                <input
                  type="text"
                  value={paymentData?.taxInfo?.businessName || ''}
                  onChange={(e) => setPaymentData({
                    ...paymentData,
                    taxInfo: { ...paymentData.taxInfo, businessName: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Business name for tax purposes"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tax ID (EIN)
                </label>
                <input
                  type="text"
                  value={paymentData?.taxInfo?.taxId || ''}
                  onChange={(e) => setPaymentData({
                    ...paymentData,
                    taxInfo: { ...paymentData.taxInfo, taxId: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="XX-XXXXXXX"
                />
              </div>
            </div>
            
            {!paymentData?.taxInfo?.w9OnFile && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-yellow-800">
                    <strong>W-9 Form Required:</strong> You need to submit a W-9 form for tax reporting purposes.
                  </p>
                </div>
                <button className="w-full sm:w-auto text-sm font-medium text-yellow-600 hover:text-yellow-700 cursor-pointer whitespace-nowrap">
                  Upload W-9
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 sm:p-5 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Recent Transactions
            </h3>
          </div>
          
          <div className="p-4 sm:p-5">
            <div className="space-y-3">{paymentData?.recentTransactions?.map((transaction: any) => (
              <div key={transaction.id} className="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    transaction.status === 'completed' 
                      ? 'bg-green-500' 
                      : transaction.status === 'pending'
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">{transaction.description}</div>
                    <div className="text-sm text-gray-600 truncate">
                      {transaction.date.toLocaleDateString()} • {transaction.source}
                    </div>
                  </div>
                </div>
                <div className={`font-semibold whitespace-nowrap ${
                  transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {transaction.amount > 0 ? '+' : ''}₵{Math.abs(transaction.amount).toFixed(2)}
                </div>
              </div>
            )) || (
              <div className="text-center py-6 sm:py-8 text-gray-500">
                No recent transactions
              </div>
            )}
          </div>
          </div>
        </div>
      </div>

      {/* Add Payment Method Modal */}
      {showAddPaymentModal && (
        <AddPaymentMethodModal
          isOpen={showAddPaymentModal}
          onClose={() => setShowAddPaymentModal(false)}
          onAdd={(paymentMethod: any) => {
            const newMethod = {
              id: Date.now().toString(),
              ...paymentMethod
            };
            setPaymentData((prev: any) => ({
              ...prev,
              paymentMethods: [...(prev?.paymentMethods || []), newMethod]
            }));
            setShowAddPaymentModal(false);
          }}
        />
      )}
    </div>
  );
}
