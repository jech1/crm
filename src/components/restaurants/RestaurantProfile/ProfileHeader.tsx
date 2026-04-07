/**
 * Restaurant profile header.
 *
 * Shows: name, address, stage badge, assigned rep, opportunity score,
 * cuisine type, and quick action buttons (Log Visit, Schedule, Edit).
 *
 * Mobile  (< sm): fully stacked — identity → score → actions → stats
 * Desktop (sm+) : two-column row with score+actions pinned to the right
 */

import Link from "next/link"
import { MapPin, Phone, Globe, User } from "lucide-react"
import { StageBadge } from "../StageBadge"
import { StageUpdateButton } from "../StageUpdateButton"
import { WinLossButtons } from "../WinLossButtons"
import { Button } from "@/components/ui/button"
import type { RestaurantProfile } from "@/types"

interface ProfileHeaderProps {
  restaurant: RestaurantProfile
  canEdit: boolean
}

export function ProfileHeader({ restaurant, canEdit }: ProfileHeaderProps) {
  return (
    <div className="rounded-xl border bg-white dark:bg-slate-800 dark:border-slate-700 p-4 sm:p-6">

      {/*
        ── Top section ─────────────────────────────────────────────────
        Mobile  : flex-col — identity block first, score+actions below
        Desktop : flex-row — identity left, score+actions right (unchanged)
      */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

        {/* ── Identity block ──────────────────────────────────────── */}
        <div className="min-w-0 sm:flex-1">

          {/* Name + badges — flex-wrap so long names don't push badges off-screen */}
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <h1 className="text-xl font-semibold text-slate-900 dark:text-white leading-tight">
              {restaurant.name}
            </h1>
            {canEdit
              ? <StageUpdateButton restaurantId={restaurant.id} currentStage={restaurant.pipelineStage} />
              : <StageBadge stage={restaurant.pipelineStage} />
            }
            {restaurant.isCustomer && (
              <span className="text-xs font-medium px-2 py-0.5 bg-green-100 text-green-700 rounded-md">
                Customer
              </span>
            )}
          </div>

          {/* Address / contact row */}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              {restaurant.address}, {restaurant.city}, {restaurant.state} {restaurant.zip}
            </span>
            {restaurant.phone && (
              <a
                href={`tel:${restaurant.phone}`}
                className="flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white"
              >
                <Phone className="h-3.5 w-3.5 shrink-0" />
                {restaurant.phone}
              </a>
            )}
            {restaurant.website && (
              <a
                href={restaurant.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white"
              >
                <Globe className="h-3.5 w-3.5 shrink-0" />
                Website
              </a>
            )}
            {restaurant.rep && (
              <span className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 shrink-0" />
                {restaurant.rep.name}
              </span>
            )}
          </div>

          {/* Cuisine / type / volume tags — only rendered when at least one tag exists */}
          {(restaurant.cuisineType || restaurant.restaurantType || restaurant.estimatedVolume) && (
            <div className="flex flex-wrap gap-2 mt-3">
              {restaurant.cuisineType && (
                <span className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded">
                  {restaurant.cuisineType}
                </span>
              )}
              {restaurant.restaurantType && (
                <span className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded">
                  {restaurant.restaurantType.replace("_", " ")}
                </span>
              )}
              {restaurant.estimatedVolume && (
                <span className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded">
                  {restaurant.estimatedVolume} volume
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── Score + actions ─────────────────────────────────────── */}
        {/*
          Mobile  : stacks below identity; score is left-aligned, buttons wrap
          Desktop : pinned right column; score is right-aligned, buttons row
        */}
        <div className="flex flex-col gap-3 sm:shrink-0 sm:items-end">

          {/* Opportunity score */}
          <div className="sm:text-right">
            <p className="text-xs text-slate-400 dark:text-slate-500">Opportunity Score</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {restaurant.opportunityScore}
            </p>
            <div className="w-24 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full mt-1 sm:ml-auto">
              <div
                className="h-full bg-green-500 rounded-full"
                style={{ width: `${restaurant.opportunityScore}%` }}
              />
            </div>
          </div>

          {/* Action buttons — flex-wrap keeps them from squeezing on narrow screens */}
          {canEdit && (
            <div className="flex flex-col gap-2 items-end">
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link href={`/visits/new?restaurantId=${restaurant.id}`}>
                    Log Visit
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/meetings/new?restaurantId=${restaurant.id}`}>
                    Schedule
                  </Link>
                </Button>
                <Button asChild size="sm">
                  <Link href={`/restaurants/${restaurant.id}/edit`}>Edit</Link>
                </Button>
              </div>
              <WinLossButtons
                restaurantId={restaurant.id}
                restaurantName={restaurant.name}
                currentStage={restaurant.pipelineStage}
              />
            </div>
          )}
        </div>
      </div>

      {/*
        ── Stats row ───────────────────────────────────────────────────
        Mobile  : 2×2 grid — gives each stat ~140px on a 320px phone
        Desktop : 4-column row (unchanged)
      */}
      <div className="grid grid-cols-2 gap-3 mt-5 pt-5 border-t dark:border-slate-700 sm:grid-cols-4 sm:gap-4">
        <div className="text-center">
          <p className="text-lg font-semibold text-slate-900 dark:text-white">{restaurant._count.visits}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Visits</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-slate-900 dark:text-white">{restaurant._count.meetings}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Meetings</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-slate-900 dark:text-white">{restaurant._count.tasks}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Open Tasks</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-slate-900 dark:text-white">{restaurant._count.warmIntros}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Warm Intros</p>
        </div>
      </div>
    </div>
  )
}
