/**
 * Sign-in page.
 * Split-screen layout: Clerk's <SignIn /> on the left, produce imagery on the right.
 * The [[...sign-in]] catch-all route is required by Clerk for SSO callbacks.
 *
 * Layout behaviour:
 *   mobile  — single column, white bg, logo + heading above Clerk form, no image
 *   md+     — left 50% form panel, right 50% full-bleed image panel
 */

"use client"

import { SignIn } from "@clerk/nextjs"
import { motion, type Variants } from "framer-motion"

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.05 },
  },
}

const itemVariants: Variants = {
  hidden: { y: 12, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.3, ease: "easeOut" } },
}

export default function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] flex-col md:flex-row">
      {/* ── Left panel ─────────────────────────────────────────────── */}
      {/*
          flex-1 on mobile so this panel fills the full dynamic viewport
          height when it's the only visible child, allowing justify-center
          to vertically center the form.
          md:flex-none + md:w-1/2 fixes it to 50% on desktop.
          items-center horizontally centers the inner max-width container.
      */}
      <div className="flex flex-1 flex-col items-center justify-center bg-white px-4 py-12 sm:px-8 sm:py-16 md:flex-none md:w-1/2 md:px-12 md:py-20">
        <div className="w-full max-w-sm">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col gap-7"
          >
            {/* Logo */}
            <motion.div variants={itemVariants}>
              <div className="flex items-center gap-2.5" role="img" aria-label="Produce CRM">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-600"
                  aria-hidden="true"
                >
                  <span className="text-sm font-bold text-white">P</span>
                </div>
                <span className="text-xl font-semibold text-slate-900">Produce CRM</span>
              </div>
            </motion.div>

            {/* Heading */}
            <motion.div variants={itemVariants}>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                Welcome back
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Sign in to your account to continue
              </p>
            </motion.div>

            {/* Clerk — w-full so it expands to fill the max-w-sm container */}
            <motion.div variants={itemVariants} className="w-full">
              <SignIn />
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* ── Right panel ────────────────────────────────────────────── */}
      {/*
          Hidden on mobile. On md+ it takes the remaining flex space via
          flex-1. The image uses absolute inset-0 so it fills whatever
          height the flex row establishes (driven by the left panel content).
          aria-hidden: the panel is purely decorative.
      */}
      <div
        className="relative hidden md:block md:flex-1"
        aria-hidden="true"
      >
        <img
          src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1400&q=80"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        {/* gradient: dark bottom for legibility of tagline, subtle top */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
        <div className="absolute bottom-8 left-8 right-8 lg:bottom-12 lg:left-12 lg:right-12">
          <p className="text-lg font-semibold leading-snug text-white lg:text-xl">
            Your produce sales pipeline,<br />organized and moving.
          </p>
        </div>
      </div>
    </div>
  )
}
