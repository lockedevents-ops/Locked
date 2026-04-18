import { useState } from 'react';
import { Star, Send, Ticket, Camera, Gift } from 'lucide-react';
import { RedeemCodeModal } from './RedeemCodeModal';

interface EarnAction {
  title: string;
  description: string;
  keysAmount: number | string | null;
  icon: React.ReactNode;
  actionLabel: string;
  link?: string;
  onClick?: () => void;
}

export function KeysActions() {
  const [isRedeemModalOpen, setIsRedeemModalOpen] = useState(false);

  const themes = [
    {
      card: 'bg-gradient-to-br from-indigo-50 via-purple-50 to-white border border-indigo-100 hover:border-indigo-300 hover:shadow-indigo-200/60',
      icon: 'bg-indigo-100 text-indigo-700'
    },
    {
      card: 'bg-gradient-to-br from-amber-50 via-orange-50 to-white border border-amber-100 hover:border-amber-300 hover:shadow-amber-200/60',
      icon: 'bg-amber-100 text-amber-700'
    },
    {
      card: 'bg-gradient-to-br from-emerald-50 via-teal-50 to-white border border-emerald-100 hover:border-emerald-300 hover:shadow-emerald-200/60',
      icon: 'bg-emerald-100 text-emerald-700'
    }
  ];

  const earnActions: EarnAction[] = [
    {
      title: 'Redeem Promo Code',
      description: 'Enter a promotional code from an organizer or event to earn keys',
      keysAmount: null, // Variable amount
      icon: <Gift className="w-6 h-6" />,
      actionLabel: 'Redeem Code',
      onClick: () => setIsRedeemModalOpen(true)
    },
    {
      title: 'Complete Your Profile',
      description: 'Fill in your name, phone number, and city to earn a one-time reward',
      keysAmount: 10,
      icon: <Star className="w-6 h-6" />,
      actionLabel: 'Complete Profile',
      link: '/dashboards/settings'
    },
    {
      title: 'Check In to Events',
      description: 'Attend events and check in to earn keys for each attendance',
      keysAmount: 'Varies',
      icon: <Ticket className="w-6 h-6" />,
      actionLabel: 'Find Events',
      link: '/pages/discover'
    }
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold mb-2">Ways to Earn KEYS</h2>
      <p className="text-neutral-600">
        Complete these actions to earn more KEYS and unlock exclusive rewards
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        {earnActions.map((action, index) => (
          (() => {
            const theme = themes[index % themes.length];
            return (
          <div
            key={index}
            className={`rounded-xl p-6 flex flex-col transition-all duration-300 ${theme.card}`}
          >
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-lg ${theme.icon}`}>
                {action.icon}
              </div>
              
              <div>
                <h3 className="font-bold">{action.title}</h3>
                <p className="text-sm text-neutral-600">{action.description}</p>
                
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex items-center gap-1">
                    {action.keysAmount && (
                      <>
                        <span className="text-primary font-bold">+{action.keysAmount}</span>
                        <span className="text-xs text-neutral-500">KEYS</span>
                      </>
                    )}
                    {!action.keysAmount && (
                      <span className="text-xs text-neutral-500 italic">Amount varies by code</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {action.link ? (
              <a
                href={action.link}
                className="mt-4 bg-primary text-white px-4 py-2 rounded-md text-center text-sm font-medium hover:bg-primary-dark transition-colors cursor-pointer"
              >
                {action.actionLabel}
              </a>
            ) : (
              <button
                onClick={action.onClick}
                className="mt-4 bg-primary text-white px-4 py-2 rounded-md text-center text-sm font-medium hover:bg-primary-dark transition-colors cursor-pointer"
              >
                {action.actionLabel}
              </button>
            )}
          </div>
            );
          })()
        ))}
      </div>

      <RedeemCodeModal 
        isOpen={isRedeemModalOpen} 
        onClose={() => setIsRedeemModalOpen(false)} 
      />
    </div>
  );
}