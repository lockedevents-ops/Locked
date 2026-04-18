"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Calendar, Clock, Info } from "lucide-react";
import { parseISO, isFuture } from "date-fns";
import { PageLoader } from '@/components/loaders/PageLoader';

interface TicketEvent {
  id: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventImage?: string;
  venue?: string;
}

export default function AttendedEventsPage() {
  const [attendedEvents, setAttendedEvents] = useState<TicketEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAttendedEvents = async () => {
      try {
        let userTickets: TicketEvent[] = [];
        const storedTickets = typeof window !== "undefined" ? localStorage.getItem("user-tickets") : null;

        if (storedTickets) {
          userTickets = JSON.parse(storedTickets);
        } else if (typeof window !== "undefined") {
          const eventsData = localStorage.getItem("events");
          if (eventsData) {
            const allEvents = JSON.parse(eventsData);
            const publishedPastEvents = allEvents
              .filter((event: any) => {
                if (!event.eventDate || event.status !== "published") return false;
                try {
                  return !isFuture(parseISO(event.eventDate));
                } catch (error) {
                  return false;
                }
              })
              .slice(0, 3);

            if (publishedPastEvents.length > 0) {
              userTickets = publishedPastEvents.map((event: any, index: number) => ({
                id: `attended-${index + 1}`,
                eventId: event.id,
                eventTitle: event.title,
                eventDate: event.eventDate,
                eventImage: event.imageUrl,
                venue: event.location || "TBD",
              }));

              localStorage.setItem("user-tickets", JSON.stringify(userTickets));
            }
          }
        }

        const attended = userTickets.filter((ticket) => {
          if (!ticket.eventDate) return false;
          try {
            return !isFuture(parseISO(ticket.eventDate));
          } catch (error) {
            return false;
          }
        });

        setAttendedEvents(attended);
      } catch (error) {
        console.error("Error loading attended events:", error);
        setAttendedEvents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAttendedEvents();
  }, []);

  const renderCards = () => (
    <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
      {attendedEvents.map((event) => (
        <div key={event.id} className="bg-white rounded-lg overflow-hidden shadow-sm border border-neutral-100 flex flex-col">
          <div className="relative h-40">
            {event.eventImage ? (
              <Image src={event.eventImage} alt={event.eventTitle} fill className="object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-600 via-cyan-500 to-emerald-500" />
            )}
          </div>
          <div className="p-5 flex-1 flex flex-col">
            <div className="flex-1">
              <h3 className="font-semibold text-lg text-neutral-900 line-clamp-1">{event.eventTitle}</h3>
              <div className="text-sm text-neutral-500 space-y-1 mt-3">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {new Date(event.eventDate).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>
                    {new Date(event.eventDate).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2">
              <Link
                href={`/event/${event.eventId}`}
                className="w-full inline-flex justify-center items-center rounded-md border border-primary text-primary font-medium text-sm py-2 hover:bg-primary/5 transition-colors cursor-pointer"
              >
                View Event Details
              </Link>
              <button
                disabled
                className="w-full inline-flex justify-center items-center rounded-md bg-neutral-100 text-neutral-500 text-sm font-medium py-2 cursor-not-allowed border border-dashed border-neutral-300"
              >
                Leave Review (Coming Soon)
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Attended Events</h1>
          <p className="text-neutral-600 mt-1">Everything you&apos;ve already experienced, all in one place.</p>
        </div>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="inline-flex items-center gap-3 bg-neutral-100 border border-dashed border-neutral-300 rounded-2xl px-4 py-2 text-sm text-neutral-600">
            <Info className="w-4 h-4" />
            <span>Reviews are on the way—soon you&apos;ll be able to share thoughts on every past event.</span>
          </div>
        </div>
      </div>

      {loading ? (
        <PageLoader message="Loading your attended events..." />
      ) : attendedEvents.length > 0 ? (
        renderCards()
      ) : (
        <div className="bg-white p-10 rounded-xl border border-neutral-200 text-center space-y-3">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-neutral-100 text-neutral-500">
            <Calendar className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-semibold text-neutral-900">No attended events yet</h3>
          <p className="text-sm text-neutral-600">
            Attend events on Locked and they&apos;ll show up here once they&apos;re over. Reviews launch soon, so stay tuned!
          </p>
          <Link
            href="/pages/discover"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-md bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Discover Events
          </Link>
        </div>
      )}
    </div>
  );
}
