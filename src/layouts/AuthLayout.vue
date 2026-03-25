<script setup>
</script>

<template>
  <div class="min-h-screen bg-[#0a0f1a] flex">
    <!-- Left panel - branding -->
    <div class="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden">
      <!-- Gradient orbs -->
      <div class="absolute top-0 left-0 w-[500px] h-[500px] bg-emerald-600/[0.07] rounded-full blur-[120px]"></div>
      <div class="absolute bottom-0 right-0 w-[400px] h-[400px] bg-teal-500/[0.05] rounded-full blur-[100px]"></div>

      <div class="relative z-10">
        <div class="flex items-center gap-3">
          <div class="w-11 h-11 rounded-lg overflow-hidden bg-white">
            <img src="/logo-clean-africa.jpg" alt="Clean Africa" class="w-full h-full object-contain" />
          </div>
          <div>
            <h1 class="text-white font-bold text-xl tracking-wide">CLEAN AFRICA</h1>
            <p class="text-white/30 text-[10px] font-medium tracking-widest uppercase">Société d'État</p>
          </div>
        </div>
      </div>

      <div class="relative z-10 space-y-6">
        <h2 class="text-4xl font-extrabold text-white leading-tight tracking-tight">
          Gestion de la Prime<br/>
          <span class="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">de Performance</span>
        </h2>
        <p class="text-white/40 text-lg leading-relaxed max-w-md">
          Évaluez, suivez et récompensez la performance de vos équipes de collecte avec transparence et précision.
        </p>
        <div class="flex gap-8 pt-4">
          <div class="text-center">
            <div class="text-3xl font-bold text-white">115+</div>
            <div class="text-white/20 text-[11px] uppercase tracking-wider mt-1">Véhicules</div>
          </div>
          <div class="w-px bg-white/[0.08]"></div>
          <div class="text-center">
            <div class="text-3xl font-bold text-white">6</div>
            <div class="text-white/20 text-[11px] uppercase tracking-wider mt-1">Services</div>
          </div>
          <div class="w-px bg-white/[0.08]"></div>
          <div class="text-center">
            <div class="text-3xl font-bold text-white">200+</div>
            <div class="text-white/20 text-[11px] uppercase tracking-wider mt-1">Agents</div>
          </div>
        </div>
      </div>

      <div class="relative z-10">
        <p class="text-white/15 text-xs">Libreville, Gabon &mdash; Société d'État « CLEAN AFRICA »</p>
      </div>
    </div>

    <!-- Right panel - form -->
    <div class="w-full lg:w-1/2 flex items-center justify-center p-8">
      <div class="w-full max-w-md">
        <!-- Mobile logo -->
        <div class="lg:hidden text-center mb-8">
          <div class="inline-flex items-center gap-3 mb-4">
            <div class="w-10 h-10 rounded-lg overflow-hidden bg-white">
              <img src="/logo-clean-africa.jpg" alt="Clean Africa" class="w-full h-full object-contain" />
            </div>
            <span class="text-white font-bold text-lg tracking-wide">CLEAN AFRICA</span>
          </div>
          <p class="text-white/30 text-sm">Prime de Performance</p>
        </div>

        <div class="bg-white rounded-2xl shadow-2xl shadow-black/30 p-8">
          <slot></slot>
        </div>

        <p class="text-center text-white/15 text-xs mt-6">Système sécurisé — accès réservé au personnel autorisé</p>
      </div>
    </div>
  </div>
</template>
