"use client";

import { useState } from 'react';
import { useKeysStore } from '@/store/keysStore';
import { KeysBalance } from '@/components/keys/KeysBalance';
import { KeysActions } from '@/components/keys/KeysActions';
import { KeysRewards } from '@/components/keys/KeysRewards';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Gift, Activity, Award } from 'lucide-react';

export default function RewardsStandalonePage() {
  const { history } = useKeysStore();
  const [activeTab, setActiveTab] = useState('rewards');

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section with background image */}
      <div
        className="relative overflow-hidden text-white"
        style={{
          backgroundImage: "url('/hero_backgrounds/rewards-hero.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className="absolute inset-0 bg-black/65" />
        <div className="absolute -left-20 top-10 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute right-0 bottom-0 w-[480px] h-[480px] bg-white/10 rounded-full blur-3xl" />
        
        <div className="container mx-auto px-4 py-16 max-w-7xl relative">
          <div className="text-center space-y-6">
            {/* Animated badge with glow */}
            <div className="relative inline-flex">
              <div 
                className="absolute -inset-[3px] rounded-full blur-[3px] opacity-70"
                style={{
                  background: 'linear-gradient(45deg, #ff0000 0%, #ff7f00 12.5%, #ffff00 25%, #00ff00 37.5%, #00ffff 50%, #0000ff 62.5%, #ff00ff 75%, #ff0000 87.5%, #ff0000 100%)',
                  backgroundSize: '400% 400%',
                  animation: 'rainbow-border 4s ease infinite',
                  boxShadow: '0 0 12px rgba(255, 0, 255, 0.25), 0 0 24px rgba(0, 255, 255, 0.18)',
                }}
              />
              <div className="relative inline-flex items-center gap-2 px-4 py-2 bg-white/85 backdrop-blur-sm rounded-full border border-white/40 shadow-sm text-neutral-800">
                <Gift className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Unlock Exclusive Rewards</span>
              </div>
            </div>
            
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold drop-shadow-sm text-white">
              Unlock Premium Rewards
            </h1>
            
            <p className="text-lg md:text-xl text-white/85 max-w-2xl mx-auto leading-relaxed">
              Earn Keys by attending events and completing actions. Redeem them for exclusive rewards, early access, and unforgettable experiences.
            </p>
            
            <div className="pt-6 flex flex-col items-center gap-4">
              <div className="relative inline-flex items-center gap-3 px-5 py-3 rounded-2xl border border-white/25 bg-white/10 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.25)] overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-white/5 to-transparent" />
                <div className="relative">
                  <KeysBalance size="large" />
                </div>
              </div>
              <p className="text-sm text-white/75">Your current balance</p>
            </div>
          </div>
        </div>

        <style jsx>{`
          @keyframes rainbow-border {
            0%, 100% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
          }
        `}</style>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-7xl space-y-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="relative overflow-hidden p-6 rounded-2xl shadow-md border border-indigo-100 bg-gradient-to-br from-indigo-50 via-purple-50 to-white hover:border-indigo-300 hover:shadow-indigo-200/60 transition-all">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-200/30 via-purple-200/20 to-transparent rounded-full -mr-16 -mt-16" />
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-neutral-600 font-medium">Total Keys Earned</p>
                <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700 shadow-sm">
                  <Award className="h-5 w-5" />
                </div>
              </div>
              <p className="text-3xl font-bold text-neutral-900">
                {history.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0)}
              </p>
            </div>
          </div>
          
          <div className="relative overflow-hidden p-6 rounded-2xl shadow-md border border-cyan-100 bg-gradient-to-br from-cyan-50 via-blue-50 to-white hover:border-cyan-300 hover:shadow-cyan-200/60 transition-all">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-cyan-200/30 via-blue-200/20 to-transparent rounded-full -mr-16 -mt-16" />
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-neutral-600 font-medium">Keys Redeemed</p>
                <div className="p-2 rounded-lg bg-cyan-100 text-cyan-700 shadow-sm">
                  <Gift className="h-5 w-5" />
                </div>
              </div>
              <p className="text-3xl font-bold text-neutral-900">
                {Math.abs(history.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0))}
              </p>
            </div>
          </div>
        </div>
      
        {/* Main Content */}
        <Tabs defaultValue="earn" className="w-full space-y-6" onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-4 bg-neutral-100 p-1 rounded-xl">
            <TabsTrigger value="earn" className="rounded-lg cursor-pointer data-[state=active]:bg-white data-[state=active]:shadow-sm">
              Earn Keys
            </TabsTrigger>
            <TabsTrigger value="rewards" className="rounded-lg cursor-pointer data-[state=active]:bg-white data-[state=active]:shadow-sm">
              Rewards
            </TabsTrigger>
            <TabsTrigger value="bundles" className="rounded-lg cursor-pointer data-[state=active]:bg-white data-[state=active]:shadow-sm">
              Featured
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-lg cursor-pointer data-[state=active]:bg-white data-[state=active]:shadow-sm">
              History
            </TabsTrigger>
          </TabsList>
        
        <TabsContent value="rewards" className="bg-white p-6 rounded-xl border border-neutral-200">
          <KeysRewards mode="rewards" />
        </TabsContent>
        
        <TabsContent value="bundles" className="bg-white p-6 rounded-xl border border-neutral-200">
          <KeysRewards mode="bundles" />
        </TabsContent>

        <TabsContent value="earn" className="bg-white p-6 rounded-xl border border-neutral-200">
          <KeysActions />
        </TabsContent>
        
        <TabsContent value="history" className="bg-white p-6 rounded-xl border border-neutral-200">
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Transaction History</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-200">
                <thead className="bg-neutral-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Date</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Activity</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">KEYS</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-200">
                  {history.map((transaction) => (
                    <tr key={transaction.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                        {new Date(transaction.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                        {transaction.description}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                        transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                      </td>
                    </tr>
                  ))}
                  {history.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-6 py-8 text-center text-neutral-500">
                        No transactions yet. Start earning KEYS by attending events and completing actions!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
