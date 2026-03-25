<script setup>
defineProps({
  columns: { type: Array, required: true },
  rows: { type: Array, required: true }
})
</script>

<template>
  <div class="overflow-x-auto -mx-1" role="region" aria-label="Tableau de données" tabindex="0">
    <table class="w-full">
      <thead>
        <tr class="border-b border-gray-200/60">
          <th
            v-for="col in columns"
            :key="col.key"
            scope="col"
            class="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 first:pl-1"
          >
            {{ col.label }}
          </th>
          <th scope="col" class="text-right px-4 py-3">
            <span class="sr-only">Actions</span>
          </th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-100/60">
        <tr
          v-for="(row, i) in rows"
          :key="row.id || i"
          class="group hover:bg-emerald-50/30 transition-colors duration-150"
        >
          <td
            v-for="col in columns"
            :key="col.key"
            class="px-4 py-3.5 text-sm text-gray-600 first:pl-1 first:font-medium first:text-gray-900"
          >
            <slot :name="'cell-' + col.key" :value="row[col.key]" :row="row">
              {{ row[col.key] }}
            </slot>
          </td>
          <td class="px-4 py-3.5 text-right">
            <slot name="actions" :row="row"></slot>
          </td>
        </tr>
      </tbody>
    </table>
    <div v-if="rows.length === 0" class="text-center py-16">
      <div class="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gray-50 mb-3">
        <svg class="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      </div>
      <p class="text-sm font-medium text-gray-400">Aucune donnée disponible</p>
      <p class="text-xs text-gray-300 mt-1">Les entrées apparaîtront ici une fois saisies.</p>
    </div>
  </div>
</template>
