"use client";

import { useState } from 'react';
import { useKeysStore } from '@/store/keysStore';
import { format, parseISO } from 'date-fns';
import { 
  ArrowUpRight, 
  ArrowDownRight,
  SearchIcon,
  FilterIcon
} from 'lucide-react';

export function KeysHistory() {
  const { history, balance } = useKeysStore();
  const [filter, setFilter] = useState<'all' | 'earned' | 'spent'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredHistory = history
    .filter(transaction => {
      // Apply type filter
      if (filter === 'earned' && transaction.amount <= 0) return false;
      if (filter === 'spent' && transaction.amount >= 0) return false;
      
      // Apply search filter if present
      if (searchTerm && !transaction.description.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      
      return true;
    });

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-md text-sm ${
              filter === 'all' ? 'bg-primary text-white' : 'bg-white text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            All Transactions
          </button>
          <button
            onClick={() => setFilter('earned')}
            className={`px-4 py-2 rounded-md text-sm ${
              filter === 'earned' ? 'bg-green-500 text-white' : 'bg-white text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            Earned
          </button>
          <button
            onClick={() => setFilter('spent')}
            className={`px-4 py-2 rounded-md text-sm ${
              filter === 'spent' ? 'bg-blue-500 text-white' : 'bg-white text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            Spent
          </button>
        </div>
        
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search transactions..."
            className="pl-10 pr-4 py-2 border border-neutral-200 rounded-md w-full sm:w-64"
          />
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
        </div>
      </div>
      
      {/* Transactions List */}
      {filteredHistory.length > 0 ? (
        <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50 text-left">
                <tr>
                  <th className="px-6 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {filteredHistory.map((transaction) => {
                  const date = parseISO(transaction.created_at);
                  const isEarned = transaction.amount > 0;
                  
                  return (
                    <tr key={transaction.id} className="hover:bg-neutral-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                        {format(date, 'MMM d, yyyy')}
                      </td>
                      <td className="px-6 py-4 text-sm text-neutral-700">
                        {transaction.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right">
                        <span className={`flex items-center justify-end ${
                          isEarned 
                            ? 'text-green-600' 
                            : 'text-blue-600'
                        }`}>
                          {isEarned ? (
                            <>
                              <ArrowUpRight className="w-4 h-4 mr-1" />
                              +{transaction.amount}
                            </>
                          ) : (
                            <>
                              <ArrowDownRight className="w-4 h-4 mr-1" />
                              {transaction.amount}
                            </>
                          )}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-10 bg-white rounded-lg border border-neutral-200">
          <div className="inline-block p-3 bg-neutral-100 rounded-full mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-neutral-900">No transactions found</h3>
          <p className="mt-2 text-neutral-600">
            {filter !== 'all' 
              ? `You don't have any ${filter === 'earned' ? 'earned' : 'spent'} KEYS transactions.`
              : searchTerm 
                ? `No results for "${searchTerm}"`
                : "Your transaction history will appear here."
            }
          </p>
        </div>
      )}
    </div>
  );
}