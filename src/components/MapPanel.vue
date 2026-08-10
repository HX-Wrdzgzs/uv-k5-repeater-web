<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Repeater } from '../types/repeater'
import { formatFrequency } from '../lib/format'

const props = defineProps<{ repeaters: Repeater[] }>()
const emit = defineEmits<{ select: [repeater: Repeater] }>()
const mapRoot = ref<HTMLElement | null>(null)
let map: L.Map | null = null

onMounted(() => {
  if (!mapRoot.value) return
  const currentMap = L.map(mapRoot.value, { zoomControl: false, scrollWheelZoom: false }).setView([35.86, 104.19], 4)
  map = currentMap
  L.control.zoom({ position: 'bottomright' }).addTo(currentMap)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 18,
  }).addTo(currentMap)

  const grouped = new Map<string, Repeater[]>()
  for (const repeater of props.repeaters) {
    const group = grouped.get(repeater.province) || []
    group.push(repeater)
    grouped.set(repeater.province, group)
  }

  for (const items of grouped.values()) {
    const first = items[0]
    const marker = L.circleMarker([first.latitude, first.longitude], {
      radius: Math.min(18, 6 + Math.sqrt(items.length)),
      color: '#14784b',
      weight: 2,
      fillColor: '#24a36a',
      fillOpacity: 0.72,
    }).addTo(currentMap)
    marker.bindTooltip(`${first.province} · ${items.length} 条`, { direction: 'top', offset: [0, -8] })
    marker.on('click', () => emit('select', first))
    marker.bindPopup(`<strong>${first.province}</strong><br>${items.length} 条记录<br><small>${formatFrequency(first.rxMhz)} MHz 起</small>`)
  }
})

onBeforeUnmount(() => {
  map?.remove()
  map = null
})
</script>

<template>
  <div ref="mapRoot" class="map-panel" aria-label="全国中继分布地图"></div>
</template>
