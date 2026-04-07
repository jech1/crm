/**
 * Contacts section on the restaurant profile.
 * Lists all contacts with role, phone, email, and relationship score.
 */

import Link from "next/link"
import { Phone, Mail, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Contact } from "@prisma/client"

interface ContactsSectionProps {
  contacts: Contact[]
  restaurantId: string
  canEdit: boolean
}

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Owner",
  CHEF: "Chef",
  KITCHEN_MANAGER: "Kitchen Manager",
  PURCHASING_MANAGER: "Purchasing Manager",
  GENERAL_MANAGER: "General Manager",
  FRONT_DESK: "Front Desk",
  OTHER: "Other",
}

export function ContactsSection({ contacts, restaurantId, canEdit }: ContactsSectionProps) {
  return (
    <div className="rounded-xl border bg-white dark:bg-slate-800 dark:border-slate-700 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Contacts ({contacts.length})</h2>
        {canEdit && (
          <Button asChild size="sm" variant="outline">
            <Link href={`/restaurants/${restaurantId}/edit#contacts`}>Add Contact</Link>
          </Button>
        )}
      </div>

      {contacts.length === 0 ? (
        <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-4">No contacts added yet.</p>
      ) : (
        <ul className="space-y-3">
          {contacts.map((contact) => (
            <li key={contact.id} className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{contact.name}</p>
                  {contact.isPrimary && (
                    <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{ROLE_LABELS[contact.role] ?? contact.role}</p>
                <div className="flex gap-3 mt-1">
                  {contact.phone && (
                    <a
                      href={`tel:${contact.phone}`}
                      className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    >
                      <Phone className="h-3 w-3" />
                      {contact.phone}
                    </a>
                  )}
                  {contact.email && (
                    <a
                      href={`mailto:${contact.email}`}
                      className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    >
                      <Mail className="h-3 w-3" />
                      {contact.email}
                    </a>
                  )}
                </div>
                {contact.notes && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 italic">{contact.notes}</p>
                )}
              </div>
              {/* Relationship score */}
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <div
                    key={n}
                    className={`w-1.5 h-1.5 rounded-full ${n <= contact.relationshipScore ? "bg-green-400" : "bg-slate-200 dark:bg-slate-600"}`}
                  />
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
