<script setup>
import { Leaf } from 'lucide-vue-next'
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 flex">
    <!-- Left panel - branding -->
    <div class="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden">
      <!-- Decorative circles -->
      <div class="absolute -top-20 -left-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl"></div>
      <div class="absolute -bottom-32 -right-20 w-96 h-96 bg-teal-400/10 rounded-full blur-3xl"></div>

      <div class="relative z-10">
        <div class="flex items-center gap-3 mb-2">
          <div class="w-12 h-12 bg-emerald-400/20 rounded-xl flex items-center justify-center">
            <Leaf class="w-7 h-7 text-emerald-400" />
          </div>
          <div>
            <h1 class="text-white font-bold text-2xl tracking-wide">CLEAN AFRICA</h1>
            <p class="text-emerald-300/60 text-xs font-medium tracking-widest uppercase">Société d'État</p>
          </div>
        </div>
      </div>

      <div class="relative z-10 space-y-6">
        <h2 class="text-4xl font-bold text-white leading-tight">
          Gestion des Primes<br/>
          <span class="text-emerald-400">de Performance</span>
        </h2>
        <p class="text-emerald-200/70 text-lg leading-relaxed max-w-md">
          Évaluez, suivez et récompensez la performance de vos équipes de collecte avec transparence et précision.
        </p>
        <div class="flex gap-6 pt-4">
          <div class="text-center">
            <div class="text-3xl font-bold text-white">115+</div>
            <div class="text-emerald-300/60 text-xs uppercase tracking-wider mt-1">Véhicules</div>
          </div>
          <div class="w-px bg-emerald-500/30"></div>
          <div class="text-center">
            <div class="text-3xl font-bold text-white">4</div>
            <div class="text-emerald-300/60 text-xs uppercase tracking-wider mt-1">Services</div>
          </div>
          <div class="w-px bg-emerald-500/30"></div>
          <div class="text-center">
            <div class="text-3xl font-bold text-white">200+</div>
            <div class="text-emerald-300/60 text-xs uppercase tracking-wider mt-1">Agents</div>
          </div>
        </div>
      </div>

      <div class="relative z-10">
        <p class="text-emerald-300/40 text-xs">Libreville, Gabon &mdash; Société d'État « CLEAN AFRICA »</p>
      </div>
    </div>

    <!-- Right panel - form -->
    <div class="w-full lg:w-1/2 flex items-center justify-center p-8">
      <div class="w-full max-w-md">
        <!-- Mobile logo -->
        <div class="lg:hidden text-center mb-8">
          <div class="inline-flex items-center gap-3 mb-4">
            <div class="w-10 h-10 bg-emerald-400/20 rounded-xl flex items-center justify-center">
              <Leaf class="w-6 h-6 text-emerald-400" />
            </div>
            <h1 class="text-white font-bold text-xl tracking-wide">CLEAN AFRICA</h1>
          </div>
          <p class="text-emerald-300/60 text-sm">Primes de Performance Collecte</p>
        </div>

        <div class="bg-white rounded-2xl shadow-2xl shadow-black/20 p-8">
          <slot></slot>
        </div>
      </div>
    </div>
  </div>
</template>
