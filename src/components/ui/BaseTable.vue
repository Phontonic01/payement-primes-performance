<script setup>
defineProps({
  columns: { type: Array, required: true },
  rows: { type: Array, required: true }
})
</script>

<template>
  <div class="overflow-x-auto">
    <table class="w-full">
      <thead>
        <tr class="border-b border-gray-100">
          <th
            v-for="col in columns"
            :key="col.key"
            class="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3"
          >
            {{ col.label }}
          </th>
          <th class="text-right px-4 py-3">
            <span class="sr-only">Actions</span>
          </th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-50">
        <tr
          v-for="(row, i) in rows"
          :key="row.id || i"
          class="hover:bg-gray-50/50 transition-colors duration-150"
        >
          <td
            v-for="col in columns"
            :key="col.key"
            class="px-4 py-3 text-sm text-gray-700"
          >
            <slot :name="'cell-' + col.key" :value="row[col.key]" :row="row">
              {{ row[col.key] }}
            </slot>
          </td>
          <td class="px-4 py-3 text-right">
            <slot name="actions" :row="row"></slot>
          </td>
        </tr>
      </tbody>
    </table>
    <div v-if="rows.length === 0" class="text-center py-8 text-gray-400 text-sm">
      Aucune donnee disponible
    </div>
  </div>
</template>
