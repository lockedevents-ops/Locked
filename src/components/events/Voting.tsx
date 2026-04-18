"use client";

import React, { useState, useMemo } from 'react';
import { ModalBackdrop } from '@/components/ui/ModalBackdrop';
import { VotingModal } from './VotingModal';
import { Input } from '@/components/ui/input';
import Image from 'next/image';
import { Button } from '@/components/ui/button';



interface Contestant {
  id: string;
  name: string;
  image: string;
  description?: string;
}


interface VotingProps {
  contestants: Contestant[];
  onVote: (contestantId: string, votes: number) => void;
  featuredCount?: number; // Number of featured/top contestants to show as cards
  voteCost?: number;
  isEventEnded?: boolean;
}
 
export function Voting({ contestants, onVote, featuredCount = 4, voteCost = 1, isEventEnded = false }: VotingProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedContestant, setSelectedContestant] = useState<Contestant | null>(null);
  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false);

  // Featured/top contestants (first N or sorted by some criteria)
  const featuredContestants = useMemo(() => {
    return contestants.slice(0, featuredCount);
  }, [contestants, featuredCount]);

  // Filtered contestants for dropdown
  const filteredContestants = useMemo(() => {
    if (!search) return contestants;
    return contestants.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
  }, [contestants, search]);


  const handleContestantClick = (contestant: Contestant) => {
    setSelectedContestant(contestant);
    setModalOpen(true);
    setShowAll(false); // close all view if open
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedContestant(null);
  };

  return (
    <div className="border-t pt-8">
      <h2 className="text-2xl font-bold mb-4">Vote for your Favorite</h2>

      {/* Event Ended Notice */}
      {isEventEnded && (
        <div className="bg-neutral-100 border border-neutral-200 rounded-lg p-6 text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-neutral-200 rounded-full mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-neutral-600">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-neutral-800 mb-2">Voting Has Ended</h3>
          <p className="text-sm text-neutral-600">This event has concluded and voting is now closed. Thank you for participating!</p>
        </div>
      )}

      {/* Featured/Top Contestants */}
      <div className="mb-8 relative">
        <h3 className="text-lg font-semibold mb-2">Featured Contestants</h3>

        <div className={`flex flex-wrap gap-4 ${isEventEnded ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
          {featuredContestants.map((contestant) => (
            <button
              key={contestant.id}
              onClick={() => !isEventEnded && handleContestantClick(contestant)}
              disabled={isEventEnded}
              className="flex flex-col items-center gap-2 p-4 border rounded-lg hover:shadow-md transition cursor-pointer bg-white min-w-[120px] max-w-[140px]"
            >
              <img
                src={contestant.image || `/avatars/avatar-${(parseInt(contestant.id.replace(/\D/g, ''), 10) % 4) + 1}.png`}
                alt={contestant.name}
                className="w-16 h-16 rounded-full object-cover border bg-neutral-100"
                onError={e => {
                  const target = e.target as HTMLImageElement;
                  target.onerror = null;
                  target.src = `/avatars/avatar-1.png`;
                }}
              />
              <span className="font-medium text-neutral-800 text-sm text-center line-clamp-2">{contestant.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Searchable Dropdown for All Contestants */}
      <div className={`mb-4 max-w-md ${isEventEnded ? 'opacity-50 pointer-events-none' : ''}`}>
        <label htmlFor="contestant-search" className="block text-sm font-medium mb-1">Search for a contestant</label>
        <Input
          id="contestant-search"
          type="text"
          placeholder="Type a name..."
          value={search}
          disabled={isEventEnded}
          onChange={e => setSearch(e.target.value)}
          className="mb-2"
        />
        <div className="relative">
          {search && (
            <div className="absolute z-10 w-full bg-white border border-neutral-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
              {filteredContestants.length === 0 ? (
                <div className="p-3 text-neutral-500 text-sm">No contestants found.</div>
              ) : (
                filteredContestants.map(contestant => (
                  <button
                    key={contestant.id}
                    onClick={() => handleContestantClick(contestant)}
                    className="flex items-center gap-3 w-full px-4 py-2 hover:bg-primary/10 transition text-left"
                  >
                    <img
                      src={contestant.image || `/avatars/avatar-${(parseInt(contestant.id.replace(/\D/g, ''), 10) % 4) + 1}.png`}
                      alt={contestant.name}
                      className="w-8 h-8 rounded-full object-cover border bg-neutral-100"
                      onError={e => {
                        const target = e.target as HTMLImageElement;
                        target.onerror = null;
                        target.src = `/avatars/avatar-1.png`;
                      }}
                    />
                    <span className="font-medium text-neutral-800 text-sm line-clamp-1">{contestant.name}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
        <Button
          variant="outline"
          className="mt-2 cursor-pointer"
          disabled={isEventEnded}
          onClick={() => setShowAll(true)}
        >
          View All Contestants
        </Button>
      </div>

      {/* All Contestants Modal/Section */}
      {showAll && (
        <ModalBackdrop onClick={() => setShowAll(false)}>
          <div
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 p-6 relative"
            onClick={e => e.stopPropagation()}
          >
            <button
              className="absolute top-2 right-2 text-neutral-500 hover:text-neutral-800 text-xl cursor-pointer"
              onClick={() => setShowAll(false)}
              aria-label="Close"
            >
              &times;
            </button>
            <h4 className="text-lg font-semibold mb-4">All Contestants</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto">
              {contestants.map(contestant => (
                <button
                  key={contestant.id}
                  onClick={() => handleContestantClick(contestant)}
                  className="flex flex-col items-center gap-2 p-3 border rounded-lg hover:shadow-md transition cursor-pointer bg-white"
                >
                  <img
                    src={contestant.image || `/avatars/avatar-${(parseInt(contestant.id.replace(/\D/g, ''), 10) % 4) + 1}.png`}
                    alt={contestant.name}
                    className="w-12 h-12 rounded-full object-cover border bg-neutral-100"
                    onError={e => {
                      const target = e.target as HTMLImageElement;
                      target.onerror = null;
                      target.src = `/avatars/avatar-1.png`;
                    }}
                  />
                  <span className="font-medium text-neutral-800 text-sm text-center line-clamp-2">{contestant.name}</span>
                </button>
              ))}
            </div>
          </div>
        </ModalBackdrop>
      )}

      <VotingModal
        isOpen={modalOpen}
        onClose={handleModalClose}
        contestant={selectedContestant}
        voteCost={voteCost}
        onVote={onVote}
      />
    </div>
  );
}
