"use client";

import { useState } from "react";
import { useToast } from "@/hooks/useToast";
import { X, Smartphone, Building } from "lucide-react";

export function AddPaymentMethodModal({ 
  isOpen, 
  onClose, 
  onAdd
}: {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (paymentMethod: any) => void;
}) {
  const toast = useToast();
  const [paymentType, setPaymentType] = useState('momo');
  const [momoProvider, setMomoProvider] = useState('mtn');
  const [momoNumber, setMomoNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [makeDefault, setMakeDefault] = useState(false);
  const [isEditing] = useState(false);

  const handleCloseModal = () => {
    onClose();
    // Reset form
    setPaymentType('momo');
    setMomoProvider('mtn');
    setMomoNumber('');
    setBankName('');
    setAccountNumber('');
    setAccountName('');
    setMakeDefault(false);
  };

  const handleAddPaymentMethod = async () => {
    try {
      const paymentMethod = {
        type: paymentType,
        isDefault: makeDefault,
        usage: ['payouts'],
        ...(paymentType === 'momo' ? {
          provider: momoProvider,
          number: momoNumber,
          accountName: accountName,
          last4: momoNumber.slice(-4)
        } : {
          bank: bankName,
          accountNumber: accountNumber,
          accountName: accountName,
          last4: accountNumber.slice(-4)
        })
      };
      
      onAdd(paymentMethod);
      toast.showSuccess('Method Added', 'Payment method added successfully!');
      handleCloseModal();
    } catch (error) {
      toast.showError('Add Failed', 'Failed to add payment method');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-lg w-full p-6 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">
            {isEditing 
              ? `Edit ${paymentType === 'momo' ? 'Mobile Money' : 'Bank Account'}`
              : "Add Payout Method"
            }
          </h3>
          <button 
            onClick={handleCloseModal}
            className="text-neutral-500 hover:text-neutral-700 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="space-y-6">
          {/* Payment Type Tabs */}
          <div className="flex mb-6 bg-neutral-100 rounded-lg p-1">
            <button
              onClick={() => !isEditing && setPaymentType('momo')}
              disabled={isEditing && paymentType !== 'momo'}
              className={`flex-1 py-2 rounded-md text-sm font-medium cursor-pointer ${
                isEditing && paymentType !== 'momo' 
                  ? 'opacity-50 cursor-not-allowed' 
                  : ''
              } ${
                paymentType === 'momo' 
                  ? 'bg-white text-primary shadow-sm' 
                  : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              <Smartphone className="h-4 w-4 inline mr-2" />
              Mobile Money
            </button>
            <button
              onClick={() => !isEditing && setPaymentType('bank')}
              disabled={isEditing && paymentType !== 'bank'}
              className={`flex-1 py-2 rounded-md text-sm font-medium cursor-pointer ${
                isEditing && paymentType !== 'bank' 
                  ? 'opacity-50 cursor-not-allowed' 
                  : ''
              } ${
                paymentType === 'bank' 
                  ? 'bg-white text-primary shadow-sm' 
                  : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              <Building className="h-4 w-4 inline mr-2" />
              Bank Account
            </button>
          </div>
          
          {/* Mobile Money Form */}
          {paymentType === 'momo' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Mobile Money Provider*
                </label>
                <select 
                  value={momoProvider}
                  onChange={(e) => setMomoProvider(e.target.value)}
                  className="w-full p-2.5 border border-neutral-200 rounded-lg focus:ring-primary focus:border-primary cursor-pointer"
                >
                  <option value="mtn">MTN Mobile Money</option>
                  <option value="Telecel">Telecel Cash</option>
                  <option value="airteltigo">AirtelTigo Money</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Mobile Money Number*
                </label>
                <input
                  type="tel"
                  value={momoNumber}
                  onChange={(e) => setMomoNumber(e.target.value)}
                  className="w-full p-2.5 border border-neutral-200 rounded-lg focus:ring-primary focus:border-primary"
                  placeholder="e.g. 0551234567"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Account Name*
                </label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="w-full p-2.5 border border-neutral-200 rounded-lg focus:ring-primary focus:border-primary"
                  placeholder="Name on the mobile money account"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Bank Name*
                </label>
                <select 
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full p-2.5 border border-neutral-200 rounded-lg focus:ring-primary focus:border-primary cursor-pointer"
                >
                  <option value="">Select a bank</option>
                  <option value="GCB">GCB Bank</option>
                  <option value="Ecobank">Ecobank</option>
                  <option value="Stanbic">Stanbic Bank</option>
                  <option value="Fidelity">Fidelity Bank</option>
                  <option value="Access">Access Bank</option>
                  <option value="CalBank">CalBank</option>
                  <option value="Zenith">Zenith Bank</option>
                  <option value="GTBank">GT Bank</option>
                  <option value="Standard Chartered">Standard Chartered</option>
                  <option value="Absa">Absa Bank</option>
                  <option value="UBA">UBA</option>
                  <option value="Consolidated">Consolidated Bank Ghana</option>
                  <option value="NIB">National Investment Bank</option>
                  <option value="ADB">Agricultural Development Bank</option>
                  <option value="FBN">First Bank of Nigeria</option>
                  <option value="OmniBSIC">OmniBSIC Bank</option>
                  <option value="Republic">Republic Bank</option>
                  <option value="Universal">Universal Merchant Bank</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Account Number*
                </label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full p-2.5 border border-neutral-200 rounded-lg focus:ring-primary focus:border-primary"
                  placeholder="Enter your bank account number"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Account Name*
                </label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="w-full p-2.5 border border-neutral-200 rounded-lg focus:ring-primary focus:border-primary"
                  placeholder="Name on the bank account"
                />
              </div>
            </div>
          )}
          
          <div className="flex items-start gap-2 mt-2">
            <input 
              type="checkbox" 
              id="set-default" 
              checked={makeDefault}
              onChange={(e) => setMakeDefault(e.target.checked)}
              className="mt-1 cursor-pointer" 
            />
            <label htmlFor="set-default" className="text-sm cursor-pointer">Set as default payout method</label>
          </div>
          
          <button
            type="button"
            className="w-full py-2.5 px-4 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors cursor-pointer"
            onClick={handleAddPaymentMethod}
          >
            {isEditing ? 'Update Payment Method' : 'Add Payment Method'}
          </button>
        </div>
      </div>
    </div>
  );
}
