"use client"

/**
 * ContactsManager — inline CRUD for restaurant contacts on the edit page.
 * Uses independent API calls (separate from the main restaurant form).
 */

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Pencil, Trash2, Star, X, Check } from "lucide-react"
import type { ContactRole } from "@prisma/client"

const CONTACT_ROLE_LABELS: Record<ContactRole, string> = {
  OWNER: "Owner",
  CHEF: "Chef",
  KITCHEN_MANAGER: "Kitchen Manager",
  PURCHASING_MANAGER: "Purchasing Manager",
  GENERAL_MANAGER: "General Manager",
  FRONT_DESK: "Front Desk",
  OTHER: "Other",
}

const CONTACT_ROLE_OPTIONS = Object.entries(CONTACT_ROLE_LABELS) as [ContactRole, string][]

type Contact = {
  id: string
  name: string
  role: ContactRole
  phone: string | null
  email: string | null
  notes: string | null
  isPrimary: boolean
}

interface Props {
  restaurantId: string
  contacts: Contact[]
}

type ContactForm = {
  name: string
  role: ContactRole
  phone: string
  email: string
  notes: string
  isPrimary: boolean
}

const emptyForm = (): ContactForm => ({
  name: "",
  role: "OWNER",
  phone: "",
  email: "",
  notes: "",
  isPrimary: false,
})

export function ContactsManager({ restaurantId, contacts: initial }: Props) {
  const router = useRouter()
  const [contacts, setContacts] = useState<Contact[]>(initial)
  const [addingNew, setAddingNew] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ContactForm>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function startAdd() {
    setEditingId(null)
    setForm(emptyForm())
    setError(null)
    setAddingNew(true)
  }

  function startEdit(contact: Contact) {
    setAddingNew(false)
    setEditingId(contact.id)
    setForm({
      name: contact.name,
      role: contact.role,
      phone: contact.phone ?? "",
      email: contact.email ?? "",
      notes: contact.notes ?? "",
      isPrimary: contact.isPrimary,
    })
    setError(null)
  }

  function cancel() {
    setAddingNew(false)
    setEditingId(null)
    setError(null)
  }

  function set(field: keyof ContactForm, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSave() {
    if (!form.name.trim()) { setError("Name is required"); return }
    setSaving(true)
    setError(null)

    const body = {
      name: form.name.trim(),
      role: form.role,
      phone: form.phone.trim() || undefined,
      email: form.email.trim() || undefined,
      notes: form.notes.trim() || undefined,
      isPrimary: form.isPrimary,
    }

    try {
      if (addingNew) {
        const res = await fetch(`/api/restaurants/${restaurantId}/contacts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        const text = await res.text()
        const json = text ? JSON.parse(text) : {}
        if (!res.ok) throw new Error(json.error ?? "Failed to add contact")
        const newContact: Contact = json.data
        const updated = form.isPrimary
          ? contacts.map((c) => ({ ...c, isPrimary: false }))
          : [...contacts]
        setContacts([...updated, newContact])
        setAddingNew(false)
      } else if (editingId) {
        const res = await fetch(`/api/restaurants/${restaurantId}/contacts/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        const text = await res.text()
        const json = text ? JSON.parse(text) : {}
        if (!res.ok) throw new Error(json.error ?? "Failed to update contact")
        const updated: Contact = json.data
        setContacts((prev) =>
          prev.map((c) => {
            if (form.isPrimary && c.id !== editingId) return { ...c, isPrimary: false }
            if (c.id === editingId) return updated
            return c
          }),
        )
        setEditingId(null)
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(contactId: string) {
    if (!confirm("Remove this contact?")) return
    try {
      const res = await fetch(`/api/restaurants/${restaurantId}/contacts/${contactId}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const text = await res.text()
        const json = text ? JSON.parse(text) : {}
        throw new Error(json.error ?? "Failed to delete")
      }
      setContacts((prev) => prev.filter((c) => c.id !== contactId))
      if (editingId === contactId) setEditingId(null)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-800">Contacts</h2>
        {!addingNew && !editingId && (
          <button
            type="button"
            onClick={startAdd}
            className="flex items-center gap-1 text-xs font-medium text-green-700 hover:text-green-800 border border-green-200 bg-green-50 hover:bg-green-100 px-2 py-1 rounded-md transition-colors"
          >
            <Plus className="h-3 w-3" />
            Add Contact
          </button>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-600 mb-2">{error}</p>
      )}

      {/* Existing contacts */}
      {contacts.length > 0 && (
        <div className="space-y-0 divide-y mb-3">
          {contacts.map((contact) =>
            editingId === contact.id ? (
              <ContactFormRow
                key={contact.id}
                form={form}
                set={set}
                onSave={handleSave}
                onCancel={cancel}
                saving={saving}
              />
            ) : (
              <div key={contact.id} className="flex items-start gap-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    {contact.isPrimary && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500 shrink-0" />}
                    <span className="text-sm font-medium text-slate-800">{contact.name}</span>
                    <span className="text-xs text-slate-400">· {CONTACT_ROLE_LABELS[contact.role]}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    {contact.phone && (
                      <a href={`tel:${contact.phone}`} className="text-xs text-slate-500 hover:text-slate-700">
                        {contact.phone}
                      </a>
                    )}
                    {contact.email && (
                      <a href={`mailto:${contact.email}`} className="text-xs text-slate-500 hover:text-slate-700">
                        {contact.email}
                      </a>
                    )}
                  </div>
                  {contact.notes && (
                    <p className="text-xs text-slate-400 mt-0.5 italic">{contact.notes}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => startEdit(contact)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(contact.id)}
                    className="p-1 text-slate-400 hover:text-red-500 rounded"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ),
          )}
        </div>
      )}

      {contacts.length === 0 && !addingNew && (
        <p className="text-xs text-slate-400 text-center py-3">No contacts yet.</p>
      )}

      {/* Add new contact form */}
      {addingNew && (
        <div className="border rounded-lg p-3 bg-slate-50 mt-2">
          <ContactFormRow
            form={form}
            set={set}
            onSave={handleSave}
            onCancel={cancel}
            saving={saving}
          />
        </div>
      )}
    </div>
  )
}

function ContactFormRow({
  form,
  set,
  onSave,
  onCancel,
  saving,
}: {
  form: ContactForm
  set: (field: keyof ContactForm, value: string | boolean) => void
  onSave: () => void
  onCancel: () => void
  saving: boolean
}) {
  return (
    <div className="space-y-2 py-2">
      <div className="grid grid-cols-2 gap-2">
        <input
          type="text"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="Full name *"
          className="text-sm border border-slate-200 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <select
          value={form.role}
          onChange={(e) => set("role", e.target.value)}
          className="text-sm border border-slate-200 rounded-md px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          {CONTACT_ROLE_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input
          type="tel"
          value={form.phone}
          onChange={(e) => set("phone", e.target.value)}
          placeholder="Phone"
          className="text-sm border border-slate-200 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <input
          type="email"
          value={form.email}
          onChange={(e) => set("email", e.target.value)}
          placeholder="Email"
          className="text-sm border border-slate-200 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>
      <input
        type="text"
        value={form.notes}
        onChange={(e) => set("notes", e.target.value)}
        placeholder="Notes (optional)"
        className="w-full text-sm border border-slate-200 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-green-500"
      />
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
          <input
            type="checkbox"
            checked={form.isPrimary}
            onChange={(e) => set("isPrimary", e.target.checked)}
            className="rounded"
          />
          Primary contact
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded"
          >
            <X className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="flex items-center gap-1 px-3 py-1 text-xs font-medium bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-60"
          >
            <Check className="h-3.5 w-3.5" />
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  )
}
