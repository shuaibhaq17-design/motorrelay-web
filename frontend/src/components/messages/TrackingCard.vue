<script setup>
import { computed } from 'vue';

const props = defineProps({
  location: {
    type: Object,
    required: true
  },
  destination: {
    type: Object,
    default: () => ({})
  },
  driver: {
    type: Object,
    default: () => null
  },
  etaMinutes: {
    type: [Number, null],
    default: null
  },
  recordedAt: {
    type: [String, Number, Date, null],
  default: null
  }
});

const location = computed(() => props.location ?? {});
const destination = computed(() => props.destination ?? {});
const driver = computed(() => props.driver ?? null);

const hasCoordinates = computed(() => {
  return typeof location.value?.lat === 'number' && typeof location.value?.lng === 'number';
});

const mapSrc = computed(() => {
  if (!hasCoordinates.value) return null;
  const lat = location.value.lat;
  const lng = location.value.lng;
  return `https://maps.google.com/maps?q=${lat},${lng}&z=14&output=embed`;
});

const destinationLabel = computed(() => {
  const parts = [destination.value?.label, destination.value?.postcode].filter(Boolean);
  return parts.join(', ');
});

const destinationQuery = computed(() => {
  const label = destinationLabel.value;
  if (label) return encodeURIComponent(label);
  return '';
});

const navigationLinks = computed(() => {
  if (!destinationQuery.value) return [];
  return [
    {
      id: 'google',
      label: 'Google Maps',
      href: `https://www.google.com/maps/dir/?api=1&destination=${destinationQuery.value}&travelmode=driving`
    },
    {
      id: 'waze',
      label: 'Waze',
      href: `https://waze.com/ul?q=${destinationQuery.value}&navigate=yes`
    }
  ];
});

const etaLabel = computed(() => {
  if (props.etaMinutes === null || props.etaMinutes === undefined) return null;
  const minutes = Number(props.etaMinutes);
  if (Number.isNaN(minutes)) return null;
  if (minutes <= 2) return 'Arriving now';
  if (minutes <= 5) return `About ${minutes} minutes away`;
  return `${minutes} minutes away`;
});

const speedLabel = computed(() => {
  if (location.value?.speed_kph === null || location.value?.speed_kph === undefined) return null;
  const speed = Number(location.value.speed_kph);
  if (Number.isNaN(speed)) return null;
  return `${speed.toFixed(0)} km/h`;
});

const recordedLabel = computed(() => {
  if (!props.recordedAt) return null;
  try {
    return new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      day: 'numeric',
      month: 'short'
    }).format(new Date(props.recordedAt));
  } catch {
    return props.recordedAt;
  }
});

const statusHeading = computed(() => etaLabel.value || 'Live location shared');
</script>

<template>
  <article class="w-full overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow">
    <div class="relative h-64 w-full bg-slate-200">
      <iframe
        v-if="mapSrc"
        :src="mapSrc"
        width="100%"
        height="100%"
        style="border: 0"
        allowfullscreen
        loading="lazy"
        referrerpolicy="no-referrer-when-downgrade"
        title="Live location map"
      />
      <div
        v-else
        class="flex h-full w-full items-center justify-center bg-slate-200 text-sm font-semibold text-slate-600"
      >
        Location unavailable
      </div>
      <span class="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-emerald-700">
        {{ statusHeading }}
      </span>
    </div>

    <div class="space-y-4 p-4">
      <header class="flex items-start justify-between gap-3">
        <div class="space-y-1">
          <p class="text-sm font-semibold text-slate-900">
            {{ destinationLabel || 'Drop-off location' }}
          </p>
          <p v-if="etaLabel" class="text-xs text-slate-500">
            {{ etaLabel }}
          </p>
          <p v-else class="text-xs text-slate-500">
            Updated in real time for the dealer.
          </p>
        </div>
        <div
          v-if="driver"
          class="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700"
        >
          {{ driver.name || 'Driver' }}
        </div>
      </header>

      <dl class="grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
        <div>
          <dt class="font-semibold text-slate-700">Coordinates</dt>
          <dd v-if="hasCoordinates">
            {{ location.lat.toFixed(5) }}, {{ location.lng.toFixed(5) }}
          </dd>
          <dd v-else>—</dd>
        </div>
        <div v-if="speedLabel">
          <dt class="font-semibold text-slate-700">Speed</dt>
          <dd>{{ speedLabel }}</dd>
        </div>
        <div v-if="recordedLabel">
          <dt class="font-semibold text-slate-700">Updated</dt>
          <dd>{{ recordedLabel }}</dd>
        </div>
      </dl>

      <div class="flex flex-wrap gap-2">
        <a
          v-for="link in navigationLinks"
          :key="link.id"
          :href="link.href"
          target="_blank"
          rel="noopener"
          class="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          {{ link.label }}
          <span aria-hidden="true">↗</span>
        </a>
      </div>
    </div>
  </article>
</template>
