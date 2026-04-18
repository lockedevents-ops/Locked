import { useKeysStore } from '@/store/keysStore';
import { motion } from 'framer-motion';
import { Key, Award } from 'lucide-react';

export function KeysBalance({ size = 'default' }: { size?: 'small' | 'default' | 'large' }) {
  const { balance, status } = useKeysStore();
  
  const sizeClasses = {
    small: "text-sm",
    default: "text-base",
    large: "text-xl"
  };
  
  const statusIcons = {
    standard: null,
    gold: <Award className="w-4 h-4 text-yellow-500" />,
    platinum: <Award className="w-4 h-4 text-purple-500" />
  };
  
  return (
    <motion.div 
      className={`flex items-center gap-1 ${sizeClasses[size]}`}
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <Key className="w-4 h-4 text-accent" />
      <span className="font-medium">{balance}</span>
      <span className="text-neutral-400">KEYS</span>
      {status && statusIcons[status]}
    </motion.div>
  );
}