import { useState } from 'react';
import { useKeysStore } from '@/store/keysStore';
import { motion } from 'framer-motion';
import { Beer, Award, Camera, ShoppingBag, Gift, Crown, Key } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

interface Reward {
  id: string;
  name: string;
  description: string;
  keysCost: number;
  icon: React.ReactNode;
  category: string;
}

const rewards: Reward[] = [
  {
    id: 'ticket-discount-5',
    name: '5% Ticket Discount',
    description: 'Get 5% off your next ticket purchase',
    keysCost: 50,
    icon: <Key className="w-5 h-5" />,
    category: 'discounts'
  },
  {
    id: 'ticket-discount-10',
    name: '10% Ticket Discount',
    description: 'Get 10% off your next ticket purchase',
    keysCost: 100,
    icon: <ShoppingBag className="w-5 h-5" />,
    category: 'discounts'
  },
  {
    id: 'ticket-discount-15',
    name: '15% Ticket Discount',
    description: 'Get 15% off your next ticket purchase',
    keysCost: 150,
    icon: <Award className="w-5 h-5" />,
    category: 'discounts'
  },
  {
    id: 'vip-upgrade',
    name: 'VIP Ticket Upgrade',
    description: 'Upgrade your standard ticket to VIP for selected events',
    keysCost: 200,
    icon: <Crown className="w-5 h-5" />,
    category: 'upgrades'
  },
  {
    id: 'early-access',
    name: '24hr Early Access',
    description: 'Get 24-hour early access to ticket sales for new events',
    keysCost: 75,
    icon: <Gift className="w-5 h-5" />,
    category: 'access'
  },
  {
    id: 'free-ticket',
    name: 'Free Event Ticket',
    description: 'Redeem for one free ticket to participating events',
    keysCost: 500,
    icon: <Beer className="w-5 h-5" />,
    category: 'tickets'
  }
];

const rewardBundles = [
  {
    id: 'starter-pack',
    name: 'Starter Rewards Pack',
    description: '5% discount + early access to new events',
    keysCost: 110,
    savings: '15 KEYS savings',
    items: ['ticket-discount-5', 'early-access']
  },
  {
    id: 'premium-pack',
    name: 'Premium Experience Pack',
    description: '15% discount + VIP upgrade for your next event',
    keysCost: 320,
    savings: '30 KEYS savings',
    items: ['ticket-discount-15', 'vip-upgrade']
  }
];

export function KeysRewards({ mode = 'all' }: { mode?: 'all' | 'bundles' | 'rewards' }) {
  const { balance } = useKeysStore();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const toast = useToast();
  
  const handleRedeem = (reward: Reward) => {
    if (balance < reward.keysCost) {
      toast.showError('Insufficient KEYS', `You need ${reward.keysCost - balance} more KEYS to redeem this reward`);
      return;
    }
    
    // TODO: Implement actual reward redemption via backend
    toast.showSuccess('Coming Soon!', `Reward redemption will be available soon. You would redeem: ${reward.name}`);
  };

  const filteredRewards = selectedCategory === 'all' 
    ? rewards 
    : rewards.filter(reward => reward.category === selectedCategory);
  
  const rewardThemes = [
    {
      card: 'bg-gradient-to-br from-indigo-50 via-purple-50 to-white',
      border: 'border-indigo-100',
      hover: 'hover:border-indigo-300 hover:shadow-indigo-200/60',
      iconBg: 'bg-indigo-100 text-indigo-700'
    },
    {
      card: 'bg-gradient-to-br from-blue-50 via-cyan-50 to-white',
      border: 'border-cyan-100',
      hover: 'hover:border-cyan-300 hover:shadow-cyan-200/60',
      iconBg: 'bg-cyan-100 text-cyan-700'
    },
    {
      card: 'bg-gradient-to-br from-emerald-50 via-teal-50 to-white',
      border: 'border-emerald-100',
      hover: 'hover:border-emerald-300 hover:shadow-emerald-200/60',
      iconBg: 'bg-emerald-100 text-emerald-700'
    },
    {
      card: 'bg-gradient-to-br from-amber-50 via-orange-50 to-white',
      border: 'border-amber-100',
      hover: 'hover:border-amber-300 hover:shadow-amber-200/60',
      iconBg: 'bg-amber-100 text-amber-700'
    },
    {
      card: 'bg-gradient-to-br from-rose-50 via-pink-50 to-white',
      border: 'border-rose-100',
      hover: 'hover:border-rose-300 hover:shadow-rose-200/60',
      iconBg: 'bg-rose-100 text-rose-700'
    },
    {
      card: 'bg-gradient-to-br from-slate-50 via-sky-50 to-white',
      border: 'border-slate-100',
      hover: 'hover:border-slate-300 hover:shadow-slate-200/60',
      iconBg: 'bg-slate-100 text-slate-700'
    }
  ];
    
  const categories = [
    { id: 'all', label: 'All Rewards' },
    { id: 'discounts', label: 'Discounts' },
    { id: 'upgrades', label: 'Upgrades' },
    { id: 'access', label: 'Early Access' },
    { id: 'tickets', label: 'Free Tickets' }
  ];
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Redeem Keys</h2>
        <div className="flex items-center gap-2">
          <Key className="w-5 h-5 text-primary" />
          <span className="font-bold">{balance}</span>
          <span className="text-neutral-500">available</span>
        </div>
      </div>
      
      {/* Category tabs (hide for Featured/Bundles tab) */}
      {mode !== 'bundles' && (
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map(category => (
            <button
              key={category.id}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer ${
                selectedCategory === category.id
                  ? 'bg-primary text-white'
                  : 'bg-neutral-100 text-neutral-800 hover:bg-neutral-200'
              }`}
              onClick={() => setSelectedCategory(category.id)}
            >
              {category.label}
            </button>
          ))}
        </div>
      )}
      
      {/* Featured bundles */}
      {(mode === 'all' || mode === 'bundles') && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Featured Bundles</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rewardBundles.map(bundle => (
              <div
                key={bundle.id}
                className="relative overflow-hidden rounded-xl p-6 border border-amber-100 bg-gradient-to-br from-amber-50 via-yellow-50 to-white hover:border-amber-300 hover:shadow-amber-200/60 transition-all"
              >
                <div className="absolute -right-8 -top-8 bg-amber-200/40 w-24 h-24 rounded-full blur-sm" />
                
                <h4 className="font-bold text-lg mb-1">{bundle.name}</h4>
                <p className="text-neutral-600 mb-4">{bundle.description}</p>
                
                <div className="text-sm text-amber-700 font-medium mb-6">
                  {bundle.savings}
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-primary">{bundle.keysCost}</span>
                    <span className="text-xs text-neutral-600">KEYS</span>
                  </div>
                  <button
                    onClick={() => {
                      if (balance >= bundle.keysCost) {
                        toast.showSuccess('Coming Soon!', `Bundle redemption will be available soon. You would redeem: ${bundle.name}`);
                      } else {
                        toast.showError('Insufficient KEYS', `You need ${bundle.keysCost - balance} more KEYS`);
                      }
                    }}
                    disabled={balance < bundle.keysCost}
                    className={`px-4 py-2 rounded-md text-sm font-medium cursor-pointer ${
                      balance >= bundle.keysCost
                        ? 'bg-primary text-white hover:bg-primary-dark'
                        : 'bg-neutral-200 text-neutral-500 cursor-not-allowed'
                    }`}
                  >
                    Redeem Bundle
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Individual rewards */}
      {(mode === 'all' || mode === 'rewards') && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRewards.map((reward, index) => {
            const theme = rewardThemes[index % rewardThemes.length];
            return (
          <motion.div
            key={reward.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`rounded-xl p-6 flex flex-col border shadow-sm transition-all duration-300 ${theme.card} ${theme.border} ${theme.hover}`}
          >
            <div className={`mb-3 p-3 self-start rounded-full ${theme.iconBg}`}>
              {reward.icon}
            </div>
            <h3 className="font-bold mb-1">{reward.name}</h3>
            <p className="text-sm text-neutral-600 mb-4 flex-grow">
              {reward.description}
            </p>
            <div className="flex justify-between items-center mt-auto">
              <div className="flex items-center gap-1">
                <span className="font-bold text-primary">{reward.keysCost}</span>
                <span className="text-xs text-neutral-600">KEYS</span>
              </div>
              <button
                onClick={() => handleRedeem(reward)}
                disabled={balance < reward.keysCost}
                className={`px-4 py-2 rounded-md text-sm font-medium cursor-pointer ${
                  balance >= reward.keysCost
                    ? 'bg-primary text-white hover:bg-primary-dark'
                    : 'bg-neutral-200 text-neutral-500 cursor-not-allowed'
                }`}
              >
                Redeem
              </button>
            </div>
          </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}