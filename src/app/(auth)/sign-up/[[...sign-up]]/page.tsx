/**
 * Sign-up page.
 * Matches the sign-in split-screen layout for a cohesive auth experience.
 * The [[...sign-up]] catch-all route is required by Clerk for OAuth callbacks.
 *
 * Layout behaviour:
 *   mobile  — single column, white bg, logo + heading above Clerk form, no image
 *   md+     — left 50% form panel, right 50% full-bleed image panel
 */

"use client"

import { SignUp } from "@clerk/nextjs"
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

export default function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] flex-col md:flex-row">
      {/* ── Left panel ─────────────────────────────────────────────── */}
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
                Create your account
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Join the team and start managing your accounts
              </p>
            </motion.div>

            {/* Clerk */}
            <motion.div variants={itemVariants} className="w-full">
              <SignUp />
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* ── Right panel ────────────────────────────────────────────── */}
      <div
        className="relative hidden md:block md:flex-1"
        aria-hidden="true"
      >
        <img
          src="https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=1400&q=80"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
        <div className="absolute bottom-8 left-8 right-8 lg:bottom-12 lg:left-12 lg:right-12">
          <p className="text-lg font-semibold leading-snug text-white lg:text-xl">
            Everything your team needs<br />to grow accounts and close deals.
          </p>
        </div>
      </div>
    </div>
  )
}
